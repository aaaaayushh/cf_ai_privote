/**
 * Recordings Management
 * Handles viewing and managing local audio recordings
 */

import * as api from "./api.js";
import { showStatus, showConfirmDialog } from "./ui.js";

/**
 * Setup recordings view controls
 */
export function setupRecordingsView() {
  const refreshBtn = document.getElementById("refresh-recordings-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadRecordings);
  }
}

/**
 * Load and display recordings
 */
export async function loadRecordings() {
  try {
    showStatus("Loading recordings...", "info");

    const result = await api.listRecordings();

    if (result.success) {
      displayRecordings(result.recordings);
      showStatus("", "info");
    } else {
      showStatus("Failed to load recordings: " + result.error, "error");
    }
  } catch (error) {
    console.error("Error loading recordings:", error);
    showStatus("Error loading recordings", "error");
  }
}

/**
 * Display recordings in the UI
 * @param {Array} recordings - Array of recording objects
 */
function displayRecordings(recordings) {
  const recordingsList = document.getElementById("recordings-list");

  if (!recordings || recordings.length === 0) {
    recordingsList.innerHTML = `
      <div class="empty-state">
        <p>No recordings yet</p>
        <p class="empty-subtitle">Start recording to see your audio files here</p>
      </div>
    `;
    return;
  }

  recordingsList.innerHTML = recordings
    .map((recording) => createRecordingCard(recording))
    .join("");

  if (window.lucide) {
    lucide.createIcons();
  }

  recordings.forEach((recording) => {
    setupRecordingActions(recording);
  });
}

/**
 * Create HTML for a recording card
 * @param {Object} recording - Recording object
 * @returns {string} HTML string
 */
function createRecordingCard(recording) {
  const date = new Date(recording.created);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString();
  const sizeInMB = (recording.size / (1024 * 1024)).toFixed(2);

  return `
    <div class="item-card recording-card" data-filepath="${recording.filepath}">
      <div class="item-header">
        <div>
          <div class="item-title">${recording.filename}</div>
          <div class="item-date">${dateStr} at ${timeStr}</div>
        </div>
        <button class="delete-recording-btn" data-filepath="${recording.filepath}" title="Delete recording">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      
      <div class="item-content">
        <div class="recording-info">
          <span class="meta-badge">
            <i data-lucide="file-audio" class="inline-icon"></i>
            ${sizeInMB} MB
          </span>
        </div>
      </div>
      
      <div class="recording-actions">
        <button class="btn btn-small transcribe-recording-btn" data-filepath="${recording.filepath}">
          <i data-lucide="file-text" class="inline-icon"></i>
          Transcribe
        </button>
        <button class="btn btn-small show-in-folder-btn" data-filepath="${recording.filepath}">
          <i data-lucide="folder-open" class="inline-icon"></i>
          Show in Finder
        </button>
      </div>
    </div>
  `;
}

/**
 * Setup action event listeners for a recording
 * @param {Object} recording - Recording object
 */
function setupRecordingActions(recording) {
  const card = document.querySelector(
    `.recording-card[data-filepath="${recording.filepath}"]`
  );

  if (!card) return;

  const deleteBtn = card.querySelector(".delete-recording-btn");
  const transcribeBtn = card.querySelector(".transcribe-recording-btn");
  const showInFolderBtn = card.querySelector(".show-in-folder-btn");

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleDeleteRecording(recording);
  });

  transcribeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleTranscribeRecording(recording);
  });

  showInFolderBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleShowInFolder(recording);
  });
}

/**
 * Handle recording deletion
 * @param {Object} recording - Recording object
 */
async function handleDeleteRecording(recording) {
  showConfirmDialog(
    `Are you sure you want to delete "${recording.filename}"? This action cannot be undone.`,
    async () => {
      try {
        showStatus("Deleting recording...", "info");

        const result = await api.deleteRecording(recording.filepath);

        if (result.success) {
          showStatus("Recording deleted successfully", "success");
          await loadRecordings();
        } else {
          showStatus("Failed to delete recording: " + result.error, "error");
        }
      } catch (error) {
        console.error("Error deleting recording:", error);
        showStatus("Error deleting recording", "error");
      }
    }
  );
}

/**
 * Handle recording transcription
 * @param {Object} recording - Recording object
 */
async function handleTranscribeRecording(recording) {
  try {
    showStatus("Starting transcription...", "info", true);

    const { disableRecordingControls, enableRecordingControls } = await import(
      "./ui.js"
    );
    disableRecordingControls();

    const result = await api.transcribeAudio(recording.filepath);

    if (result.success) {
      const { setState } = await import("./state.js");
      setState("currentTranscript", {
        text: result.transcript,
        filepath: recording.filepath,
        timestamp: new Date().toISOString(),
      });

      const { displayTranscript } = await import("./ui.js");
      displayTranscript(result.transcript);

      showStatus("Transcription complete!", "success");

      const navItems = document.querySelectorAll(".nav-item");
      const views = document.querySelectorAll(".view");

      navItems.forEach((nav) => nav.classList.remove("active"));
      document
        .querySelector('.nav-item[data-view="record"]')
        .classList.add("active");

      views.forEach((view) => view.classList.remove("active"));
      document.getElementById("record-view").classList.add("active");
    } else {
      showStatus("Transcription failed: " + result.error, "error");
    }

    enableRecordingControls();
  } catch (error) {
    console.error("Error transcribing recording:", error);
    showStatus("Error transcribing recording", "error");

    const { enableRecordingControls } = await import("./ui.js");
    enableRecordingControls();
  }
}

/**
 * Handle show in folder
 * @param {Object} recording - Recording object
 */
async function handleShowInFolder(recording) {
  try {
    const result = await api.showRecordingInFolder(recording.filepath);

    if (!result.success) {
      showStatus("Failed to show recording in folder", "error");
    }
  } catch (error) {
    console.error("Error showing in folder:", error);
    showStatus("Error showing recording in folder", "error");
  }
}
