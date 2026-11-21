const decisions = [
  { requiresNote: false, confirmation: 'Installation approved' },
  { requiresNote: true, confirmation: 'Condition update requested' },
  { requiresNote: true, confirmation: 'Loan placed on hold' },
];

const options = Array.from(document.querySelectorAll('.option'));
const currentChoice = document.querySelector('.current-choice');
const form = document.querySelector('.record-form');
const note = document.getElementById('registrar-note');
const noteRule = document.getElementById('note-rule');
const noteError = document.getElementById('note-error');
const receipt = document.querySelector('.receipt');
const confirmation = document.querySelector('.confirmation');
const recorded = document.querySelector('.recorded');
const recordedNote = document.querySelector('.recorded-note');

let selectedIndex = 0;

function showNoteError(show) {
  noteError.hidden = !show;
  note.setAttribute('aria-describedby', show ? 'note-rule note-error' : 'note-rule');

  if (show) {
    note.setAttribute('aria-invalid', 'true');
  } else {
    note.removeAttribute('aria-invalid');
  }
}

for (const [index, option] of options.entries()) {
  option.addEventListener('click', () => {
    if (selectedIndex === index) return;

    selectedIndex = index;
    for (const decisionButton of options) {
      decisionButton.setAttribute('aria-pressed', String(decisionButton === option));
    }

    const { requiresNote } = decisions[index];
    currentChoice.textContent = option.querySelector('.choice-title').textContent;
    note.required = requiresNote;
    noteRule.textContent = requiresNote ? 'Required' : 'Optional';
    noteRule.classList.toggle('is-required', requiresNote);
    showNoteError(false);
    receipt.hidden = true;
  });
}

note.addEventListener('input', () => {
  if (!noteError.hidden && note.value.trim()) showNoteError(false);
});

form.addEventListener('submit', event => {
  event.preventDefault();

  const decision = decisions[selectedIndex];
  const noteText = note.value.trim();
  if (decision.requiresNote && !noteText) {
    receipt.hidden = true;
    showNoteError(true);
    note.focus();
    return;
  }

  showNoteError(false);
  confirmation.textContent = decision.confirmation;
  recordedNote.textContent = noteText;
  recorded.hidden = !noteText;
  receipt.hidden = false;
});
