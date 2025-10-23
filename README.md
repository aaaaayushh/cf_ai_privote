# Privote

**Privacy-first AI meeting assistant with local transcription and self-hosted cloud summarization.**

Privote records meetings, transcribes audio locally using Whisper.cpp, and generates AI-powered summaries via your own Cloudflare Worker. Your audio never leaves your device, and you control all your data.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Desktop App Setup](#desktop-app-setup)
  - [Whisper Model Configuration](#whisper-model-configuration)
  - [Advanced: Swapping Models](#advanced-swapping-whisper-models-optional)
- [Worker Deployment](#worker-deployment)
- [Usage](#usage)
- [API Key Authentication](#api-key-authentication)
- [License](#license)

## Features

### Local Transcription

- Record meeting audio or upload existing files (only .wav files are supported)
- Whisper.cpp runs locally for speech-to-text processing
- All audio processing stays on your device
- **Easy model switching** - choose from Tiny, Base, Small, Medium, or Large models
- **One-click model downloads** directly from the app settings
- Pre-built app includes Base and Tiny models ready to use

### AI-Powered Summarization

- Self-hosted Cloudflare Worker processes transcripts
- Llama 3.3 generates concise summaries and extracts action items

### Meeting Management

- View all meetings with summaries and action items
- Search and filter past meetings
- Export meetings as Markdown

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Cloudflare account** (free tier works)
- **macOS** (Windows and Linux coming soon)

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

#### Whisper Model Management

The app runs Whisper.cpp locally. You will need to download a model before you can start recording.

**Use the built-in model manager**

1. Open the app and go to **Settings** → **Whisper Model**
2. Select your preferred model from the dropdown
3. Click **Download Model** to get additional models (Small, Medium, Large)
4. The app automatically detects available models and shows their status

### 3. Deploy Cloudflare Worker

```bash
cd ../privote-worker

# Login to Cloudflare
npx wrangler login

# Install dependencies
npm install

# Create database and initialize schema
npx wrangler d1 create privote-db
# the cli output will ask you if you want to add the database config to wrangler.jsonc, say yes.

# Initialize database schema
npx wrangler d1 execute privote-db --remote --file=./src/schema.sql

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
# Set the name of the secret only (do NOT include your API key on the command line!)
npx wrangler secret put PRIVATE_API_KEY
# When prompted, paste your API key (the long hex string you generated above) and press Enter

# Redeploy with the secret
npm run deploy
```

### 5. Connect App to Worker

1. Open the desktop app
2. Go to **Settings** tab
3. Enter your Worker URL: `https://privote-worker.<your-subdomain>.workers.dev`
4. **Enter your API Key** (the one you generated in Step 4)
   . Click **Save Settings**

### 6. Record Your First Meeting

1. Go to **Record** tab
2. **Check the model indicator** - shows which Whisper model will be used
3. Click **Start Recording** (or **Upload Audio**)
4. Speak for a few seconds
5. Click **Stop Recording**
6. Wait for local transcription using your selected model
7. Review and upload to Worker
8. View AI-generated summary and action items!

**Pro tip:** Switch between models in Settings to find the best balance of speed vs. accuracy for your needs!

**Note:** If you skipped Step 4 (API key setup), your Worker is publicly accessible. See [API Key Authentication](#api-key-authentication) to add authentication later.

## Desktop App Setup

### Whisper Model Configuration

**For most users:** The cloned repository already includes:

- Whisper.cpp binaries
- **Built-in model manager** for easy switching and downloading
- Ready to use immediately after downloading a whisper model

**Just run `npm start`!** Transcription works out of the box.

#### Model Management Features

- **Visual model selector** in Settings → Whisper Model
- **One-click downloads** for additional models

#### Model Storage Locations

- **Binaries**: `privote-desktop/lib/` (.dylib, .dll, or .so files)
- **Models**: `privote-desktop/models/` (.bin files)

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
# The CLI output will ask if you want to add the database config to wrangler.jsonc. Say yes, unless you want to add it manually.
```

2. **(Optional)** If you did **not** add the config automatically, update `wrangler.jsonc` manually with your database ID from the output:

```jsonc
{
  // ... existing config
  "d1_databases": [
    {
      "binding": "privote_db",
      "database_name": "privote-db",
      "database_id": "your-database-id-here"
    }
  ]
  // ... existing config
}
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

## Usage

### Settings

Configure in **Settings** tab:

- **Worker URL**: Your deployed Cloudflare Worker
- **API Key**: Optional authentication (see [API Key Authentication](#api-key-authentication))
- **Whisper Model**: Select and download Whisper models for transcription
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
