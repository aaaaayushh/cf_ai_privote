/**
 * Recording Management
 * Handles audio recording functionality
 */

import { state, setState } from "./state.js";
import * as api from "./api.js";
import {
  showStatus,
  disableRecordingControls,
  enableRecordingControls,
  disableUploadButton,
  enableUploadButton,
  showConfirmDialog,
} from "./ui.js";
import {
  convertToWav,
  setupAudioVisualization,
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
} from "./audio.js";
import { processRecording } from "./transcription.js";

/**
 * Update the current model indicator in the UI
 */
export async function updateCurrentModelIndicator() {
  const modelNameElement = document.getElementById("current-model-name");

  if (!modelNameElement) return;

  try {
    const result = await api.getCurrentModel();

    if (result.success) {
      // Get the display name for the model
      const models = [
        { name: "ggml-base.en.bin", displayName: "Base English (141MB)" },
        { name: "ggml-tiny.en.bin", displayName: "Tiny English (74MB)" },
        { name: "ggml-small.en.bin", displayName: "Small English (244MB)" },
        { name: "ggml-medium.en.bin", displayName: "Medium English (769MB)" },
        { name: "ggml-large-v2.bin", displayName: "Large v2 (1550MB)" },
      ];

      const modelInfo = models.find((m) => m.name === result.model);
      const displayName = modelInfo ? modelInfo.displayName : result.model;

      modelNameElement.textContent = `${displayName}${
        !result.available ? " (Missing)" : ""
      }`;
      modelNameElement.style.color = result.available
        ? "var(--primary-color)"
        : "var(--danger-color)";
    } else {
      modelNameElement.textContent = "Unknown";
      modelNameElement.style.color = "var(--text-secondary)";
    }
  } catch (error) {
    console.error("Error updating current model indicator:", error);
    modelNameElement.textContent = "Error";
    modelNameElement.style.color = "var(--danger-color)";
  }
}

/**
 * Setup recording controls
 */
export function setupRecordingControls() {
  const recordBtn = document.getElementById("record-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadTranscriptBtn = document.getElementById("upload-transcript-btn");
  const saveTranscriptBtn = document.getElementById("save-transcript-btn");
  const copyTranscriptBtn = document.getElementById("copy-transcript-btn");

  recordBtn.addEventListener("click", handleRecordToggle);
  pauseBtn.addEventListener("click", handlePauseToggle);
  uploadBtn.addEventListener("click", handleUploadAudio);
  uploadTranscriptBtn.addEventListener("click", handleUploadTranscript);
  saveTranscriptBtn.addEventListener("click", handleSaveTranscript);
  copyTranscriptBtn.addEventListener("click", handleCopyTranscript);
}

/**
 * Toggle recording on/off
 */
async function handleRecordToggle() {
  if (state.isRecording) {
    showConfirmDialog(
      "Are you sure you want to stop the recording? This will start processing the audio.",
      async () => {
        await stopRecording();
      }
    );
  } else {
    await startRecording();
  }
}

/**
 * Toggle pause/resume
 */
function handlePauseToggle() {
  if (state.isPaused) {
    resumeRecording();
  } else {
    pauseRecording();
  }
}

/**
 * Start audio recording
 */
async function startRecording() {
  try {
    console.log("Requesting microphone access...");

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "getUserMedia is not supported in this browser/environment"
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    console.log("Microphone access granted");
    console.log("Audio tracks:", stream.getAudioTracks().length);

    // Check if we actually got audio tracks
    if (stream.getAudioTracks().length === 0) {
      throw new Error("No audio tracks in stream");
    }

    let mimeType = "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/wav")) {
      mimeType = "audio/wav";
    } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeType = "audio/webm;codecs=opus";
    }

    state.mediaRecorder = new MediaRecorder(stream, { mimeType });
    state.audioChunks = [];

    state.mediaRecorder.ondataavailable = (event) => {
      state.audioChunks.push(event.data);
    };

    state.mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(state.audioChunks, { type: mimeType });
      const wavBlob = await convertToWav(audioBlob, stream);
      await processRecording(wavBlob);
      stream.getTracks().forEach((track) => track.stop());
    };

    state.mediaRecorder.start();
    setState("isRecording", true);
    setState("isPaused", false);
    setState("recordingStartTime", Date.now());
    setState("pausedTime", 0);

    const recordBtn = document.getElementById("record-btn");
    const pauseBtn = document.getElementById("pause-btn");

    recordBtn.classList.add("recording");
    recordBtn.innerHTML =
      '<i data-lucide="circle-stop" class="btn-icon"></i><span>Stop Recording</span>';

    pauseBtn.style.display = "inline-flex";

    // Reinitialize icons
    if (window.lucide) {
      lucide.createIcons();
    }

    disableUploadButton();
    startTimer();
    setupAudioVisualization(stream);

    await api.startRecording();

    showStatus("Recording started...", "success");
  } catch (error) {
    console.error("Error starting recording:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    let errorMessage = "Failed to start recording. ";

    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      errorMessage +=
        "Microphone access denied. Please grant microphone permissions in System Settings > Privacy & Security > Microphone.";
    } else if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      errorMessage +=
        "No microphone found. Please connect a microphone and try again.";
    } else if (
      error.name === "NotReadableError" ||
      error.name === "TrackStartError"
    ) {
      errorMessage += "Microphone is already in use by another application.";
    } else if (error.message.includes("getUserMedia")) {
      errorMessage +=
        "getUserMedia API is not available. This might be a security restriction.";
    } else {
      errorMessage += error.message;
    }

    showStatus(errorMessage, "error");
  }
}

