const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Recording methods
  startRecording: () => ipcRenderer.invoke("start-recording"),
  stopRecording: () => ipcRenderer.invoke("stop-recording"),
  saveAudio: (audioData) => ipcRenderer.invoke("save-audio", audioData),
  loadAudioFile: () => ipcRenderer.invoke("load-audio-file"),

  // Transcription methods
  transcribeAudio: (audioFilePath) =>
    ipcRenderer.invoke("transcribe-audio", audioFilePath),

  // Worker communication
  uploadTranscript: (transcriptData) =>
    ipcRenderer.invoke("upload-transcript", transcriptData),
  fetchMeetings: (options) => ipcRenderer.invoke("fetch-meetings", options),
  fetchMeeting: (meetingId) => ipcRenderer.invoke("fetch-meeting", meetingId),
  deleteMeeting: (meetingId) => ipcRenderer.invoke("delete-meeting", meetingId),

  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),

  // App info
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),
});
