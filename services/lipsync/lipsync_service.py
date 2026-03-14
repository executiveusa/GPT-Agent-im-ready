#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import wave
from pathlib import Path

MOUTH_MAP = {
    'A': 'mouthOpen',
    'E': 'mouthWide',
    'I': 'mouthWide',
    'O': 'mouthRound',
    'U': 'mouthRound',
}


def rhubarb_generate(audio_file: str, output_file: str):
    exe = shutil.which('rhubarb') or shutil.which('rhubarb-lip-sync')
    if not exe:
        return False
    subprocess.run([exe, '-f', 'json', '-o', output_file, audio_file], check=True)
    return True


def fallback_generate(text: str, audio_file: str, output_file: str):
    with wave.open(audio_file, 'rb') as wav_file:
        duration = wav_file.getnframes() / float(wav_file.getframerate())
    chars = [c for c in text.upper() if c.isalpha()]
    if not chars:
        chars = ['A']
    step = max(duration / len(chars), 0.08)
    timeline = []
    t = 0.0
    for ch in chars:
        mouth = MOUTH_MAP.get(ch, 'mouthOpen')
        timeline.append({'time': round(t, 3), 'mouth': mouth})
        t += step
    Path(output_file).write_text(json.dumps(timeline, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio', required=True)
    parser.add_argument('--text', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    ok = False
    try:
        ok = rhubarb_generate(args.audio, args.output)
    except Exception:
        ok = False
    if not ok:
        fallback_generate(args.text, args.audio, args.output)
    print(args.output)
