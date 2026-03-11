import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 22050
MASTER_GAIN = 0.86
RNG = random.Random(7)

ROOT = Path(__file__).resolve().parent
BGM_DIR = ROOT / "bgm"
EFFECTS_DIR = ROOT / "effects"


def midi_to_freq(note):
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def make_buffer(duration):
    return [0.0] * max(1, int(duration * SAMPLE_RATE))


def clamp(value, min_value=-1.0, max_value=1.0):
    return max(min_value, min(max_value, value))


def envelope(position, duration, attack=0.01, release=0.06):
    if duration <= 0:
        return 0.0
    if position < 0 or position > duration:
        return 0.0
    if attack > 0 and position < attack:
        return position / attack
    if release > 0 and position > duration - release:
        return max(0.0, (duration - position) / release)
    return 1.0


def osc_value(waveform, phase):
    if waveform == "sine":
        return math.sin(phase)
    if waveform == "square":
        return 1.0 if math.sin(phase) >= 0 else -1.0
    if waveform == "triangle":
        return (2.0 / math.pi) * math.asin(math.sin(phase))
    if waveform == "saw":
        cycle = phase / (2.0 * math.pi)
        return 2.0 * (cycle - math.floor(cycle + 0.5))
    return math.sin(phase)


def add_tone(buffer, start, duration, freq, amp, waveform="sine", freq_end=None, attack=0.004, release=0.05):
    start_index = max(0, int(start * SAMPLE_RATE))
    total = max(1, int(duration * SAMPLE_RATE))
    freq_end = freq if freq_end is None else freq_end
    for index in range(total):
        target = start_index + index
        if target >= len(buffer):
            break
        t = index / SAMPLE_RATE
        mix = index / total
        current_freq = freq + (freq_end - freq) * mix
        phase = 2.0 * math.pi * current_freq * t
        buffer[target] += osc_value(waveform, phase) * amp * envelope(t, duration, attack, release)


def add_layered_tone(buffer, start, duration, note, amp, wave_a="saw", wave_b="triangle"):
    freq = midi_to_freq(note)
    add_tone(buffer, start, duration, freq, amp * 0.7, wave_a, attack=0.004, release=min(0.08, duration * 0.45))
    add_tone(buffer, start, duration, freq * 0.5, amp * 0.18, "sine", attack=0.004, release=min(0.09, duration * 0.5))
    add_tone(buffer, start, duration, freq * 1.01, amp * 0.35, wave_b, attack=0.004, release=min(0.07, duration * 0.4))


def add_noise(buffer, start, duration, amp, attack=0.001, release=0.04, color="white"):
    start_index = max(0, int(start * SAMPLE_RATE))
    total = max(1, int(duration * SAMPLE_RATE))
    last = 0.0
    for index in range(total):
        target = start_index + index
        if target >= len(buffer):
            break
        t = index / SAMPLE_RATE
        sample = RNG.uniform(-1.0, 1.0)
        if color == "bright":
            sample = sample - last * 0.6
            last = sample
        elif color == "dark":
            sample = (sample + last * 3.0) * 0.25
            last = sample
        buffer[target] += sample * amp * envelope(t, duration, attack, release)


def add_kick(buffer, start, amp=0.72):
    add_tone(buffer, start, 0.18, 132, amp, "sine", freq_end=42, attack=0.001, release=0.14)
    add_tone(buffer, start, 0.09, 68, amp * 0.35, "triangle", freq_end=28, attack=0.001, release=0.08)


def add_snare(buffer, start, amp=0.28):
    add_noise(buffer, start, 0.14, amp, release=0.11, color="bright")
    add_tone(buffer, start, 0.08, 240, amp * 0.35, "triangle", freq_end=142, attack=0.001, release=0.06)


def add_hat(buffer, start, amp=0.12, duration=0.045):
    add_noise(buffer, start, duration, amp, release=duration * 0.9, color="bright")


