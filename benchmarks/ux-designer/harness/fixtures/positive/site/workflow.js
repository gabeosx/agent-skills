const initial = document.querySelector('[data-testid=initial-state]');
const form = document.querySelector('form');
const notes = document.querySelector('[data-testid=notes]');
const status = document.querySelector('[data-testid=saved]');
const toggle = document.querySelector('[data-testid=toggle]');
const help = document.getElementById('help');
const currentNote = localStorage.getItem('fixture-note');
const sessionValue = sessionStorage.getItem('fixture-session');
const cookie = document.cookie.includes('fixture-cookie=');

function addNote(text) {
  const item = document.createElement('li');
  item.dataset.testid = 'item';
  item.textContent = text;
  notes.append(item);
}

initial.textContent = currentNote
  ? `Restored from local storage: ${currentNote}. Session: ${sessionValue}. Cookie: ${cookie}.`
  : `No saved note. Session: ${sessionValue}. Cookie: ${cookie}.`;
if (currentNote) addNote(currentNote);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = `${document.getElementById('note').value} (${document.getElementById('priority').value})`;
  localStorage.setItem('fixture-note', text);
  sessionStorage.setItem('fixture-session', 'kept');
  document.cookie = 'fixture-cookie=present; SameSite=Strict';
  addNote(text);
  status.textContent = `Saved ${text}`;
  status.hidden = false;
  form.reset();
});

toggle.addEventListener('click', () => {
  help.hidden = !help.hidden;
  toggle.setAttribute('aria-expanded', String(!help.hidden));
});

// A reserved external host makes the network gate observable with no dependency.
fetch('https://benchmark-fixture.invalid/probe').catch(() => {});
