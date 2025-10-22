# Whisper.cpp Setup Guide

This guide will help you set up native whisper.cpp for real audio transcription in Privote Desktop.

## Quick Setup (5-10 minutes)

### Step 1: Clone and Build Whisper.cpp

```bash
# Navigate to the privote-desktop directory
cd /Users/aayush/cf_ai_privote/privote-desktop

# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git

# Build it
cd whisper.cpp
make

# Test that it works
./main --help
```

### Step 2: Download a Model

You've already placed a model in the `models` folder, but if you need to download others:

```bash
# Still in the whisper.cpp directory
cd models

# Download base.en model (recommended, 74MB)
bash download-ggml-model.sh base.en

# Or download other models:
# bash download-ggml-model.sh tiny.en    # 75MB, faster but less accurate
# bash download-ggml-model.sh small.en   # 466MB, more accurate
# bash download-ggml-model.sh medium.en  # 1.5GB, best accuracy

# Copy the model to Privote's models folder
cp ggml-base.en.bin ../models/
```

### Step 3: Verify Setup

The app will now automatically find the whisper.cpp executable at:

- `privote-desktop/whisper.cpp/build/bin/whisper-cli`

You can verify the setup:

```bash
cd /Users/aayush/cf_ai_privote/privote-desktop

# Check that the executable exists
ls -la whisper.cpp/build/bin/whisper-cli

# Check that the model exists
ls -la models/*.bin
```

### Step 4: Test It!

```bash
# Run the app
npm run dev

# Try recording or uploading an audio file
# You should see real transcription instead of placeholder text
```

## Alternative Setup Methods

### Option 1: Set Environment Variable

If you've built whisper.cpp elsewhere on your system:

```bash
# Add to your ~/.zshrc or ~/.bashrc
export WHISPER_CPP_PATH="/path/to/your/whisper.cpp/build/bin/whisper-cli"

# Then restart your terminal and run the app
```

### Option 2: Modify the Code

Edit `src/main.js` to specify a custom path:

```javascript
const WhisperClient = require("./whisper/whisper-client");
const whisperClient = new WhisperClient({
  whisperPath: "/absolute/path/to/whisper.cpp/build/bin/whisper-cli",
  modelPath: path.join(__dirname, "../models/ggml-base.en.bin"),
  threads: 8, // Adjust based on your CPU
});
```

## Checking Status

The app will log whisper status to the console:

```
[Whisper] Transcribing: /path/to/audio.wav
[Whisper] Model: /path/to/models/ggml-base.en.bin
[Whisper] Executable: /path/to/whisper.cpp/main
[Whisper] Running: /path/to/whisper.cpp/main -m ...
[Whisper] Transcription completed in 3.42s (1234 chars)
```

If whisper.cpp is not found, you'll see:

```
[Whisper] Executable not found at /path/to/whisper.cpp/main. Using placeholder.
[Whisper] To enable real transcription, build whisper.cpp and set WHISPER_CPP_PATH
```

## Performance Tuning

### Adjust CPU Threads

By default, the app uses 4 threads. Adjust in `src/whisper/whisper-client.js`:

```javascript
this.threads = options.threads || 8; // Use 8 threads
```

Or pass it during initialization in `src/main.js`:

```javascript
const whisperClient = new WhisperClient({
  threads: 8,
});
```

### Enable Hardware Acceleration (macOS)

For faster transcription on Apple Silicon Macs, build with CoreML support:

```bash
cd whisper.cpp

# Build with CoreML
make clean
WHISPER_COREML=1 make

# Convert model to CoreML format
./models/generate-coreml-model.sh base.en

# The app will automatically use the CoreML model if available
```

### Enable GPU Acceleration (NVIDIA)

For Linux/Windows with NVIDIA GPUs:

```bash
cd whisper.cpp

# Build with CUDA
make clean
WHISPER_CUDA=1 make
```

## Troubleshooting

### "Whisper model not found"

- Ensure your model file is in `privote-desktop/models/`
- Check that the filename matches: `ggml-base.en.bin`
- Download from: https://huggingface.co/ggerganov/whisper.cpp/tree/main

### "Whisper executable not found"

- Check that `whisper.cpp/build/bin/whisper-cli` exists and is executable:
  ```bash
  ls -la whisper.cpp/build/bin/whisper-cli
  chmod +x whisper.cpp/build/bin/whisper-cli
  ```
- Or set the `WHISPER_CPP_PATH` environment variable

### "Whisper process exited with code 1"

- Check that your audio file format is supported (WAV, MP3, etc.)
- Try converting to WAV: `ffmpeg -i input.mp3 output.wav`
- Check whisper.cpp logs in the Electron console

### Slow Transcription

- Reduce model size (use `tiny.en` or `small.en`)
- Increase thread count
- Enable hardware acceleration (CoreML, CUDA)
- Use shorter audio clips for testing
