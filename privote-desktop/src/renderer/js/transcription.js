/**
 * Transcription Management
 * Handles transcript processing and uploading
 */

import { state, setState } from "./state.js";
import * as api from "./api.js";
import {
  showStatus,
  showTitleInputDialog,
  showConfirmDialog,
  displayTranscript,
} from "./ui.js";
import { viewMeetingDetails } from "./meetings.js";

/**
 * Process recording and transcribe
 * @param {Blob} audioBlob - Audio blob
 */
export async function processRecording(audioBlob) {
  try {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);

    reader.onloadend = async () => {
      const base64Audio = reader.result;

      const saveResult = await api.saveAudio(base64Audio);

      if (saveResult.success) {
        showStatus(
          "Recording saved. Starting transcription...",
          "success",
          true
        );

        const transcriptResult = await api.transcribeAudio(saveResult.filepath);

        if (transcriptResult.success) {
          setState("currentTranscript", {
            text: transcriptResult.transcript,
            filepath: saveResult.filepath,
            timestamp: new Date().toISOString(),
          });

          displayTranscript(transcriptResult.transcript);
          showStatus("Transcription complete!", "success");
        } else {
          showStatus(
            "Transcription failed: " + transcriptResult.error,
            "error"
          );
        }
      } else {
        showStatus("Failed to save recording: " + saveResult.error, "error");
      }
    };
  } catch (error) {
    console.error("Error processing recording:", error);
    showStatus("Error processing recording", "error");
  }
}

/**
 * Handle transcript upload to Worker
 */
export async function handleTranscriptUpload() {
  if (!state.currentTranscript) {
    showStatus("No transcript to upload", "error");
    return;
  }

  if (!state.settings.workerUrl) {
    showStatus("Please configure Worker URL in Settings first", "error");
    return;
  }

  showTitleInputDialog(async (title) => {
    if (!title) {
      showStatus("Upload cancelled", "error");
      return;
    }

    try {
      showStatus(
        "Uploading transcript to Worker for AI processing...",
        "success"
      );

      const result = await api.uploadTranscript({
        text: state.currentTranscript.text,
        title: title,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toISOString().split("T")[1].split(".")[0],
      });

      if (result.success) {
        showStatus(
          "Transcript processed! Summary and action items generated.",
          "success"
        );

        setState("currentTranscript", {
          ...state.currentTranscript,
          meetingId: result.meeting.id,
        });

        setTimeout(() => {
          showConfirmDialog("Would you like to view the summary now?", () => {
            viewMeetingDetails(result.meeting);
          });
        }, 1000);
      } else {
        showStatus("Upload failed: " + result.error, "error");
      }
    } catch (error) {
      console.error("Error uploading transcript:", error);
      showStatus("Error uploading transcript", "error");
    }
  });
}
