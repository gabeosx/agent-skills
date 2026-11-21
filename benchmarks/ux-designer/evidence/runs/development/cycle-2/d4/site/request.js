const form = document.querySelector("form");
const steps = [...form.querySelectorAll(".step")];
const progress = [...document.querySelectorAll(".progress li")];
const siteName = document.querySelector("#site-name");
const email = document.querySelector("#email");
const system = document.querySelector("#system");
const notes = document.querySelector("#notes");
const back = document.querySelector('[data-testid="back"]');
const next = document.querySelector('[data-testid="next"]');
const confirm = document.querySelector('[data-testid="confirm"]');
const success = document.querySelector('[data-testid="success"]');

let currentStep = 0;

function validationMessage(field) {
  if (field === siteName && !field.value.trim()) return "Enter a site name.";
  if (field === email && !field.value) return "Enter a contact email.";
  if (field === email && field.validity.typeMismatch) return "Enter a valid email address.";
  if (field === system && !field.value) return "Select a property system.";
  return "";
}

function validate(field) {
  const error = document.querySelector(`#${field === siteName ? "site" : field.id}-error`);
  const message = validationMessage(field);
  error.textContent = message;
  error.hidden = !message;
  if (message) {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", error.id);
  } else {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }
  return !message;
}

function fillReview() {
  document.querySelector("#review-name").textContent = siteName.value.trim();
  document.querySelector("#review-email").textContent = email.value;
  document.querySelector("#review-system").textContent = system.selectedOptions[0].textContent;
  document.querySelector("#review-notes").textContent = notes.value.trim();
  document.querySelector("#review-notes-row").hidden = !notes.value.trim();
}

function showStep(index) {
  currentStep = index;
  steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
  progress.forEach((item, stepIndex) => {
    if (stepIndex === index) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
    item.classList.toggle("completed", stepIndex < index);
  });

  back.hidden = index === 0;
  next.hidden = index >= 2;
  confirm.hidden = index !== 2;
  if (index === 2) fillReview();

  if (index === 3) {
    form.hidden = true;
    success.hidden = false;
    document.querySelector("#success-site").textContent = siteName.value.trim();
    success.querySelector("h2").focus();
    return;
  }

  steps[index].querySelector("h2").focus();
}

[siteName, email, system].forEach((field) => {
  field.addEventListener("input", () => {
    if (field.getAttribute("aria-invalid") === "true") validate(field);
  });
});

back.addEventListener("click", () => showStep(currentStep - 1));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = currentStep === 0 ? [siteName, email] : currentStep === 1 ? [system] : [];
  const invalid = fields.filter((field) => !validate(field));
  if (invalid.length) {
    invalid[0].focus();
    return;
  }

  showStep(currentStep + 1);
});
