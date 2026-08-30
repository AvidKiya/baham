#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_music.py — composes an ORIGINAL romantic ambient track (numpy → WAV → MP3).
Dreamy night-drive ballad: warm pads, soft piano-ish arpeggio, sub bass,
sparkle echoes, gentle reverb. ~80s seamless-feel loop @ 72 BPM.
(The Billie/Eilish-style *mood* without any copyrighted audio.)
Run:  python3 scripts/make_music.py   (needs numpy; ffmpeg for mp3)
"""
import numpy as np
import wave
import subprocess
import os

SR = 44100
BPM = 72.0
BEAT = 60.0 / BPM              # 0.8333s
BAR = 4 * BEAT                 # 3.333s
BARS = 24
DUR = BAR * BARS               # 80s
N = int(SR * DUR)

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)

def t_axis(): return np.arange(N) / SR

def place(buf, sig, start_s):
    i = int(start_s * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i]

def env_ar(n, a, r, hold=None):
    t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-4), 1.0)
    rel_start = n / SR - r
    e = e * np.clip((n / SR - t) / max(r, 1e-4), 0, 1) if hold is None else e
    return e

# ---------------- chord progression (1 bar per chord) ----------------
# Amaj9 · F#m11 · Dmaj9 · E6/9  — dreamy, romantic, loops forever
PROG = [
    dict(bass=45, pad=[57, 61, 64, 71], arp=[57, 61, 64, 68, 71, 76]),
    dict(bass=42, pad=[54, 57, 61, 64], arp=[54, 57, 61, 64, 66, 69]),
    dict(bass=38, pad=[50, 54, 57, 61], arp=[50, 54, 57, 62, 66, 69]),
    dict(bass=40, pad=[52, 56, 59, 64], arp=[52, 56, 59, 64, 68, 71]),
]

def pad_tone(f, n, detune):
    t = np.arange(n) / SR
    ph1, ph2 = 2 * np.pi * f * (1 + detune) * t, 2 * np.pi * f * (1 - detune) * t
    l = np.sin(ph1) + 0.42 * np.sin(2 * ph1) + 0.14 * np.sin(3 * ph1)
    r = np.sin(ph2) + 0.42 * np.sin(2 * ph2) + 0.14 * np.sin(3 * ph2)
    # slow chorus movement
    lfo = 0.15 * np.sin(2 * np.pi * 0.13 * t)
    return l * (1 + lfo), r * (1 - lfo)

def pluck(f, n, bright=1.0):
    t = np.arange(n) / SR
    e = np.exp(-t * 4.2)
    body = np.sin(2 * np.pi * f * t) + 0.30 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9)
    body += 0.10 * np.sin(2 * np.pi * 4.02 * f * t) * np.exp(-t * 16) * bright
    return body * e

def sparkle_note(f, n):
    t = np.arange(n) / SR
    e = np.exp(-t * 1.9)
    return (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2.01 * f * t)) * e

L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)

# ---------------- pads (whole progression, overlapping releases) ----------------
L = np.zeros(N); R = np.zeros(N)
for bar in range(BARS):
    ch = PROG[bar % 4]
    n = int(BAR * 1.9 * SR)
    start = int(bar * BAR * SR)
    if start >= N: break
    n = min(n, N - start)
    t = np.arange(n) / SR
    e = np.minimum(t / 1.4, 1.0) * np.clip((n / SR - t) / 1.6, 0, 1)
    amp = 0.145 if bar < 2 else 0.185
    for note in ch["pad"]:
        f = midi(note)
        l, r = pad_tone(f, n, 0.0016)
        L[start : start + n] += l * e * amp
        R[start : start + n] += r * e * amp

# ---------------- sub bass (from bar 2) ----------------
for bar in range(2, BARS):
    ch = PROG[bar % 4]
    start = int(bar * BAR * SR)
    n = min(int(BAR * 1.05 * SR), N - start)
    t = np.arange(n) / SR
    e = np.minimum(t / 0.4, 1) * np.clip((n / SR - t) / 0.5, 0, 1)
    f = midi(ch["bass"])
    sig = (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)) * e * 0.22
    L[start : start + n] += sig
    R[start : start + n] += sig

# ---------------- arpeggio (8th notes, from bar 3) ----------------
pattern = [0, 2, 4, 3, 1, 3, 5, 2]      # up-down-ish, gentle
for bar in range(2, BARS):
    ch = PROG[bar % 4]
    for step in range(8):
        if bar >= 18 and step % 4 == 2:  # thin out near the end
            continue
        note = ch["arp"][pattern[step] % len(ch["arp"])]
        if bar % 2 == 1 and step in (3, 7):
            note += 12                    # little lift every other bar
        f = midi(note)
        dur = min(int(1.1 * BEAT * 3 * SR), N)
        vel = 0.16 * (0.75 + 0.25 * rng.random()) * (0.8 if bar < 4 else 1.0)
        start_s = bar * BAR + step * BEAT / 2
        sig = pluck(f, dur) * vel
        pan = 0.5 + 0.28 * np.sin(step * 1.3 + bar)  # gentle stereo wander
        place(L, sig * (1 - pan), start_s)
        place(R, sig * pan, start_s)

# ---------------- sparkles (bar starts, every 4 bars) ----------------
for bar in range(4, BARS - 2, 4):
    note = PROG[bar % 4]["arp"][-1] + 12
    f = midi(note)
    dur = int(2.8 * SR)
    sig = sparkle_note(f, dur) * 0.10
    start_s = bar * BAR + BEAT
    for tap, g in [(0, 1.0), (0.375, 0.55), (0.75, 0.32), (1.125, 0.18)]:
        place(L, sig * g * 0.8, start_s + tap)
        place(R, sig * g, start_s + tap + 0.011)  # haas widen

# ---------------- simple reverb (finite-tap delays) ----------------
def reverb(x):
    y = x.copy()
    for d, g in [(0.123, 0.30), (0.187, 0.24), (0.251, 0.20), (0.373, 0.15), (0.497, 0.10)]:
        shift = int(d * SR)
        for k in range(1, 4):
            gk = g ** k
            if gk < 0.02: break
            s = shift * k
            y[s:] += x[:-s] * gk if s < len(x) else 0
    return y

L = 0.72 * L + 0.38 * reverb(L)
R = 0.72 * R + 0.38 * reverb(R)

# ---------------- master ----------------
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.25) * 0.92
fade_in = int(2.0 * SR)
fade_out = int(3.2 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
peak = np.abs(mix).max()
mix = mix / peak * 0.91

wav_path = "/tmp/aurora-love.wav"
data = (mix * 32767).astype(np.int16)
with wave.open(wav_path, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())

os.makedirs("public/assets/music", exist_ok=True)
out = "public/assets/music/aurora-love.mp3"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
                "-codec:a", "libmp3lame", "-b:a", "128k", "-metadata",
                "title=Aurora Love (rol-invite original)", "-metadata", "artist=Avid Kiya",
                out], check=True)
print("wrote", out, f"{os.path.getsize(out)/1024:.0f} KB · {DUR:.0f}s")
