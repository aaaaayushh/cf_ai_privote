/**
 * Whisper.cpp Client
 *
 * This module handles the integration with Whisper.cpp for local audio transcription.
 *
 * Integration Options:
 * 1. whisper.cpp WASM (Browser-based) - Runs in renderer process
 * 2. whisper.cpp Native (C++ addon) - Runs in main process
 * 3. whisper.cpp CLI (Command-line) - Shell execution from main process
 *
 * Currently using placeholder - implement based on your chosen approach.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { app } = require("electron");

class WhisperClient {
  constructor(options = {}) {
    const isDev = !app.isPackaged;

    // In production, extraResources are in process.resourcesPath
    // In development, they're relative to the project root
    const resourcesPath = isDev
      ? path.join(__dirname, "../..")
      : process.resourcesPath;

    this.modelPath =
      options.modelPath ||
      path.join(resourcesPath, "models", "ggml-base.en.bin");

    // Default to looking for whisper.cpp executable in common locations
    this.whisperPath =
      options.whisperPath ||
      process.env.WHISPER_CPP_PATH ||
      path.join(resourcesPath, "whisper-cli");

    this.language = options.language || "en";
    this.threads = options.threads || 4; // CPU threads to use

    // Log paths for debugging
    console.log("[Whisper] Initialized with:");
    console.log(`  - isDev: ${isDev}`);
    console.log(`  - resourcesPath: ${resourcesPath}`);
    console.log(`  - modelPath: ${this.modelPath}`);
    console.log(`  - whisperPath: ${this.whisperPath}`);
  }

  /**
   * Transcribe audio file using Whisper.cpp
   * @param {string} audioFilePath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribe(audioFilePath, options = {}) {
    try {
      // Check if audio file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Check if model exists
      if (!fs.existsSync(this.modelPath)) {
        throw new Error(
          `Whisper model not found at ${this.modelPath}. Please download a model first.\n` +
            `Download from: https://huggingface.co/ggerganov/whisper.cpp/tree/main`
        );
      }

      // Check if whisper executable exists
      if (!fs.existsSync(this.whisperPath)) {
        console.warn(
          `[Whisper] Executable not found at ${this.whisperPath}. Using placeholder.`
        );
        console.warn(
          `[Whisper] To enable real transcription, build whisper.cpp and set WHISPER_CPP_PATH`
        );
        return {
          success: true,
          transcript: this._generatePlaceholderTranscript(),
          language: this.language,
          duration: 0,
          segments: [],
        };
      }

      console.log(`[Whisper] Transcribing: ${audioFilePath}`);
      console.log(`[Whisper] Model: ${this.modelPath}`);
      console.log(`[Whisper] Executable: ${this.whisperPath}`);

      // Use whisper.cpp CLI for transcription
      return await this._transcribeWithCLI(audioFilePath, options);
    } catch (error) {
      console.error("[Whisper] Transcription error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transcribe using whisper.cpp command-line interface
   * @private
   */
  async _transcribeWithCLI(audioFilePath, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Build command arguments
      const args = [
        "-m",
        this.modelPath,
        "-f",
        audioFilePath,
        "-l",
        options.language || this.language,
        "-t",
        String(options.threads || this.threads),
        "--output-txt", // Generate .txt file
        "--output-json", // Generate .json file with timestamps
      ];

      // Add optional parameters
      if (options.processors) {
        args.push("-p", String(options.processors));
      }

      // Note: --print-progress is enabled by default in whisper-cli
      // We capture progress in stderr, so no need to disable it

      console.log(`[Whisper] Running: ${this.whisperPath} ${args.join(" ")}`);

      // Set up environment with library path for native libraries
      const isDev = !app.isPackaged;
      const resourcesPath = isDev
        ? path.join(__dirname, "../..")
        : process.resourcesPath;
      const libPath = path.join(resourcesPath, "lib");

      console.log(`[Whisper] Library path: ${libPath}`);
      console.log(`[Whisper] Library path exists: ${fs.existsSync(libPath)}`);

      const env = { ...process.env };

      // Set library path based on platform
      if (process.platform === "darwin") {
        env.DYLD_LIBRARY_PATH =
          libPath + (env.DYLD_LIBRARY_PATH ? `:${env.DYLD_LIBRARY_PATH}` : "");
        console.log(`[Whisper] DYLD_LIBRARY_PATH: ${env.DYLD_LIBRARY_PATH}`);
      } else if (process.platform === "linux") {
        env.LD_LIBRARY_PATH =
          libPath + (env.LD_LIBRARY_PATH ? `:${env.LD_LIBRARY_PATH}` : "");
        console.log(`[Whisper] LD_LIBRARY_PATH: ${env.LD_LIBRARY_PATH}`);
      } else if (process.platform === "win32") {
        env.PATH = libPath + (env.PATH ? `;${env.PATH}` : "");
      }

      const whisperProcess = spawn(this.whisperPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: env,
      });

      let stdout = "";
      let stderr = "";

      whisperProcess.stdout.on("data", (data) => {
        const output = data.toString();
        stdout += output;
      });

      whisperProcess.stderr.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        // Log progress information
        if (output.includes("progress") || output.includes("error")) {
          console.log(`[Whisper] ${output.trim()}`);
        }
      });

      whisperProcess.on("close", (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (code !== 0) {
          reject(
            new Error(
              `Whisper process exited with code ${code}\nStderr: ${stderr}\nStdout: ${stdout}`
            )
          );
          return;
        }

        try {
          // Try to read the JSON output first (more detailed)
          const jsonPath = audioFilePath.replace(
            path.extname(audioFilePath),
            ".json"
          );
          const txtPath = audioFilePath.replace(
            path.extname(audioFilePath),
            ".txt"
          );

          let transcript = "";
          let segments = [];

          const audioStats = fs.statSync(audioFilePath);

          // Try JSON output first for detailed information
          if (fs.existsSync(jsonPath)) {
            try {
              const jsonContent = fs.readFileSync(jsonPath, "utf8");
              if (jsonContent.length > 0) {
                const jsonData = JSON.parse(jsonContent);
                transcript = jsonData.transcription || jsonData.text || "";
                segments = jsonData.segments || [];
              }
            } catch (jsonError) {
              console.warn(
                `[Whisper] Failed to parse JSON, falling back to text: ${jsonError.message}`
              );
            }
          }

          // Fall back to text output
          if (!transcript && fs.existsSync(txtPath)) {
            const txtContent = fs.readFileSync(txtPath, "utf8");
            transcript = txtContent.trim();
          }

          // Last resort: use stdout
          if (!transcript && stdout) {
            transcript = stdout.trim();
            console.log(`[Whisper] Using stdout`);
          }

          if (!transcript) {
            console.error(`[Whisper] No transcript generated`);
            console.error(
              `  Audio file: ${audioFilePath} (${audioStats.size} bytes)`
            );
            if (stderr.includes("error")) {
              console.error(
                `  Error: ${
                  stderr.match(/error:[^\n]+/i)?.[0] || "Unknown error"
                }`
              );
            }
            reject(
              new Error(
                `No transcript generated. Audio file may be invalid or incompatible.\n` +
                  `Size: ${audioStats.size} bytes`
              )
            );
            return;
          }

          console.log(
            `[Whisper] Transcription completed in ${duration}s (${transcript.length} chars)`
          );

          resolve({
            success: true,
            transcript,
            language: this.language,
            duration: parseFloat(duration),
            segments,
          });
        } catch (error) {
          reject(new Error(`Failed to parse whisper output: ${error.message}`));
        }
      });

      whisperProcess.on("error", (error) => {
        reject(
          new Error(
            `Failed to start Whisper process at ${this.whisperPath}: ${error.message}\n` +
              `Make sure whisper.cpp is built and the path is correct.`
          )
        );
      });
    });
  }

  /**
   * Generate placeholder transcript for testing
   * @private
   */
  _generatePlaceholderTranscript() {
    return `This is a placeholder transcript generated by Privote.

To enable real transcription, you need to integrate Whisper.cpp:

1. Download a Whisper model (e.g., ggml-base.en.bin)
2. Place it in the 'models' directory
3. Build whisper.cpp or use the WASM version
4. Update the whisper-client.js implementation

For now, you can test the UI and upload functionality with this placeholder text.`;
  }

  /**
   * Download Whisper model
   * @param {string} modelName - Model name (e.g., 'base.en', 'small', 'medium')
   * @returns {Promise<string>} - Path to downloaded model
   */
  async downloadModel(modelName = "base.en") {
    // TODO: Implement model download
    // Models can be downloaded from: https://huggingface.co/ggerganov/whisper.cpp
    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;
    console.log(`[Whisper] Download model from: ${modelUrl}`);

    throw new Error(
      "Model download not implemented. Please download manually from https://huggingface.co/ggerganov/whisper.cpp"
    );
  }

  /**
   * Check if Whisper is available and ready to use
   * @returns {Object} Status object with availability info
   */
  isAvailable() {
    const modelExists = fs.existsSync(this.modelPath);
    const executableExists = fs.existsSync(this.whisperPath);

    return {
      available: modelExists && executableExists,
      modelExists,
      executableExists,
      modelPath: this.modelPath,
      executablePath: this.whisperPath,
    };
  }
}

module.exports = WhisperClient;
