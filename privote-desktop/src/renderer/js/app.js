/**
 * Privote Desktop App
 * Main entry point and initialization
 */

import { state, setState } from "./state.js";
import * as api from "./api.js";
import { setupNavigation } from "./navigation.js";
import { setupRecordingControls } from "./recording.js";
import { setupSummariesControls } from "./meetings.js";
import { setupSettingsControls, updateSettingsUI } from "./settings.js";
import { initializeVisualizer } from "./audio.js";

/**
 * Initialize the application
 */
async function initializeApp() {
  const result = await api.getSettings();
  if (result.success) {
    setState("settings", result.settings);
    updateSettingsUI();
  }

  const info = await api.getAppInfo();
  document.getElementById("app-version").textContent = info.version;
  document.getElementById("data-path").textContent = info.userDataPath;

  initializeVisualizer();
}

/**
 * Main application bootstrap
 */
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
  setupNavigation();
  setupRecordingControls();
  setupSettingsControls();
  setupSummariesControls();

  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
});
