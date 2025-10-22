/**
 * Application State Management
 * Centralized state for the Privote application
 */

export const state = {
  // Recording state
  isRecording: false,
  recordingStartTime: null,
  timerInterval: null,

  // Audio state
  audioContext: null,
  mediaRecorder: null,
  audioChunks: [],

  // Transcript state
  currentTranscript: null,

  // Settings state
  settings: {},
};

/**
 * Update a specific state property
 * @param {string} key - State property name
 * @param {*} value - New value
 */
export function setState(key, value) {
  state[key] = value;
}

/**
 * Get a specific state property
 * @param {string} key - State property name
 * @returns {*} State value
 */
export function getState(key) {
  return state[key];
}

/**
 * Reset recording state
 */
export function resetRecordingState() {
  state.isRecording = false;
  state.recordingStartTime = null;
  state.timerInterval = null;
  state.audioContext = null;
  state.mediaRecorder = null;
  state.audioChunks = [];
}

/**
 * Clear current transcript
 */
export function clearTranscript() {
  state.currentTranscript = null;
}
