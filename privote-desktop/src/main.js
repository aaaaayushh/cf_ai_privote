const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#1a1a1a",
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Open DevTools in development mode
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC Handlers

// Audio recording handlers
ipcMain.handle("start-recording", async () => {
  try {
    // This will be called by the renderer when user starts recording
    // The actual recording happens in the renderer using Web Audio API
    return { success: true, timestamp: Date.now() };
  } catch (error) {
    console.error("Error starting recording:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("stop-recording", async () => {
  try {
    return { success: true, timestamp: Date.now() };
  } catch (error) {
    console.error("Error stopping recording:", error);
    return { success: false, error: error.message };
  }
});

// Save audio file
ipcMain.handle("save-audio", async (event, audioData) => {
  try {
    const recordingsDir = path.join(app.getPath("userData"), "recordings");

    // Create recordings directory if it doesn't exist
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recording-${timestamp}.wav`;
    const filepath = path.join(recordingsDir, filename);

    // Convert base64 to buffer if needed
    const buffer = Buffer.from(
      audioData.replace(/^data:audio\/\w+;base64,/, ""),
      "base64"
    );
    fs.writeFileSync(filepath, buffer);

    return { success: true, filepath, filename };
  } catch (error) {
    console.error("Error saving audio:", error);
    return { success: false, error: error.message };
  }
});

// Load audio file
ipcMain.handle("load-audio-file", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Audio Files",
          extensions: ["wav", "mp3", "m4a", "ogg", "webm"],
        },
      ],
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const filepath = result.filePaths[0];
    const audioData = fs.readFileSync(filepath);
    const base64Audio = audioData.toString("base64");
    const ext = path.extname(filepath).substring(1);

    return {
      success: true,
      filepath,
      filename: path.basename(filepath),
      audioData: `data:audio/${ext};base64,${base64Audio}`,
    };
  } catch (error) {
    console.error("Error loading audio file:", error);
    return { success: false, error: error.message };
  }
});

// Transcription handlers
const WhisperClient = require("./whisper/whisper-client");
const whisperClient = new WhisperClient();

ipcMain.handle("transcribe-audio", async (event, audioFilePath) => {
  try {
    console.log("Transcribing audio:", audioFilePath);

    // Use Whisper client for transcription
    const result = await whisperClient.transcribe(audioFilePath);

    if (result.success) {
      return {
        success: true,
        transcript: result.transcript,
        duration: result.duration,
        language: result.language,
      };
    } else {
      return {
        success: false,
        error: result.error || "Transcription failed",
      };
    }
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return { success: false, error: error.message };
  }
});

// Cloudflare Worker communication
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function getWorkerUrl() {
  const settingsPath = path.join(app.getPath("userData"), "settings.json");
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    return settings.workerUrl || null;
  }
  return null;
}

async function getApiKey() {
  const settingsPath = path.join(app.getPath("userData"), "settings.json");
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    return settings.apiKey || null;
  }
  return null;
}

ipcMain.handle("upload-transcript", async (event, transcriptData) => {
  try {
    const workerUrl = await getWorkerUrl();
    const apiKey = await getApiKey();

    if (!workerUrl) {
      return {
        success: false,
        error: "Worker URL not configured. Please set it in Settings.",
      };
    }

    const headers = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(`${workerUrl}/api/transcripts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        transcript: transcriptData.text,
        title:
          transcriptData.title || `Meeting ${new Date().toLocaleDateString()}`,
        meeting_date:
          transcriptData.date || new Date().toISOString().split("T")[0],
        meeting_time:
          transcriptData.time ||
          new Date().toISOString().split("T")[1].split(".")[0],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, meeting: data.meeting };
  } catch (error) {
    console.error("Error uploading transcript:", error);
    return { success: false, error: error.message };
  }
});

// Get meetings from Worker
ipcMain.handle(
  "fetch-meetings",
  async (event, { limit = 50, offset = 0 } = {}) => {
    try {
      const workerUrl = await getWorkerUrl();
      const apiKey = await getApiKey();

      if (!workerUrl) {
        return {
          success: false,
          error: "Worker URL not configured. Please set it in Settings.",
        };
      }

      const headers = {};
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }

      const response = await fetch(
        `${workerUrl}/api/meetings?limit=${limit}&offset=${offset}`,
        { headers }
      );

      if (!response.ok) {
        return { success: false, error: `Server error: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        meetings: data.meetings || [],
        pagination: data.pagination,
      };
    } catch (error) {
      console.error("Error fetching meetings:", error);
      return { success: false, error: error.message };
    }
  }
);

// Get single meeting details
ipcMain.handle("fetch-meeting", async (event, meetingId) => {
  try {
    const workerUrl = await getWorkerUrl();
    const apiKey = await getApiKey();

    if (!workerUrl) {
      return {
        success: false,
        error: "Worker URL not configured. Please set it in Settings.",
      };
    }

    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(`${workerUrl}/api/meetings/${meetingId}`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, meeting: data.meeting };
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return { success: false, error: error.message };
  }
});

// Delete meeting
ipcMain.handle("delete-meeting", async (event, meetingId) => {
  try {
    const workerUrl = await getWorkerUrl();
    const apiKey = await getApiKey();

    if (!workerUrl) {
      return {
        success: false,
        error: "Worker URL not configured. Please set it in Settings.",
      };
    }

    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(`${workerUrl}/api/meetings/${meetingId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, message: data.message };
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return { success: false, error: error.message };
  }
});

// Settings handlers
ipcMain.handle("get-settings", async () => {
  try {
    const settingsPath = path.join(app.getPath("userData"), "settings.json");

    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = {
        workerUrl: "",
        apiKey: "",
        autoUpload: true,
        keepLocalCopies: true,
      };
      return { success: true, settings: defaultSettings };
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    return { success: true, settings };
  } catch (error) {
    console.error("Error getting settings:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-settings", async (event, settings) => {
  try {
    const settingsPath = path.join(app.getPath("userData"), "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    return { success: false, error: error.message };
  }
});

// Get app info
ipcMain.handle("get-app-info", async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    userDataPath: app.getPath("userData"),
  };
});
