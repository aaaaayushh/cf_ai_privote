/**
 * Settings Management
 * Handles application settings
 */

import { state, setState } from "./state.js";
import * as api from "./api.js";
import { showStatus } from "./ui.js";
import { updateCurrentModelIndicator } from "./recording.js";

/**
 * Setup settings controls
 */
export function setupSettingsControls() {
  const saveBtn = document.getElementById("save-settings-btn");
  const resetBtn = document.getElementById("reset-settings-btn");
  const downloadBtn = document.getElementById("download-model-btn");

  saveBtn.addEventListener("click", saveSettings);
  resetBtn.addEventListener("click", resetSettings);
  downloadBtn.addEventListener("click", downloadModel);
}

/**
 * Update settings UI with current values
 */
export function updateSettingsUI() {
  document.getElementById("worker-url").value = state.settings.workerUrl || "";
  document.getElementById("api-key").value = state.settings.apiKey || "";
  document.getElementById("auto-upload").checked =
    state.settings.autoUpload !== false;
  document.getElementById("keep-local").checked =
    state.settings.keepLocalCopies !== false;
  document.getElementById("whisper-model").value =
    state.settings.whisperModel || "ggml-base.en.bin";

  updateAvailableModels();
}

/**
 * Save settings
 */
async function saveSettings() {
  const settings = {
    workerUrl: document.getElementById("worker-url").value,
    apiKey: document.getElementById("api-key").value,
    autoUpload: document.getElementById("auto-upload").checked,
    keepLocalCopies: document.getElementById("keep-local").checked,
    whisperModel: document.getElementById("whisper-model").value,
  };

  const result = await api.saveSettings(settings);

  if (result.success) {
    setState("settings", settings);
    await updateCurrentModelIndicator();
    showStatus("Settings saved successfully", "success");
  } else {
    showStatus("Error saving settings: " + result.error, "error");
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  const defaultSettings = {
    workerUrl: "",
    apiKey: "",
    autoUpload: true,
    keepLocalCopies: true,
    whisperModel: "ggml-base.en.bin",
  };

  const result = await api.saveSettings(defaultSettings);

  if (result.success) {
    setState("settings", defaultSettings);
    updateSettingsUI();
    await updateCurrentModelIndicator();
    showStatus("Settings reset to defaults", "success");
  } else {
    showStatus("Error resetting settings: " + result.error, "error");
  }
}

/**
 * Update available models list in the UI
 */
async function updateAvailableModels() {
  const result = await api.listAvailableModels();

  if (result.success) {
    const container = document.getElementById("available-models");
    container.innerHTML = "";

    result.models.forEach((model) => {
      const item = document.createElement("div");
      item.className = "model-item";
      item.innerHTML = `
        <div class="model-info">
          <span class="model-name">${model.displayName || model.name}</span>
          <span class="model-size">${model.size}</span>
        </div>
        <span class="model-status ${
          model.available ? "available" : "unavailable"
        }">
          ${model.available ? "Available" : "Missing"}
        </span>
      `;
      container.appendChild(item);
    });

    // Update the dropdown options based on available models
    const select = document.getElementById("whisper-model");
    const currentValue = select.value;

    // Clear existing options
    select.innerHTML = "";

    // Add available models to dropdown with better descriptions
    result.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.name;
      option.textContent = model.displayName || model.name;
      select.appendChild(option);
    });

    // Restore the previously selected value if it exists
    if (result.models.some((m) => m.name === currentValue)) {
      select.value = currentValue;
    }
  }
}

/**
 * Download a new model
 */
async function downloadModel() {
  const select = document.getElementById("whisper-model");
  const downloadBtn = document.getElementById("download-model-btn");
  const modelName = select.value;

  if (!modelName) {
    showStatus("Please select a model first", "error");
    return;
  }

  // Check if model is already available first
  const modelsResult = await api.listAvailableModels();
  if (modelsResult.success) {
    const model = modelsResult.models.find((m) => m.name === modelName);
    if (model && model.available) {
      showStatus(`Model ${modelName} is already available`, "info");
      return;
    }
  }

  // Disable button during download
  downloadBtn.disabled = true;
  downloadBtn.innerHTML =
    '<i data-lucide="loader" class="btn-icon"></i><span>Downloading...</span>';
  showStatus(`Downloading model ${modelName}...`, "info");

  const result = await api.downloadModel(modelName);

  if (result.success) {
    showStatus(`Model ${modelName} downloaded successfully`, "success");
    await updateAvailableModels(); // Refresh the available models list
    await updateCurrentModelIndicator(); // Update current model indicator

    // Re-enable button and update text
    downloadBtn.disabled = false;
    downloadBtn.innerHTML =
      '<i data-lucide="download" class="btn-icon"></i><span>Download Model</span>';

    // Trigger icons refresh
    if (window.lucide) {
      lucide.createIcons();
    }
  } else {
    showStatus("Error downloading model: " + result.error, "error");
    downloadBtn.disabled = false;
    downloadBtn.innerHTML =
      '<i data-lucide="download" class="btn-icon"></i><span>Download Model</span>';

    // Trigger icons refresh
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

/**
 * Setup model selection change handler
 */
export function setupModelSelection() {
  const select = document.getElementById("whisper-model");
  const downloadBtn = document.getElementById("download-model-btn");

  select.addEventListener("change", function () {
    const selectedModel = this.value;

    // Update button text based on whether model is available
    updateAvailableModels().then((result) => {
      if (result && result.success) {
        const model = result.models.find((m) => m.name === selectedModel);
        if (model && model.available) {
          downloadBtn.textContent = "Model Already Available";
          downloadBtn.disabled = true;
        } else {
          downloadBtn.textContent = "Download Model";
          downloadBtn.disabled = false;
        }
      }
    });
  });
}
