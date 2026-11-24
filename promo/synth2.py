# Softer, tuned sound kit for the promo: kalimba-style ticks in D major pentatonic, airy swells, low thock, soft click, pad.
import numpy as np, sys, os, wave
from scipy.signal import butter, sosfilt
SR = 48000
def save(name, x, folder, gain=0.9):
    x = x / (np.abs(x).max() + 1e-9) * gain; s = np.stack([x, np.roll(x, 14)], 1); w = wave.open(os.path.join(folder, name + '.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((s * 32767).astype(np.int16).tobytes()); w.close()
def band(x, lo, hi): return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f / (SR / 2), 'low', output='sos'), x)
def kalimba(f, dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k, (m, a, d) in enumerate([(1, 1, .55), (3.9, .28, .12), (9.1, .08, .04)]): x += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / d) * np.minimum(t / 0.002, 1)
    return lp(x, 7000)
def swell(dur, lo, hi, seed, peak=0.45):
    n = int(dur * SR); rng = np.random.default_rng(seed); x = rng.standard_normal(n); out = np.zeros(n); seg = 512; env = np.exp(-((np.arange(n) / n - peak) ** 2) / (2 * 0.17 ** 2))
    for i in range(0, n - seg, seg): u = i / n; f = lo * (hi / lo) ** u; out[i:i + seg * 2] += band(x[i:i + seg * 2], f * .7, f * 1.35) * np.hanning(min(seg * 2, n - i))
    return lp(out * env, 5000)
def main(folder):
    os.makedirs(folder, exist_ok=True); D = {'D5': 587.33, 'E5': 659.25, 'F5': 739.99, 'A5': 880, 'B5': 987.77, 'D6': 1174.66, 'E6': 1318.5, 'F6': 1480, 'A6': 1760, 'B6': 1975.5}
    for k, f in D.items(): save('kal_' + k, kalimba(f), folder)
    n = int(0.2 * SR); t = np.arange(n) / SR; save('thock', lp(np.sin(2 * np.pi * np.cumsum(np.linspace(150, 62, n)) / SR) * np.exp(-t / 0.05) * np.minimum(t / .003, 1), 900), folder)
    rng = np.random.default_rng(3); n = int(0.06 * SR); t = np.arange(n) / SR; save('click', band(rng.standard_normal(n), 2200, 7000) * np.exp(-t / .006) * .6 + np.sin(2 * np.pi * 1900 * t) * np.exp(-t / .012) * .4, folder)
    save('swell_long', swell(1.4, 350, 2600, 1), folder); save('swell_short', swell(0.7, 500, 2800, 2), folder)
    n = int(0.45 * SR); t = np.arange(n) / SR; b = np.sin(2 * np.pi * 659.25 * t) * np.exp(-t / .12) * np.minimum(t / .004, 1); b2 = np.zeros(n); s0 = int(0.11 * SR); b2[s0:] = (np.sin(2 * np.pi * 880 * t[:n - s0]) * np.exp(-t[:n - s0] / .14) * np.minimum(t[:n - s0] / .004, 1)); save('blip_up', lp(b + b2, 6000), folder)
    n = int(8 * SR); t = np.arange(n) / SR; pad = sum(np.sin(2 * np.pi * f * t + p) * a for f, a, p in [(73.4, .5, 0), (146.8, .5, 1), (220, .35, 2), (293.7, .22, 3), (369.99, .12, 4), (147.3, .3, 5), (220.6, .2, 6)])
    save('pad', pad * (1 + .08 * np.sin(2 * np.pi * .25 * t)), folder, .8)
    n = int(6 * SR); air = lp(band(np.random.default_rng(9).standard_normal(n), 600, 6000), 4500); save('air', air, folder, .8)
    print('wrote', folder)
main(sys.argv[1])