def add_riser(buffer, start, duration, start_note, end_note, amp):
    add_tone(
        buffer,
        start,
        duration,
        midi_to_freq(start_note),
        amp,
        "triangle",
        freq_end=midi_to_freq(end_note),
        attack=0.01,
        release=min(0.12, duration * 0.4),
    )
    add_noise(buffer, start, duration, amp * 0.12, attack=0.01, release=min(0.18, duration * 0.45), color="bright")


def normalize(buffer, peak=0.95):
    max_amp = max((abs(sample) for sample in buffer), default=1.0)
    if max_amp <= 1e-9:
        return buffer
    scale = peak / max_amp
    return [sample * scale * MASTER_GAIN for sample in buffer]


def write_wav(path, buffer):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = normalize(buffer)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for sample in data:
            frames.extend(struct.pack("<h", int(clamp(sample) * 32767)))
        wav_file.writeframes(frames)


def make_bgm():
    bpm = 148
    beat = 60.0 / bpm
    bars = 16
    duration = bars * 4 * beat + 0.8
    buffer = make_buffer(duration)

    bass_pattern = [38, 38, 41, 43, 38, 38, 46, 45, 38, 38, 41, 43, 46, 45, 43, 41]
    lead_pattern = [69, 72, 74, 76, 74, 72, 69, 72, 74, 77, 79, 77, 74, 72, 71, 69]
    arp_pattern = [81, 84, 88, 84, 79, 83, 86, 83]

    for beat_index in range(bars * 4):
        beat_time = beat_index * beat
        if beat_index % 4 == 0:
            add_kick(buffer, beat_time, 0.78)
        if beat_index % 4 == 2:
            add_snare(buffer, beat_time, 0.26)
        add_hat(buffer, beat_time, 0.09 if beat_index % 2 == 0 else 0.07, 0.038)
        add_hat(buffer, beat_time + beat * 0.5, 0.055, 0.022)
        add_layered_tone(buffer, beat_time, beat * 0.72, bass_pattern[beat_index % len(bass_pattern)], 0.18, "square", "triangle")

    step = beat / 2.0
    total_steps = int(duration / step)
    for step_index in range(total_steps):
        start = step_index * step
        note = arp_pattern[step_index % len(arp_pattern)]
        add_tone(buffer, start, step * 0.42, midi_to_freq(note), 0.045, "triangle", attack=0.004, release=0.05)

    for bar in range(bars):
        base = bar * 4 * beat
        intensity = 0.12 if bar < 4 else 0.16 if bar < 12 else 0.2
        notes = [
            lead_pattern[(bar * 4) % len(lead_pattern)],
            lead_pattern[(bar * 4 + 1) % len(lead_pattern)],
            lead_pattern[(bar * 4 + 2) % len(lead_pattern)],
            lead_pattern[(bar * 4 + 3) % len(lead_pattern)],
        ]
        add_layered_tone(buffer, base + beat * 0.0, beat * 0.8, notes[0], intensity, "saw", "triangle")
        add_layered_tone(buffer, base + beat * 1.0, beat * 0.65, notes[1], intensity * 0.95, "saw", "triangle")
        add_layered_tone(buffer, base + beat * 2.0, beat * 0.8, notes[2], intensity * 1.02, "saw", "triangle")
        add_layered_tone(buffer, base + beat * 3.0, beat * 1.15, notes[3], intensity * 1.08, "saw", "triangle")
        if bar in (3, 7, 11, 15):
            add_riser(buffer, base + beat * 3.0, beat * 0.9, 60, 74, 0.08)

    write_wav(BGM_DIR / "tank_battle_bgm.wav", buffer)


def make_player_shot():
    buffer = make_buffer(0.22)
    add_noise(buffer, 0.0, 0.04, 0.11, color="bright")
    add_tone(buffer, 0.0, 0.11, 220, 0.26, "square", freq_end=120, attack=0.001, release=0.08)
    add_tone(buffer, 0.015, 0.14, 132, 0.15, "triangle", freq_end=72, attack=0.001, release=0.09)
    write_wav(EFFECTS_DIR / "player_shot.wav", buffer)


