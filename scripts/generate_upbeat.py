#!/usr/bin/env -S /home/ubuntu/manim-env/bin/python
"""Generate upbeat background music for educational videos using pure Python."""
import subprocess, os, sys, math, array, wave

SAMPLE_RATE = 44100

def load_wav(path):
    if not os.path.exists(path):
        return array.array('h', [0])
    with wave.open(path, 'rb') as w:
        frames = w.readframes(w.getnframes())
        return array.array('h', frames)

def generate_upbeat(output_path, duration_sec):
    bpm = 128
    beat_sec = 60.0 / bpm
    total_samples = int(SAMPLE_RATE * duration_sec)
    result = array.array('h', [0]) * total_samples
    
    tmp = "/tmp/upbeat_samples"
    os.makedirs(tmp, exist_ok=True)
    
    # Generate drum samples via ffmpeg (fast)
    def gen_ffmpeg(name, expr, dur, extra_af=""):
        path = f"{tmp}/{name}.wav"
        filt = f"volume=1.0,afade=t=in:d=0.001,afade=t=out:st={dur-0.03}:d=0.03"
        if extra_af:
            filt = f"{extra_af},{filt}"
        subprocess.run([
            'ffmpeg', '-y', '-f', 'lavfi', '-i', f"aevalsrc=s={SAMPLE_RATE}:c=mono:e={expr}:d={dur}",
            '-af', filt, path
        ], capture_output=True)
        return load_wav(path)
    
    # Kick drum
    kick = gen_ffmpeg("kick",
        "sin(2*PI*60*t)*exp(-t*60)+sin(2*PI*120*t)*exp(-t*80)*0.6+sin(2*PI*240*t)*exp(-t*100)*0.3",
        0.18)
    
    # Snare/clap
    snare_path = f"{tmp}/snare.wav"
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i',
        f"anoisesrc=d=0.1:c=white:a=0.8:s={SAMPLE_RATE}",
        '-af', "afade=t=in:d=0.001,afade=t=out:st=0.07:d=0.03,"
               "equalizer=f=200:t=q:w=1:g=-15,equalizer=f=1800:t=q:w=1:g=+8",
        snare_path
    ], capture_output=True)
    snare = load_wav(snare_path)
    
    # Hi-hat
    hat_path = f"{tmp}/hat.wav"
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i',
        f"anoisesrc=d=0.04:c=pink:a=0.5:s={SAMPLE_RATE}",
        '-af', "highpass=f=6000,lowpass=f=12000,volume=0.3",
        hat_path
    ], capture_output=True)
    hat = load_wav(hat_path)
    
    # Generate chord patterns programmatically
    def make_chord(freqs, dur, vol=0.10):
        n = int(SAMPLE_RATE * dur)
        samples = array.array('h', [0]) * n
        for i in range(n):
            t = i / SAMPLE_RATE
            env = min(1.0, t / 0.02) * max(0, 1.0 - max(0, t - dur + 0.15) / 0.15)
            val = 0.0
            for f in freqs:
                val += math.sin(2 * math.pi * f * t)
                val += math.sin(2 * math.pi * f * 1.5 * t) * 0.2  # 5th harmonic
            val = val / len(freqs) * vol * env * 32767
            samples[i] = int(max(-32768, min(32767, val)))
        return samples
    
    # Chord progression (2 beats per chord, 8 chords = 2 bars loop)
    chord_c = make_chord([261.63, 329.63, 392, 523.25], beat_sec * 2, 0.10)
    chord_f = make_chord([174.61, 220, 261.63, 349.23], beat_sec * 2, 0.09)
    chord_g = make_chord([196, 246.94, 293.66, 392], beat_sec * 2, 0.09)
    
    chords_2bar = [chord_c, chord_c, chord_f, chord_f,
                   chord_c, chord_c, chord_g, chord_g]
    
    # Bass notes per beat (same 2-bar cycle)
    def make_bass(freq, dur, vol=0.3):
        n = int(SAMPLE_RATE * dur)
        samples = array.array('h', [0]) * n
        for i in range(n):
            t = i / SAMPLE_RATE
            env = min(1.0, t / 0.01) * max(0, 1.0 - max(0, t - dur + 0.05) / 0.05)
            val = (math.sin(2 * math.pi * freq * t) * 0.7 +
                   math.sin(2 * math.pi * freq * 2 * t) * 0.3) * vol * env * 32767
            samples[i] = int(max(-32768, min(32767, val)))
        return samples
    
    bass_c = make_bass(130.81, beat_sec)
    bass_f = make_bass(174.61, beat_sec)
    bass_g = make_bass(98.0, beat_sec)
    bass_notes = [bass_c, bass_c, bass_f, bass_f,
                  bass_c, bass_c, bass_g, bass_g]
    
    total_beats = int(duration_sec / beat_sec)
    
    for beat in range(total_beats):
        beat_start = int(beat * beat_sec * SAMPLE_RATE)
        prog_idx = beat % 8
        
        # Kick every other beat (on 0,2,4,6 of 8)
        if beat % 2 == 0:
            for i in range(min(len(kick), total_samples - beat_start)):
                result[beat_start + i] = min(32767, max(-32768,
                    result[beat_start + i] + kick[i]))
        
        # Snare on beats 1,3,5,7
        if beat % 8 in [1, 3, 5, 7]:
            for i in range(min(len(snare), total_samples - beat_start)):
                result[beat_start + i] = min(32767, max(-32768,
                    result[beat_start + i] + snare[i]))
        
        # Hi-hat every 8th note (half beat)
        for sub in [0, 1]:
            hs = beat_start + int(sub * beat_sec * 0.5 * SAMPLE_RATE)
            for i in range(min(len(hat), total_samples - hs)):
                result[hs + i] = min(32767, max(-32768, result[hs + i] + hat[i]))
        
        # Bass on every beat
        bass = bass_notes[prog_idx]
        for i in range(min(len(bass), total_samples - beat_start)):
            result[beat_start + i] = min(32767, max(-32768,
                result[beat_start + i] + bass[i]))
        
        # Chords every 2 beats
        if beat % 2 == 0:
            chord = chords_2bar[prog_idx]
            for i in range(min(len(chord), total_samples - beat_start)):
                result[beat_start + i] = min(32767, max(-32768,
                    result[beat_start + i] + chord[i]))
    
    # Normalize
    max_val = max(abs(max(result)), abs(min(result)), 1)
    if max_val > 20000:
        scale = 20000.0 / max_val
        result = array.array('h', [int(v * scale) for v in result])
    
    # Write WAV
    wav_path = output_path.replace('.mp3', '.wav')
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(result.tobytes())
    
    # Convert to MP3
    subprocess.run([
        'ffmpeg', '-y', '-i', wav_path,
        '-codec:a', 'libmp3lame', '-b:a', '128k', output_path
    ], capture_output=True)
    
    mp3_size = os.path.getsize(output_path)
    return mp3_size

if __name__ == '__main__':
    output = sys.argv[1] if len(sys.argv) > 1 else "/home/ubuntu/tutorial-manim/assets/bgm_upbeat.mp3"
    duration = float(sys.argv[2]) if len(sys.argv) > 2 else 78.0
    sz = generate_upbeat(output, duration)
    print(f"Done: {output} ({sz/1024:.0f} KB, {duration}s)")
