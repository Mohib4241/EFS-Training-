#!/usr/bin/env python3
"""Records the Guide's voice. Run from the repository root:

  python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
  curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
  curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  .venv/bin/python scripts/make-guide-audio.py <folder holding the two model files>

It reads every line from scripts/guide-clip-sources.mjs and writes src/assets/audio/<key>.mp3 (skipping lines already
recorded). Delete a file to record it again. Needs ffmpeg. English: a British voice; Hinglish: a Hindi voice.
"""
import json, subprocess, sys, tempfile, os
import soundfile as sf
from kokoro_onnx import Kokoro

models = sys.argv[1] if len(sys.argv) > 1 else '.'
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'audio')
os.makedirs(out, exist_ok=True)
kokoro = Kokoro(os.path.join(models, 'kokoro-v1.0.int8.onnx'), os.path.join(models, 'voices-v1.0.bin'))
voices = {'english': ('bf_emma', 'en-gb', 0.95), 'hinglish': ('hf_alpha', 'hi', 0.92)}
clips = json.loads(subprocess.check_output(['node', os.path.join(os.path.dirname(__file__), 'guide-clip-sources.mjs')]))
for clip in clips:
    target = os.path.join(out, clip['key'] + '.mp3')
    if os.path.exists(target):
        continue
    voice, lang, speed = voices[clip['language']]
    samples, rate = kokoro.create(clip['text'], voice=voice, speed=speed, lang=lang)
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        sf.write(wav.name, samples, rate)
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', wav.name, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '40k', target])
    print(clip['key'], round(len(samples) / rate, 1), 's', clip['text'][:50])