def make_enemy_shot():
    buffer = make_buffer(0.24)
    add_noise(buffer, 0.0, 0.05, 0.1, color="dark")
    add_tone(buffer, 0.0, 0.13, 170, 0.22, "square", freq_end=96, attack=0.001, release=0.09)
    add_tone(buffer, 0.02, 0.16, 104, 0.14, "triangle", freq_end=56, attack=0.001, release=0.1)
    write_wav(EFFECTS_DIR / "enemy_shot.wav", buffer)


def make_cannon_shot():
    buffer = make_buffer(0.62)
    add_noise(buffer, 0.0, 0.08, 0.14, color="dark")
    add_tone(buffer, 0.0, 0.28, 96, 0.34, "saw", freq_end=34, attack=0.001, release=0.18)
    add_tone(buffer, 0.03, 0.48, 56, 0.18, "triangle", freq_end=24, attack=0.001, release=0.28)
    add_tone(buffer, 0.0, 0.18, 180, 0.06, "square", freq_end=70, attack=0.001, release=0.1)
    write_wav(EFFECTS_DIR / "power_cannon_shot.wav", buffer)


def make_hit():
    buffer = make_buffer(0.28)
    add_noise(buffer, 0.0, 0.11, 0.16, color="bright")
    add_tone(buffer, 0.0, 0.12, 310, 0.14, "saw", freq_end=102, attack=0.001, release=0.08)
    add_tone(buffer, 0.015, 0.18, 140, 0.1, "triangle", freq_end=62, attack=0.001, release=0.12)
    write_wav(EFFECTS_DIR / "tank_hit.wav", buffer)


def make_shield_pickup():
    buffer = make_buffer(0.72)
    add_tone(buffer, 0.0, 0.2, midi_to_freq(57), 0.08, "sine", freq_end=midi_to_freq(64), attack=0.01, release=0.08)
    add_tone(buffer, 0.1, 0.28, midi_to_freq(64), 0.11, "triangle", freq_end=midi_to_freq(72), attack=0.01, release=0.12)
    add_tone(buffer, 0.22, 0.32, midi_to_freq(76), 0.09, "sine", attack=0.01, release=0.18)
    add_noise(buffer, 0.0, 0.34, 0.03, attack=0.02, release=0.18, color="bright")
    write_wav(EFFECTS_DIR / "shield_pickup.wav", buffer)


def make_heal_pickup():
    buffer = make_buffer(0.6)
    add_tone(buffer, 0.0, 0.12, midi_to_freq(76), 0.08, "triangle", attack=0.01, release=0.06)
    add_tone(buffer, 0.1, 0.14, midi_to_freq(81), 0.09, "triangle", attack=0.01, release=0.08)
    add_tone(buffer, 0.22, 0.18, midi_to_freq(84), 0.1, "triangle", attack=0.01, release=0.1)
    add_tone(buffer, 0.34, 0.24, midi_to_freq(88), 0.08, "sine", attack=0.01, release=0.14)
    write_wav(EFFECTS_DIR / "heal_pickup.wav", buffer)


def make_power_pickup():
    buffer = make_buffer(0.54)
    add_tone(buffer, 0.0, 0.14, midi_to_freq(45), 0.08, "square", freq_end=midi_to_freq(48), attack=0.01, release=0.06)
    add_tone(buffer, 0.1, 0.16, midi_to_freq(52), 0.1, "square", freq_end=midi_to_freq(57), attack=0.01, release=0.08)
    add_tone(buffer, 0.22, 0.22, midi_to_freq(59), 0.12, "saw", freq_end=midi_to_freq(67), attack=0.01, release=0.12)
    add_noise(buffer, 0.0, 0.16, 0.025, attack=0.01, release=0.1, color="bright")
    write_wav(EFFECTS_DIR / "power_pickup.wav", buffer)


def main():
    make_bgm()
    make_player_shot()
    make_enemy_shot()
    make_cannon_shot()
    make_hit()
    make_shield_pickup()
    make_heal_pickup()
    make_power_pickup()


if __name__ == "__main__":
    main()