/**
 * Pause audio recording
 */
function pauseRecording() {
  if (state.mediaRecorder && state.isRecording && !state.isPaused) {
    state.mediaRecorder.pause();
    setState("isPaused", true);

    const pauseBtn = document.getElementById("pause-btn");
    pauseBtn.innerHTML =
      '<i data-lucide="play" class="btn-icon"></i><span>Resume</span>';

    // Reinitialize icons
    if (window.lucide) {
      lucide.createIcons();
    }

    pauseTimer();
    showStatus("Recording paused", "info");
  }
}

/**
 * Resume audio recording
 */
function resumeRecording() {
  if (state.mediaRecorder && state.isRecording && state.isPaused) {
    state.mediaRecorder.resume();
    setState("isPaused", false);

    const pauseBtn = document.getElementById("pause-btn");
    pauseBtn.innerHTML =
      '<i data-lucide="pause" class="btn-icon"></i><span>Pause</span>';

    // Reinitialize icons
    if (window.lucide) {
      lucide.createIcons();
    }

    resumeTimer();
    showStatus("Recording resumed", "success");
  }
}

/**
 * Stop audio recording
 */
async function stopRecording() {
  if (state.mediaRecorder && state.isRecording) {
    if (state.isPaused) {
      state.mediaRecorder.resume();
    }

    state.mediaRecorder.stop();
    setState("isRecording", false);
    setState("isPaused", false);

    const recordBtn = document.getElementById("record-btn");
    const pauseBtn = document.getElementById("pause-btn");

    recordBtn.classList.remove("recording");
    recordBtn.innerHTML =
      '<i data-lucide="mic" class="btn-icon"></i><span>Start Recording</span>';

    pauseBtn.style.display = "none";
    pauseBtn.innerHTML =
      '<i data-lucide="pause" class="btn-icon"></i><span>Pause</span>';

    // Reinitialize icons
    if (window.lucide) {
      lucide.createIcons();
    }

    enableUploadButton();
    stopTimer();

    await api.stopRecording();

    showStatus("Processing recording...", "success");
  }
}

/**
 * Handle upload audio file
 */
async function handleUploadAudio() {
  try {
    const result = await api.loadAudioFile();

    if (result.success && !result.canceled) {
      disableRecordingControls();
      showStatus("Transcribing uploaded audio...", "success", true);

      const transcriptResult = await api.transcribeAudio(result.filepath);

      if (transcriptResult.success) {
        setState("currentTranscript", {
          text: transcriptResult.transcript,
          filepath: result.filepath,
          timestamp: new Date().toISOString(),
        });

        const { displayTranscript } = await import("./ui.js");
        displayTranscript(transcriptResult.transcript);
        showStatus("Transcription complete!", "success");
      } else {
        showStatus("Transcription failed: " + transcriptResult.error, "error");
      }
      enableRecordingControls();
    }
  } catch (error) {
    console.error("Error uploading audio:", error);
    showStatus("Error uploading audio", "error");
    enableRecordingControls();
  }
}

/**
 * Handle upload transcript to Worker
 */
async function handleUploadTranscript() {
  const { handleTranscriptUpload } = await import("./transcription.js");
  await handleTranscriptUpload();
}

/**
 * Handle save transcript locally
 */
function handleSaveTranscript() {
  if (!state.currentTranscript) {
    showStatus("No transcript to save", "error");
    return;
  }

  const dataStr = JSON.stringify(state.currentTranscript, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `transcript-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showStatus("Transcript saved locally", "success");
}

/**
 * Handle copy transcript to clipboard
 */
function handleCopyTranscript() {
  const transcriptContent = document.getElementById("transcript-content");
  const text = transcriptContent.textContent;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      showStatus("Transcript copied to clipboard", "success");
    })
    .catch((err) => {
      console.error("Error copying transcript:", err);
      showStatus("Failed to copy transcript", "error");
    });
}
