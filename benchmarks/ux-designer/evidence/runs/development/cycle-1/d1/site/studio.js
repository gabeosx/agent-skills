const dialog = document.querySelector("#preview");
const request = document.querySelector('[data-testid="request"]');
const requestContent = document.querySelector("#request-content");
const form = dialog.querySelector("form");
const email = document.querySelector("#email");
const error = document.querySelector("#work-email-error");
const success = document.querySelector("#success");

function clearError() {
  error.hidden = true;
  email.removeAttribute("aria-invalid");
  email.removeAttribute("aria-describedby");
}

request.addEventListener("click", () => {
  if (!success.hidden) {
    form.reset();
    success.hidden = true;
    requestContent.hidden = false;
    dialog.setAttribute("aria-labelledby", "preview-heading");
  }
  dialog.showModal();
  email.focus();
});

dialog.querySelector(".close").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => request.focus());

function isValidEmail() {
  return email.validity.valid && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
}

email.addEventListener("input", () => {
  if (isValidEmail()) clearError();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isValidEmail()) {
    email.setAttribute("aria-invalid", "true");
    email.setAttribute("aria-describedby", error.id);
    error.hidden = false;
    email.focus();
    return;
  }
  clearError();
  document.querySelector("#submitted-email").textContent = email.value;
  requestContent.hidden = true;
  success.hidden = false;
  dialog.setAttribute("aria-labelledby", "success-heading");
  document.querySelector("#success-heading").focus();
});

const canvas = document.querySelector("#contours");
const pen = canvas.getContext("2d");
const fullTurn = Math.PI * 2;

function drawArtwork() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = bounds.width * ratio;
  canvas.height = bounds.height * ratio;
  pen.scale(ratio * bounds.width / 600, ratio * bounds.height / 305);
  pen.lineWidth = .76;
  pen.save();
  const compact = bounds.width < 430;
  pen.translate(compact ? 340 : 321, compact ? 174 : 159);
  if (compact) pen.scale(.86, .83);
  pen.rotate(-.24);

  const pigment = pen.createLinearGradient(-275, 100, 220, -145);
  pigment.addColorStop(0, "#a0bab95c");
  pigment.addColorStop(.28, "#deb29a3f");
  pigment.addColorStop(.63, "#ffcc9d9a");
  pigment.addColorStop(.88, "#df875a97");
  pigment.addColorStop(1, "#ad6349ad");
  pen.strokeStyle = pigment;
  for (let layer = 0; layer < 39; layer += 1) {
    pen.beginPath();
    const radius = 19 + layer * 5.32;
    const scale = layer / 38;
    for (let point = 0; point <= 240; point += 1) {
      const angle = point / 240 * fullTurn;
      const folds = 1 + .21 * Math.sin(angle * 3 + scale * 2.5) + .096 * Math.cos(angle * 5 - scale * 4) + .07 * Math.sin(angle * 8 + scale * 2);
      const x = Math.cos(angle) * radius * folds + Math.sin(scale * 3) * 22;
      const y = Math.sin(angle) * radius * folds * .50 + Math.sin(scale * 6) * 13;
      if (point === 0) pen.moveTo(x, y);
      else pen.lineTo(x, y);
    }
    pen.closePath();
    pen.stroke();
  }
  pen.restore();

  for (let index = 0; index < 340; index += 1) {
    const x = (index * 211.31) % 600;
    const y = (index * 47.93) % 305;
    pen.fillStyle = index % 3 ? "#eec5b72e" : "#b0cec948";
    pen.fillRect(x, y, index % 11 ? .68 : 1.2, index % 11 ? .68 : 1.2);
  }
}

new ResizeObserver(drawArtwork).observe(canvas);
