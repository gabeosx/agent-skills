const form = document.querySelector('.request-form');
const card = document.querySelector('.request-card');
const panels = Array.from(form.querySelectorAll('.step-panel'));
const steps = Array.from(document.querySelectorAll('.step-list li'));
const next = document.querySelector('[data-testid="next"]');
const back = document.querySelector('[data-testid="back"]');
const confirmRequest = document.querySelector('[data-testid="confirm"]');
const success = document.querySelector('[data-testid="success"]');
const siteName = document.querySelector('#site-name');
const email = document.querySelector('#email');
const system = document.querySelector('#system');
const notes = document.querySelector('#notes');
let currentStep = 0;

const fields = [
  {
    control: siteName,
    error: document.querySelector('#site-error'),
    message: () => siteName.value.trim() ? '' : 'Enter the site name.'
  },
  {
    control: email,
    error: document.querySelector('#email-error'),
    hintId: 'email-hint',
    message: () => {
      if (!email.value.trim()) return 'Enter a contact email address.';
      return email.validity.typeMismatch ? 'Enter a valid email address, such as name@example.com.' : '';
    }
  },
  {
    control: system,
    error: document.querySelector('#system-error'),
    message: () => system.value ? '' : 'Select a property system.'
  }
];

function validateField({ control, error, hintId, message }) {
  const errorMessage = message();
  error.textContent = errorMessage;
  error.hidden = !errorMessage;
  control.setAttribute('aria-invalid', String(Boolean(errorMessage)));
  const descriptions = [errorMessage && error.id, hintId].filter(Boolean);
  if (descriptions.length) {
    control.setAttribute('aria-describedby', descriptions.join(' '));
  } else {
    control.removeAttribute('aria-describedby');
  }
  return !errorMessage;
}

for (const field of fields) {
  field.control.addEventListener('input', () => {
    if (!field.error.hidden) validateField(field);
  });
}

function updateReview() {
  document.querySelector('#review-site').textContent = siteName.value.trim();
  document.querySelector('#review-email').textContent = email.value.trim();
  document.querySelector('#review-system').textContent = system.selectedOptions[0].textContent;
  const accessNotes = notes.value.trim();
  document.querySelector('#review-notes').textContent = accessNotes;
  document.querySelector('#review-notes-row').hidden = !accessNotes;
}

function showStep(step) {
  currentStep = step;

  panels.forEach((panel, index) => {
    panel.hidden = index !== step;
  });

  steps.forEach((item, index) => {
    if (index === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    item.classList.toggle('complete', index < step);
  });

  next.hidden = step === 2;
  back.hidden = step === 0;
  confirmRequest.hidden = step !== 2;
  if (step === 2) updateReview();
  panels[step].querySelector('h2').focus();
}

function showSuccess() {
  card.classList.add('request-complete');
  document.querySelector('.progress').hidden = true;
  form.hidden = true;
  success.hidden = false;
  success.querySelector('h2').focus();
}

back.addEventListener('click', () => showStep(currentStep - 1));

form.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentStep === 2) {
    showSuccess();
    return;
  }

  const activeFields = currentStep === 0 ? fields.slice(0, 2) : fields.slice(2);
  const invalidFields = activeFields.filter((field) => !validateField(field));
  if (invalidFields.length) {
    invalidFields[0].control.focus();
    return;
  }

  showStep(currentStep + 1);
});
