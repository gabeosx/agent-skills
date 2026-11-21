const filter = document.querySelector('[data-testid="late-only"]');
const stops = [...document.querySelectorAll('.stop')];
const scope = document.querySelector('#scope');
const reviewAnnouncement = document.querySelector('#review-announcement');

filter.addEventListener('click', () => {
  const lateOnly = filter.getAttribute('aria-pressed') !== 'true';
  filter.setAttribute('aria-pressed', lateOnly);
  for (const stop of stops) {
    stop.hidden = lateOnly && stop.dataset.late === 'false';
  }
  scope.textContent = lateOnly ? 'Showing 2 late stops' : '3 stops · 2 late';
});

for (const stop of stops) {
  const acknowledge = stop.querySelector('.acknowledge');
  const reviewState = stop.querySelector('.review-state');

  acknowledge.addEventListener('click', (event) => {
    stop.classList.add('is-reviewed');
    reviewState.textContent = 'Reviewed';
    acknowledge.disabled = true;
    if (event.detail === 0) {
      reviewState.focus();
      return;
    }
    reviewAnnouncement.textContent = `${stop.querySelector('h3').textContent} reviewed.`;
  });
}
