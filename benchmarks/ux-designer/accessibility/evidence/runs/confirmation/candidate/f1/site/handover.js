const handoverNotes = {
  "T-214": {
    crew: "Wayside team",
    next: "Check the signal lamp during the next service gap."
  },
  "T-219": {
    crew: "Passenger information team",
    next: "Confirm the replacement display cycles through all destinations."
  },
  "T-224": {
    crew: "Fleet maintenance team",
    next: "Review the door sensor history before releasing the tram."
  }
};

const reportButtons = Array.from(document.querySelectorAll("[data-report]"));
const detailNumber = document.querySelector('[data-testid="handover-detail-id"]');
const detailLocation = document.querySelector('[data-testid="handover-detail-location"]');
const detailCrew = document.querySelector('[data-testid="handover-detail-crew"]');
const detailNext = document.querySelector('[data-testid="handover-detail-next"]');
let selectedReport = reportButtons[0];

reportButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (selectedReport === button) return;

    selectedReport.setAttribute("aria-pressed", "false");
    selectedReport = button;
    selectedReport.setAttribute("aria-pressed", "true");

    const reportId = selectedReport.dataset.report;
    const notes = handoverNotes[reportId];
    detailNumber.textContent = reportId;
    detailLocation.textContent = selectedReport.querySelector(".report-location").textContent;
    detailCrew.textContent = notes.crew;
    detailNext.textContent = notes.next;
  });
});
