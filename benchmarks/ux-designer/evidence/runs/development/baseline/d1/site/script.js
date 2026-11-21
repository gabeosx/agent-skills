const preview = document.querySelector('#preview');
const request = document.querySelector('[data-testid="request"]');
const form = preview.querySelector('form');
const email = document.querySelector('#email');
const emailError = document.querySelector('#email-error');
const requestFields = document.querySelector('#request-fields');
const success = document.querySelector('#success');

function setEmailError(visible) {
  emailError.hidden = !visible;
  email.setAttribute('aria-invalid', String(visible));
}

request.addEventListener('click', () => {
  form.reset();
  setEmailError(false);
  requestFields.hidden = false;
  success.hidden = true;
  preview.setAttribute('aria-labelledby', 'preview-title');
  preview.showModal();
});

preview.querySelector('[data-testid="close"]').addEventListener('click', () => preview.close());
preview.addEventListener('close', () => request.focus());

email.addEventListener('input', () => {
  if (email.validity.valid && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) setEmailError(false);
});

form.addEventListener('submit', event => {
  event.preventDefault();
  email.value = email.value.trim();
  if (!email.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    setEmailError(true);
    email.focus();
    return;
  }

  document.querySelector('#submitted-email').textContent = email.value;
  requestFields.hidden = true;
  success.hidden = false;
  preview.setAttribute('aria-labelledby', 'success-title');
  document.querySelector('#success-title').focus();
});

const art = document.querySelector('.artwork canvas');
const context = art.getContext('2d');

function drawBackground() {
  const { width, height } = art.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  art.width = Math.round(width * scale);
  art.height = Math.round(height * scale);
  context.scale(scale, scale);

  // Offset contour lines keep the bottle legible and build depth near the edges.
  context.save();
  context.translate(width * .51, height * .52);
  context.rotate(-Math.PI / 5);
  const spacing = Math.max(width, height) / 37;
  for (let line = 0; line < 33; line += 1) {
    const radius = spacing * (line + 2);
    context.beginPath();
    for (let step = 0; step <= 190; step += 1) {
      const angle = step / 190 * Math.PI * 2;
      const ripple = radius * (.14 * Math.sin(angle * 3 + line * .075) + .07 * Math.cos(angle * 5));
      const x = Math.cos(angle) * (radius + ripple);
      const y = .66 * Math.sin(angle) * (radius + ripple);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.strokeStyle = line % 5 === 0 ? '#d9d6a666' : '#d9d6a633';
    context.lineWidth = .75;
    context.stroke();
  }
  context.restore();

  // Seed the grain so the artwork stays consistent when its canvas is resized.
  let seed = 137;
  for (let i = 0; i < width * height / 8; i += 1) {
    seed = (seed * 16807) % 2147483647;
    const x = seed / 2147483647 * width;
    seed = (seed * 16807) % 2147483647;
    const y = seed / 2147483647 * height;
    context.fillStyle = i % 2 ? '#f2eeb026' : '#1b271c45';
    context.fillRect(x, y, 1, 1);
  }
}

new ResizeObserver(drawBackground).observe(art);
