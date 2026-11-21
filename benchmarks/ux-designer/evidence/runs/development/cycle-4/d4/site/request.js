const siteStep = document.getElementById("site-step");
const inspectionStep = document.getElementById("inspection-step");
const reviewStep = document.getElementById("review-step");
const successStep = document.getElementById("success-step");
const panels = [siteStep, inspectionStep, reviewStep, successStep];
const progressSteps = Array.from(document.querySelectorAll("#steps li"));
const site = document.getElementById("site-name");
const email = document.getElementById("email");
const system = document.getElementById("system");
const notes = document.getElementById("notes");
const siteError = document.getElementById("site-error");
const emailError = document.getElementById("email-error");
const systemError = document.getElementById("system-error");

function showStep(activeStep) {
  panels.forEach((panel, index) => {
    const isActive = index === activeStep;
    panel.hidden = !isActive;
    for (const action of ["next", "back"]) {
      const button = panel.querySelector(`.step-${action}`);
      if (isActive) {
        button?.setAttribute("data-testid", action);
      } else {
        button?.removeAttribute("data-testid");
      }
    }
  });
  progressSteps.forEach((step, index) => {
    const completed = index < activeStep;
    step.classList.toggle("complete", completed);
    step.querySelector(".step-marker").textContent = completed ? "✓" : index + 1;
    step.querySelector(".step-status").textContent = completed ? "Completed: " : "";
    if (index === activeStep) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }
  });
  document.getElementById(panels[activeStep].getAttribute("aria-labelledby")).focus();
}

function updateError(field, error, message) {
  if (message) {
    error.textContent = message;
    error.hidden = false;
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", error.id);
  } else {
    error.hidden = true;
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }
}

function validateSite() {
  const message = site.value.trim() ? "" : "Enter the site name.";
  updateError(site, siteError, message);
  return !message;
}

function validateEmail() {
  let message = "";
  if (email.validity.valueMissing) {
    message = "Enter the contact email.";
  } else if (email.validity.typeMismatch) {
    message = "Enter an email address in the format name@example.com.";
  }
  updateError(email, emailError, message);
  return !message;
}

function validateSystem() {
  const message = system.value ? "" : "Choose a property system.";
  updateError(system, systemError, message);
  return !message;
}

siteStep.addEventListener("submit", (event) => {
  event.preventDefault();
  const siteValid = validateSite();
  const emailValid = validateEmail();
  if (!siteValid) {
    site.focus();
  } else if (!emailValid) {
    email.focus();
  } else {
    showStep(1);
  }
});

site.addEventListener("input", () => {
  if (!siteError.hidden) validateSite();
});
email.addEventListener("input", () => {
  if (!emailError.hidden) validateEmail();
});
system.addEventListener("change", () => {
  if (!systemError.hidden) validateSystem();
});

inspectionStep.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateSystem()) {
    system.focus();
    return;
  }

  document.getElementById("review-site").textContent = site.value.trim();
  document.getElementById("review-email").textContent = email.value;
  document.getElementById("review-system").textContent = system.selectedOptions[0].textContent;
  document.getElementById("review-notes").textContent = notes.value.trim();
  document.getElementById("review-notes-row").hidden = !notes.value.trim();
  showStep(2);
});

inspectionStep.querySelector(".step-back").addEventListener("click", () => showStep(0));
reviewStep.querySelector(".step-back").addEventListener("click", () => showStep(1));
document.querySelector("[data-testid=confirm]").addEventListener("click", () => {
  const systemName = system.selectedOptions[0].textContent;
  document.getElementById("success-description").textContent = `Your ${systemName} inspection request for ${site.value.trim()} was recorded.`;
  showStep(3);
});
