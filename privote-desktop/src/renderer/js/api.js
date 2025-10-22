/**
 * Worker API Communication
 * Handles all communication with the Cloudflare Worker backend
 */

/**
 * Upload transcript to Worker for AI processing
 * @param {Object} transcriptData - Transcript data
 * @param {string} transcriptData.text - Transcript text
 * @param {string} transcriptData.title - Meeting title
 * @param {string} transcriptData.date - Meeting date
 * @param {string} transcriptData.time - Meeting time
 * @returns {Promise<Object>} API response
 */
export async function uploadTranscript(transcriptData) {
  return await window.electronAPI.uploadTranscript(transcriptData);
}

/**
 * Fetch list of meetings from Worker
 * @param {Object} options - Pagination options
 * @param {number} options.limit - Number of meetings to fetch
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object>} API response with meetings list
 */
export async function fetchMeetings(options = { limit: 50, offset: 0 }) {
  return await window.electronAPI.fetchMeetings(options);
}

/**
 * Fetch single meeting details
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} API response with meeting details
 */
export async function fetchMeeting(meetingId) {
  return await window.electronAPI.fetchMeeting(meetingId);
}

/**
 * Delete a meeting
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} API response
 */
export async function deleteMeeting(meetingId) {
  return await window.electronAPI.deleteMeeting(meetingId);
}

/**
 * Get application settings
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  return await window.electronAPI.getSettings();
}

/**
 * Save application settings
 * @param {Object} settings - Settings object
 * @returns {Promise<Object>} API response
 */
export async function saveSettings(settings) {
  return await window.electronAPI.saveSettings(settings);
}

/**
 * Get application info
 * @returns {Promise<Object>} App info
 */
export async function getAppInfo() {
  return await window.electronAPI.getAppInfo();
}

/**
 * Start recording (IPC call)
 * @returns {Promise<Object>} API response
 */
export async function startRecording() {
  return await window.electronAPI.startRecording();
}

/**
 * Stop recording (IPC call)
 * @returns {Promise<Object>} API response
 */
export async function stopRecording() {
  return await window.electronAPI.stopRecording();
}

/**
 * Save audio data
 * @param {string} audioData - Base64 audio data
 * @returns {Promise<Object>} API response with file path
 */
export async function saveAudio(audioData) {
  return await window.electronAPI.saveAudio(audioData);
}

/**
 * Load audio file from disk
 * @returns {Promise<Object>} API response with audio data
 */
export async function loadAudioFile() {
  return await window.electronAPI.loadAudioFile();
}

/**
 * Transcribe audio file
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<Object>} API response with transcript
 */
export async function transcribeAudio(audioFilePath) {
  return await window.electronAPI.transcribeAudio(audioFilePath);
}
