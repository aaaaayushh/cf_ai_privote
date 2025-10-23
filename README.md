# Privote

**Privacy-first AI meeting assistant with local transcription and self-hosted cloud summarization.**

Privote records meetings, transcribes audio locally using Whisper.cpp, and generates AI-powered summaries via your own Cloudflare Worker. Your audio never leaves your device, and you control all your data.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Audio Setup](#audio-setup)
- [Desktop App Setup](#desktop-app-setup)
  - [Whisper Model Configuration](#whisper-model-configuration)
  - [Advanced: Swapping Models](#advanced-swapping-whisper-models-optional)
- [Worker Deployment](#worker-deployment)
- [Usage](#usage)
- [API Key Authentication](#api-key-authentication)
- [License](#license)

## Features

### Local Transcription

- Record meeting audio or upload existing files (WAV, MP3, M4A, OGG, WebM)
- Whisper.cpp runs locally for speech-to-text processing
- All audio processing stays on your device
- Pre-built app includes base.en model (swap to tiny/small/medium if desired)

### AI-Powered Summarization

- Self-hosted Cloudflare Worker processes transcripts
- Llama 3.3 generates concise summaries and extracts action items
- Fast edge processing (5-15 seconds typical)
- Parallel AI processing for optimal performance

### Meeting Management

- View all meetings with summaries and action items
- Search and filter past meetings
- Export meetings as Markdown

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Cloudflare account** (free tier works)
- **macOS** (Windows and Linux coming soon)
- **Audio loopback device** for capturing meeting audio (see [Audio Setup](#audio-setup))

### 1. Clone Repository

```bash
git clone https://github.com/aaaaayushh/cf_ai_privote.git
cd cf_ai_privote
```

### 2. Set Up Desktop App

```bash
cd privote-desktop
npm install

# Start the app (development mode)
npm start
```

**Note:** The `lib/` and `models/` folders should already contain the necessary Whisper binaries and base.en model. If transcription doesn't work, see the [Desktop App Setup](#desktop-app-setup) section to configure Whisper.

### 3. Deploy Cloudflare Worker

```bash
cd ../privote-worker

# Login to Cloudflare
npx wrangler login

# Install dependencies
npm install

# Create database and initialize schema
npx wrangler d1 create privote-db
# Copy the database ID from output and update wrangler.jsonc

# Initialize database schema
npx wrangler d1 execute privote-db --file=./src/schema.sql

# Deploy to Cloudflare
npm run deploy
# Save the Worker URL from output!
```

### 4. Secure Your Worker (Recommended)

Protect your Worker with an API key:

```bash
# Generate a secure API key
openssl rand -hex 32
```

> **Save the API key!** You'll need it in the next step.

```bash
# Set it as a Cloudflare secret
npx wrangler secret put API_KEY
# Paste the generated key when prompted

# Redeploy with the secret
npm run deploy
```

### 5. Connect App to Worker

1. Open the desktop app
2. Go to **Settings** tab
3. Enter your Worker URL: `https://privote-worker.<your-subdomain>.workers.dev`
4. **Enter your API Key** (the one you generated in Step 4)
   . Click **Save Settings**

### 6. Set Up Audio Capture

Follow the [Audio Setup](#audio-setup) instructions to configure audio loopback for meeting capture.

### 7. Record Your First Meeting

1. Go to **Record** tab
2. Click **Start Recording** (or **Upload Audio**)
3. Speak for a few seconds
4. Click **Stop Recording**
5. Wait for local transcription
6. Review and upload to Worker
7. View AI-generated summary and action items!

**Note:** If you skipped Step 4 (API key setup), your Worker is publicly accessible. See [API Key Authentication](#api-key-authentication) to add authentication later.

## Audio Setup

### Audio Loopback Device

Privote requires an audio loopback device to capture audio from meeting applications (Google Meet, Zoom, Microsoft Teams, etc.). I recommend [BlackHole](https://github.com/ExistentialAudio/BlackHole) for macOS.

**Install BlackHole:**

1. Download from [GitHub releases](https://github.com/ExistentialAudio/BlackHole/releases)
2. Install the `.pkg` file
3. Restart your Mac

### Multi-Output Device Setup

Create a multi-output device to route meeting audio to both your speakers and BlackHole:

1. Open **Audio MIDI Setup** (Applications > Utilities)
2. Click the **+** button and select **Create Multi-Output Device**
3. Check both your speakers and **BlackHole 2ch**
4. Name it "Meeting Audio" (or similar)
5. Set this as your system output device

### Meeting Configuration

In your meeting application:

1. Set **Speaker** to "Meeting Audio" (your multi-output device)
2. In Privote, select **BlackHole 2ch** as the recording source

This setup captures all meeting audio while preserving your ability to hear participants through your speakers.

## Desktop App Setup

### Whisper Model Configuration

**For most users:** The cloned repository already includes:

- Whisper.cpp binaries (optimized for your platform)
- Base.en model (74 MB) - good accuracy, fast performance
- Ready to use immediately - no additional setup required

**Just run `npm start`!** Transcription works out of the box.

### Advanced: Swapping Whisper Models (Optional)

If you want to use a different Whisper model (for better accuracy or faster processing), follow these steps:

#### Steps to Swap Models

1. **Build Whisper.cpp** (if not already done):

```bash
cd privote-desktop

# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build for your platform
make  # Basic build
```

2. **Download your preferred model**:

```bash
# Still in whisper.cpp directory
cd models

# Download the model you want
bash download-ggml-model.sh small.en  # Or tiny.en, medium.en
```

3. **Copy model to Privote**:

```bash
# Create models directory if it doesn't exist
mkdir -p ../../models

# Copy your chosen model
cp ggml-small.en.bin ../../models/

# Go back to privote-desktop
cd ../..
```

4. **Copy updated binaries** (if you rebuilt with acceleration):

```bash
# macOS
cp whisper.cpp/*.dylib lib/
cp whisper.cpp/*.metal lib/

# Linux
cp whisper.cpp/*.so lib/

# Windows
cp whisper.cpp/*.dll lib/
```

5. **Update model path** in `src/whisper/whisper-client.js`:

```javascript
// Change this line:
this.modelPath = path.join(__dirname, "../../models/ggml-small.en.bin");
// Or keep base.en for the default
```

6. **Restart the app** and transcription will use your new model.

#### Model Storage Locations

- **Binaries**: `privote-desktop/lib/` (.dylib, .dll, or .so files)
- **Models**: `privote-desktop/models/` (.bin files)
- **Whisper source** (optional): `privote-desktop/whisper.cpp/`

## Worker Deployment

### Setup

```bash
cd privote-worker
npm install
```

### Database Configuration

1. **Create D1 database:**

```bash
npx wrangler d1 create privote-db
```

2. **Update `wrangler.jsonc`** with the database ID from the output:

```jsonc
[[d1_databases]]
binding = "DB"
database_name = "privote-db"
database_id = "your-database-id-here"  // Update this
```

3. **Initialize schema:**

```bash
npxwrangler d1 execute privote-db --file=./src/schema.sql
```

### Local Development

```bash
npm run dev
```

Test endpoints:

```bash
# Health check
curl http://localhost:8787/health

# Upload transcript
curl -X POST http://localhost:8787/api/transcripts \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Test meeting. John will prepare the report by Friday.",
    "title": "Test Meeting"
  }'

# List meetings
curl http://localhost:8787/api/meetings
```

### Production Deployment

```bash
npm run deploy
```

**Save the Worker URL!** You'll need it for the desktop app:

```
https://privote-worker.<your-subdomain>.workers.dev
```

### Secure Your Deployment (Recommended)

**Note:** API key authentication is recommended for production use. If you haven't already set this up, follow the instructions in [API Key Authentication](#api-key-authentication).

### Verify Deployment

```bash
# Check health
curl https://your-worker-url/health

# Test with API key (if configured)
curl https://your-worker-url/api/meetings \
  -H "X-API-Key: your-api-key-here"

# List deployments
npx wrangler deployments list

# View logs
npx wrangler tail
```

## Usage

### Settings

Configure in **Settings** tab:

- **Worker URL**: Your deployed Cloudflare Worker
- **API Key**: Optional authentication (see [API Key Authentication](#api-key-authentication))
- **Auto Upload**: Automatically upload after transcription
- **Keep Local Copies**: Save recordings on device

### API Key Authentication

Protect your Worker with API key authentication.

**If you followed the Quick Start guide:** You already set this up in Step 4.

**To set up API key authentication manually:**

1. **Generate API key:**

```bash
openssl rand -hex 32
```

2. **Set as Cloudflare secret:**

```bash
cd privote-worker
npx wrangler secret put API_KEY
# Paste your key when prompted
```

3. **Deploy Worker:**

```bash
npm run deploy
```

4. **Configure desktop app:**
   - Open Settings
   - Enter the same API key
   - Save settings

**How it works:**

- The worker checks for the `X-API-Key` header on all `/api/*` requests
- If `API_KEY` secret is set but header is missing/wrong, returns 401 Unauthorized
- If `API_KEY` secret is not set, authentication is disabled (development mode)

### Additional Security Measures

#### Rate Limiting

Enable in Cloudflare Dashboard:

1. Workers & Pages > Your Worker > Settings
2. Add rate limiting rule: 100 requests/10 min per IP

#### IP Allowlisting

In Cloudflare Dashboard, add WAF rules to block unauthorized IPs.

## License

MIT License © 2025

**Built with privacy in mind. Your data stays yours.**
