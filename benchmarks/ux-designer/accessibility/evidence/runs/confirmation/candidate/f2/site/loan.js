const optionButtons = Array.from(document.querySelectorAll("[data-choice]"));
const currentChoice = document.querySelector('[data-testid="loan-current-choice"]');
const form = document.querySelector("#record-form");
const note = document.querySelector("#registrar-note");
const noteRule = document.querySelector("#note-rule");
const noteError = document.querySelector("#note-error");
const receipt = document.querySelector("#receipt");
const confirmation = document.querySelector('[data-testid="loan-confirmation"]');
const recordedNoteGroup = document.querySelector("#recorded-note-group");
const recordedNote = document.querySelector('[data-testid="loan-recorded-note"]');

const messages = {
  approve: "Installation approved",
  update: "Condition update requested",
  hold: "Loan placed on hold"
};

let selected = optionButtons[0];

function clearError() {
  noteError.hidden = true;
  note.removeAttribute("aria-invalid");
  note.setAttribute("aria-describedby", "note-rule");
}

optionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (selected === button) return;
    selected.setAttribute("aria-pressed", "false");
    selected = button;
    selected.setAttribute("aria-pressed", "true");
    currentChoice.textContent = selected.querySelector(".option-title").textContent;
    note.required = selected.dataset.choice !== "approve";
    noteRule.textContent = note.required ? "Required for this decision" : "Optional for this decision";
    clearError();
    receipt.hidden = true;
  });
});

note.addEventListener("input", () => {
  if (note.value.trim()) clearError();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = note.value.trim();
  if (note.required && !value) {
    receipt.hidden = true;
    noteError.hidden = false;
    note.setAttribute("aria-invalid", "true");
    note.setAttribute("aria-describedby", "note-rule note-error");
    note.focus();
    return;
  }

  clearError();
  confirmation.textContent = messages[selected.dataset.choice];
  recordedNote.textContent = value;
  recordedNoteGroup.hidden = !value;
  receipt.hidden = false;
});
