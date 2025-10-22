/**
 * Meetings Management
 * Handles meetings/summaries display and interaction
 */

import { state } from "./state.js";
import * as api from "./api.js";
import { showStatus, showConfirmDialog } from "./ui.js";
import { exportMeetingAsMarkdown } from "./export.js";

/**
 * Setup summaries controls
 */
export function setupSummariesControls() {
  const refreshBtn = document.getElementById("refresh-summaries-btn");
  refreshBtn.addEventListener("click", loadMeetings);
}

/**
 * Load meetings from Worker
 */
export async function loadMeetings() {
  const summariesList = document.getElementById("summaries-list");
  summariesList.innerHTML =
    '<div class="empty-state"><p>Loading meetings...</p></div>';

  if (!state.settings.workerUrl) {
    summariesList.innerHTML = `
      <div class="empty-state">
        <i data-lucide="settings" class="empty-icon"></i>
        <p>Worker URL not configured</p>
        <p class="empty-subtitle">Please configure your Worker URL in Settings</p>
      </div>
    `;

    // Initialize icons for empty state
    if (window.lucide) {
      lucide.createIcons();
    }

    return;
  }

  try {
    const result = await api.fetchMeetings({
      limit: 50,
      offset: 0,
    });

    if (result.success && result.meetings.length > 0) {
      summariesList.innerHTML = "";

      result.meetings.forEach((meeting) => {
        const card = createMeetingCard(meeting);
        summariesList.appendChild(card);
      });

      // Initialize all icons after adding cards
      if (window.lucide) {
        lucide.createIcons();
      }
    } else if (result.success) {
      summariesList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="bar-chart" class="empty-icon"></i>
          <p>No meetings yet</p>
          <p class="empty-subtitle">Upload a transcript to generate summaries and action items</p>
        </div>
      `;

      // Initialize icons for empty state
      if (window.lucide) {
        lucide.createIcons();
      }
    } else {
      summariesList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="x-circle" class="empty-icon"></i>
          <p>Error loading meetings</p>
          <p class="empty-subtitle">${result.error}</p>
        </div>
      `;

      // Initialize icons for empty state
      if (window.lucide) {
        lucide.createIcons();
      }
    }
  } catch (error) {
    console.error("Error loading meetings:", error);
    summariesList.innerHTML = `
      <div class="empty-state">
        <i data-lucide="x-circle" class="empty-icon"></i>
        <p>Error loading meetings</p>
        <p class="empty-subtitle">${error.message}</p>
      </div>
    `;

    // Initialize icons for empty state
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

/**
 * Create meeting card element
 * @param {Object} meeting - Meeting object
 * @returns {HTMLElement} Meeting card
 */
function createMeetingCard(meeting) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.style.cursor = "pointer";

  const date = new Date(meeting.created_at).toLocaleString();
  const meetingDate = meeting.meeting_date
    ? new Date(meeting.meeting_date).toLocaleDateString()
    : date;

  card.innerHTML = `
    <div class="item-header">
      <div>
        <div class="item-title">${meeting.title || "Untitled Meeting"}</div>
        <div class="item-date"><i data-lucide="calendar" class="inline-icon"></i> ${meetingDate} • <i data-lucide="clock" class="inline-icon"></i> ${
    meeting.meeting_time || "N/A"
  }</div>
      </div>
      <button class="btn-small delete-meeting-btn" data-id="${
        meeting.id
      }"><i data-lucide="trash-2" class="btn-icon"></i></button>
    </div>
    <div class="item-meta">
      <span class="meta-badge">Created ${new Date(
        meeting.created_at
      ).toLocaleString()}</span>
    </div>
  `;

  card.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("delete-meeting-btn")) {
      await loadMeetingDetails(meeting.id);
    }
  });

  const deleteBtn = card.querySelector(".delete-meeting-btn");
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await deleteMeeting(meeting.id);
  });

  // Initialize icons for this card
  if (window.lucide) {
    lucide.createIcons();
  }

  return card;
}

/**
 * Load meeting details
 * @param {string} meetingId - Meeting ID
 */
async function loadMeetingDetails(meetingId) {
  try {
    showStatus("Loading meeting details...", "success");

    const result = await api.fetchMeeting(meetingId);

    if (result.success) {
      viewMeetingDetails(result.meeting);
    } else {
      showStatus("Error loading meeting: " + result.error, "error");
    }
  } catch (error) {
    console.error("Error loading meeting details:", error);
    showStatus("Error loading meeting details", "error");
  }
}

/**
 * View meeting details in modal
 * @param {Object} meeting - Meeting object
 */
export function viewMeetingDetails(meeting) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  const actionItems = meeting.action_items
    .split("\n")
    .filter((item) => item.trim())
    .map((item) => item.replace(/^[•\-*]\s*/, "").trim())
    .filter((item) => item.length > 0);

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${meeting.title}</h2>
        <button class="modal-close" id="close-modal-btn"><i data-lucide="x"></i></button>
      </div>
      
      <div class="modal-body">
        <div class="meeting-meta">
          <span><i data-lucide="calendar" class="inline-icon"></i> ${new Date(
            meeting.meeting_date
          ).toLocaleDateString()}</span>
          <span><i data-lucide="clock" class="inline-icon"></i> ${
            meeting.meeting_time
          }</span>
          <span><i data-lucide="file-text" class="inline-icon"></i> Created ${new Date(
            meeting.created_at
          ).toLocaleString()}</span>
        </div>
        
        <div class="meeting-section">
          <h3>Summary</h3>
          <p class="meeting-summary">${meeting.summary}</p>
        </div>
        
        <div class="meeting-section">
          <h3>Action Items</h3>
          <ul class="action-items-list">
            ${
              actionItems.length > 0
                ? actionItems.map((item) => `<li>${item}</li>`).join("")
                : "<li>No action items identified</li>"
            }
          </ul>
        </div>
        
        <div class="meeting-section">
          <h3>Transcript</h3>
          <div class="transcript-box">
            ${meeting.transcript}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" id="export-markdown-btn">
          Export as Markdown
        </button>
        <button class="btn btn-secondary" id="close-modal-footer-btn">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById("close-modal-btn");
  const closeFooterBtn = document.getElementById("close-modal-footer-btn");
  const exportBtn = document.getElementById("export-markdown-btn");

  closeBtn.addEventListener("click", () => {
    modal.remove();
  });

  closeFooterBtn.addEventListener("click", () => {
    modal.remove();
  });

  exportBtn.addEventListener("click", () => {
    exportMeetingAsMarkdown(meeting);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Initialize icons for the modal
  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Delete meeting
 * @param {string} meetingId - Meeting ID
 */
async function deleteMeeting(meetingId) {
  showConfirmDialog(
    "Are you sure you want to delete this meeting? This cannot be undone.",
    async () => {
      try {
        showStatus("Deleting meeting...", "success");

        const result = await api.deleteMeeting(meetingId);

        if (result.success) {
          showStatus("Meeting deleted successfully", "success");
          await loadMeetings();
        } else {
          showStatus("Error deleting meeting: " + result.error, "error");
        }
      } catch (error) {
        console.error("Error deleting meeting:", error);
        showStatus("Error deleting meeting", "error");
      }
    }
  );
}
