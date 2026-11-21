const versions = {
  v3: { number: 3, meta: "Current proof · November 19, 2026" },
  v2: { number: 2, meta: "Earlier proof · November 17, 2026" }
};

const notes = [
  { id: 1, title: "Leaf contrast", author: "Inez Park", message: "Check the leaf against the orange field on matte stock.", replies: [] },
  { id: 2, title: "Net weight", author: "Devin Cole", message: "Keep the revised 60 g line centered under DRIED SLICES.", replies: [] }
];

const find = testId => document.querySelector(`[data-testid="${testId}"]`);
const versionSelect = find("version-select");
const versionMeta = find("version-meta");
const proofImage = find("proof-image");
const toggle = find("pins-toggle");
const notesCount = document.querySelector("#notes-count");
const noteList = document.querySelector("#note-list");
const emptyNotes = find("notes-empty");
const thread = find("active-note");
const threadTitle = document.querySelector("#thread-title");
const replies = document.querySelector("#replies");
const replyForm = document.querySelector("#reply-form");
const replyInput = find("reply-input");
const postReply = find("post-reply");
const reviewActions = document.querySelector("#review-actions");
const reviewStatus = find("review-status");
const approve = find("approve-proof");
const approvalDialog = find("approval-dialog");
const back = find("back-to-notes");
const noteControls = notes.map(note => ({ note, pin: find(`pin-${note.id}`), row: find(`note-${note.id}`) }));

let activeNote = null;
let pinsVisible = true;
let approved = false;
let version = "v3";

function updateControls() {
  const isCurrent = version === "v3";
  toggle.setAttribute("aria-pressed", String(pinsVisible));
  noteList.hidden = !isCurrent;
  notesCount.hidden = !isCurrent;
  emptyNotes.hidden = isCurrent;
  reviewActions.hidden = !isCurrent || approved;
  for (const { note, pin, row } of noteControls) {
    const selected = activeNote === note;
    pin.hidden = !isCurrent || !pinsVisible;
    pin.setAttribute("aria-pressed", String(selected));
    row.setAttribute("aria-pressed", String(selected));
  }
}

function switchVersion() {
  version = versionSelect.value;
  const proof = versions[version];
  proofImage.src = `artwork/proof-${version}.svg`;
  proofImage.alt = `Blood Orange pouch, Version ${proof.number}`;
  versionMeta.textContent = proof.meta;
  if (approvalDialog.open) approvalDialog.close();
  closeThread();
}

function resetReply() {
  replyInput.value = "";
  postReply.disabled = true;
}

function renderReplies() {
  const comments = activeNote.replies.map(reply => {
    const comment = document.createElement("div");
    const author = document.createElement("p");
    const message = document.createElement("p");
    comment.className = "comment";
    author.className = "comment-author";
    author.textContent = "You";
    message.textContent = reply;
    comment.append(author, message);
    return comment;
  });
  replies.replaceChildren(...comments);
}

function openThread(note, viaPin) {
  if (activeNote !== note) {
    activeNote = note;
    threadTitle.textContent = note.title;
    document.querySelector("#thread-author").textContent = note.author;
    document.querySelector("#thread-message").textContent = note.message;
    resetReply();
    renderReplies();
    updateControls();
  }
  thread.hidden = false;
  if (viaPin && matchMedia("(max-width: 720px)").matches) {
    thread.scrollIntoView({ block: "start" });
  }
  threadTitle.focus({ preventScroll: viaPin && matchMedia("(max-width: 720px)").matches });
}

function closeThread(returnFocus = false) {
  const previous = activeNote;
  activeNote = null;
  thread.hidden = true;
  resetReply();
  updateControls();
  if (returnFocus && previous) find(`note-${previous.id}`).focus();
}

versionSelect.addEventListener("change", switchVersion);

toggle.addEventListener("click", () => {
  pinsVisible = !pinsVisible;
  updateControls();
});

for (const { note, pin, row } of noteControls) {
  pin.addEventListener("click", () => openThread(note, true));
  row.addEventListener("click", () => openThread(note, false));
}

back.addEventListener("click", () => closeThread(true));

replyInput.addEventListener("input", () => {
  postReply.disabled = !replyInput.value.trim();
});

replyForm.addEventListener("submit", event => {
  event.preventDefault();
  const reply = replyInput.value.trim();
  if (!activeNote || !reply) return;
  activeNote.replies.push(reply);
  renderReplies();
  resetReply();
  replyInput.focus();
});

approve.addEventListener("click", () => {
  approvalDialog.returnValue = "";
  approvalDialog.showModal();
});

approvalDialog.addEventListener("close", () => {
  if (approvalDialog.returnValue !== "confirm" || version !== "v3") return;
  approved = true;
  reviewStatus.textContent = "Approved";
  reviewStatus.classList.add("is-approved");
  updateControls();
  reviewStatus.focus();
});

updateControls();
