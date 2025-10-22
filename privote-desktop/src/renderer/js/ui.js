/**
 * UI Utilities
 * Handles UI interactions, modals, and status messages
 */

/**
 * Show status message
 * @param {string} message - Status message text
 * @param {string} type - Message type (info, success, error)
 * @param {boolean} persistent - Whether to keep the message until manually cleared
 */
export function showStatus(message, type = "info", persistent = false) {
  const statusElement = document.getElementById("status-message");
  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`;

  // Only auto-clear if not persistent
  if (!persistent) {
    setTimeout(() => {
      statusElement.textContent = "";
      statusElement.className = "status-message";
    }, 5000);
  }
}

/**
 * Show title input dialog
 * @param {Function} callback - Callback function with title parameter
 */
export function showTitleInputDialog(callback) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  const defaultTitle = `Meeting ${new Date().toLocaleDateString()}`;

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2>Enter Meeting Title</h2>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="meeting-title-input">Title</label>
          <input type="text" id="meeting-title-input" value="${defaultTitle}" 
                 style="width: 100%; padding: 10px 12px; background-color: var(--bg-tertiary); 
                        border: 1px solid var(--border-color); border-radius: 8px; 
                        color: var(--text-primary); font-size: 14px; font-family: inherit;">
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-title-btn">Cancel</button>
        <button class="btn btn-primary" id="confirm-title-btn">Upload</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = document.getElementById("meeting-title-input");
  const cancelBtn = document.getElementById("cancel-title-btn");
  const confirmBtn = document.getElementById("confirm-title-btn");

  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const title = input.value.trim() || defaultTitle;
      modal.remove();
      callback(title);
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      modal.remove();
      callback(null);
    }
  });

  cancelBtn.addEventListener("click", () => {
    modal.remove();
    callback(null);
  });

  confirmBtn.addEventListener("click", () => {
    const title = input.value.trim() || defaultTitle;
    modal.remove();
    callback(title);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
      callback(null);
    }
  });
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback function on confirm
 */
export function showConfirmDialog(message, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 450px;">
      <div class="modal-header">
        <h2>Confirm</h2>
      </div>
      
      <div class="modal-body">
        <p style="color: var(--text-primary); line-height: 1.6;">${message}</p>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-confirm-btn">Cancel</button>
        <button class="btn btn-primary" id="confirm-confirm-btn">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const cancelBtn = document.getElementById("cancel-confirm-btn");
  const confirmBtn = document.getElementById("confirm-confirm-btn");

  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });

  confirmBtn.addEventListener("click", () => {
    modal.remove();
    onConfirm();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  };

  document.addEventListener("keydown", escapeHandler);
}

/**
 * Display transcript in the UI
 * @param {string} transcript - Transcript text
 */
export function displayTranscript(transcript) {
  const transcriptSection = document.getElementById("transcript-section");
  const transcriptContent = document.getElementById("transcript-content");

  transcriptContent.textContent = transcript;
  transcriptSection.style.display = "block";
}
