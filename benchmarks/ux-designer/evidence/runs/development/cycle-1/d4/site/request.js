const form = document.querySelector('#request');
const steps = Array.from(form.querySelectorAll('.form-step'));
const progress = Array.from(document.querySelectorAll('.progress li'));
const site = document.querySelector('#site-name');
const email = document.querySelector('#email');
const system = document.querySelector('#system');
const notes = document.querySelector('#notes');
const back = form.querySelector('[data-testid="back"]');
const next = form.querySelector('[data-testid="next"]');
const confirm = form.querySelector('[data-testid="confirm"]');
const success = document.querySelector('[data-testid="success"]');

let currentStep = 0;

function setError(field, message) {
  const error = document.querySelector(`#${field.id}-error`);
  if (message) {
    error.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', error.id);
  } else {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }
  error.hidden = !message;
}

function validateSite() {
  const missingSite = !site.value.trim();
  const missingEmail = !email.value.trim();
  const emailError = missingEmail ? 'Enter a contact email.' : 'Enter a valid email address.';
  const invalidEmail = missingEmail || !email.validity.valid;

  setError(site, missingSite ? 'Enter a site name.' : '');
  setError(email, invalidEmail ? emailError : '');

  const invalidField = missingSite ? site : invalidEmail ? email : null;
  invalidField?.focus();
  return !invalidField;
}

function validateInspection() {
  setError(system, system.value ? '' : 'Select a property system.');
  if (!system.value) system.focus();
  return Boolean(system.value);
}

function updateReview() {
  document.querySelector('#review-site').textContent = site.value.trim();
  document.querySelector('#review-email').textContent = email.value.trim();
  document.querySelector('#review-system').textContent = system.selectedOptions[0].textContent;
  document.querySelector('#review-notes').textContent = notes.value.trim();
  document.querySelector('#review-notes-row').hidden = !notes.value.trim();
}

function updateProgress() {
  progress.forEach((item, index) => {
    const marker = item.querySelector('.step-number');
    const complete = index < currentStep;
    item.toggleAttribute('data-complete', complete);
    marker.textContent = complete ? '✓' : index + 1;
    if (index === currentStep) {
      item.setAttribute('aria-current', 'step');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

function showStep(step) {
  currentStep = step;
  const reviewing = step === 2;
  if (reviewing) updateReview();

  steps.forEach((panel, index) => {
    panel.hidden = index !== step;
  });
  back.hidden = step === 0;
  next.hidden = reviewing;
  confirm.hidden = !reviewing;
  updateProgress();
  steps[step].querySelector('h2').focus();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (currentStep === 0 && validateSite()) {
    showStep(1);
  } else if (currentStep === 1 && validateInspection()) {
    showStep(2);
  } else if (currentStep === 2) {
    currentStep = 3;
    updateProgress();
    form.hidden = true;
    success.hidden = false;
    success.querySelector('h2').focus();
  }
});

back.addEventListener('click', () => showStep(currentStep - 1));

site.addEventListener('input', () => {
  if (site.value.trim()) setError(site, '');
});
email.addEventListener('input', () => {
  if (email.value && email.validity.valid) setError(email, '');
});
system.addEventListener('change', () => {
  if (system.value) setError(system, '');
});
