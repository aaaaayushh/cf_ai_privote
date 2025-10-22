#!/usr/bin/env node

/**
 * Whisper.cpp Setup Verification Script
 *
 * Run this script to verify your whisper.cpp setup:
 *   node scripts/verify-whisper.js
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Verifying Whisper.cpp Setup...\n");

// Check for whisper.cpp executable
const possiblePaths = [
  path.join(__dirname, "../whisper.cpp/build/bin/whisper-cli"),
  path.join(__dirname, "../whisper.cpp/main"), // Legacy path
  process.env.WHISPER_CPP_PATH,
  "/usr/local/bin/whisper",
];

let executablePath = null;
let executableExists = false;

console.log("Checking for whisper.cpp executable:");
for (const p of possiblePaths) {
  if (!p) continue;
  const exists = fs.existsSync(p);
  const status = exists ? "✅" : "❌";
  console.log(`  ${status} ${p}`);
  if (exists && !executablePath) {
    executablePath = p;
    executableExists = true;
  }
}

if (!executableExists) {
  console.log("\n❌ Whisper.cpp executable not found!");
  console.log("\nTo fix this:");
  console.log(
    "1. Clone whisper.cpp: git clone https://github.com/ggerganov/whisper.cpp.git"
  );
  console.log("2. Build it: cd whisper.cpp && make");
  console.log("3. Or set WHISPER_CPP_PATH environment variable");
  console.log("\nSee WHISPER_SETUP.md for detailed instructions.");
} else {
  console.log(`\n✅ Found executable at: ${executablePath}`);
}

// Check for models
console.log("\nChecking for Whisper models:");
const modelsDir = path.join(__dirname, "../models");
const modelFiles = [
  "ggml-tiny.en.bin",
  "ggml-base.en.bin",
  "ggml-small.en.bin",
  "ggml-medium.en.bin",
];

let modelFound = false;
if (fs.existsSync(modelsDir)) {
  const files = fs.readdirSync(modelsDir);
  const binFiles = files.filter((f) => f.endsWith(".bin"));

  if (binFiles.length === 0) {
    console.log("  ❌ No model files found in models/ directory");
  } else {
    binFiles.forEach((file) => {
      const size = fs.statSync(path.join(modelsDir, file)).size;
      const sizeMB = (size / 1024 / 1024).toFixed(2);
      console.log(`  ✅ ${file} (${sizeMB} MB)`);
      modelFound = true;
    });
  }
} else {
  console.log("  ❌ models/ directory not found");
}

if (!modelFound) {
  console.log("\n❌ No Whisper models found!");
  console.log("\nTo fix this:");
  console.log(
    "1. Download a model from: https://huggingface.co/ggerganov/whisper.cpp/tree/main"
  );
  console.log("2. Place it in the models/ directory");
  console.log(
    "3. Or use: cd whisper.cpp/models && bash download-ggml-model.sh base.en"
  );
}

// Summary
console.log("\n" + "=".repeat(60));
if (executableExists && modelFound) {
  console.log("✅ Setup Complete! You're ready to use real transcription.");
  console.log("\nRun 'npm run dev' to start the app and test it out!");
} else {
  console.log("❌ Setup Incomplete. Please follow the steps above.");
  console.log("\nFor detailed instructions, see WHISPER_SETUP.md");
}
console.log("=".repeat(60));
