/**
 * Navigation Management
 * Handles view switching and navigation logic
 */

import { loadMeetings } from "./meetings.js";
import { loadRecordings } from "./recordings.js";
import { updateCurrentModelIndicator } from "./recording.js";

/**
 * Setup navigation event listeners
 */
export function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const viewId = item.dataset.view;

      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      views.forEach((view) => view.classList.remove("active"));
      document.getElementById(`${viewId}-view`).classList.add("active");

      if (viewId === "summaries") {
        loadMeetings();
      } else if (viewId === "recordings") {
        loadRecordings();
      } else if (viewId === "record") {
        updateCurrentModelIndicator();
      }
    });
  });
}
