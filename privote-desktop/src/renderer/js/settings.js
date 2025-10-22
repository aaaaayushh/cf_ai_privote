/**
 * Settings Management
 * Handles application settings
 */

import { state, setState } from "./state.js";
import * as api from "./api.js";
import { showStatus } from "./ui.js";

/**
 * Setup settings controls
 */
export function setupSettingsControls() {
  const saveBtn = document.getElementById("save-settings-btn");
  const resetBtn = document.getElementById("reset-settings-btn");

  saveBtn.addEventListener("click", saveSettings);
  resetBtn.addEventListener("click", resetSettings);
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
  };

  const result = await api.saveSettings(settings);

  if (result.success) {
    setState("settings", settings);
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
  };

  const result = await api.saveSettings(defaultSettings);

  if (result.success) {
    setState("settings", defaultSettings);
    updateSettingsUI();
    showStatus("Settings reset to defaults", "success");
  } else {
    showStatus("Error resetting settings: " + result.error, "error");
  }
}
