#!/usr/bin/env python3
import argparse
import math
import struct
import subprocess
import wave
from pathlib import Path


def generate_tone_wav(text: str, output_path: str):
    duration = max(1.2, min(8.0, len(text) * 0.05))
    sample_rate = 22050
    freq = 220
    total = int(sample_rate * duration)
    with wave.open(output_path, 'w') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for n in range(total):
            env = 0.35 * (1 - (n / total) * 0.3)
            val = int(32767 * env * math.sin(2 * math.pi * freq * n / sample_rate))
            wav.writeframes(struct.pack('<h', val))


def synthesize(text: str, output_path: str, voice: str = 'en'):
    try:
        from TTS.api import TTS  # type: ignore
        tts = TTS(model_name='tts_models/en/ljspeech/tacotron2-DDC', progress_bar=False)
        tts.tts_to_file(text=text, file_path=output_path)
        return 'coqui'
    except Exception:
        pass

    try:
        subprocess.run(['espeak', '-v', voice, '-w', output_path, text], check=True)
        return 'espeak'
    except Exception:
        generate_tone_wav(text, output_path)
        return 'tone-fallback'


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--text', required=True)
    parser.add_argument('--voice', default='en')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    engine = synthesize(args.text, args.output, args.voice)
    print(engine)
