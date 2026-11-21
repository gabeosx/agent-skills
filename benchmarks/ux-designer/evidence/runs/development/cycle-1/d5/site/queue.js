const filter = document.querySelector('[data-testid="late-only"]');
const stops = [...document.querySelectorAll('.stop')];
const results = document.getElementById('results');

filter.addEventListener('click', () => {
  const lateOnly = filter.getAttribute('aria-pressed') !== 'true';
  filter.setAttribute('aria-pressed', lateOnly);

  for (const stop of stops) {
    stop.hidden = lateOnly && stop.dataset.late === 'false';
  }

  const visibleStops = stops.filter(stop => !stop.hidden).length;
  results.textContent = lateOnly
    ? `Showing ${visibleStops} late stops`
    : `Showing all ${visibleStops} stops`;
});

for (const stop of stops) {
  const button = stop.querySelector('.review');
  const status = stop.querySelector('.review-state');

  button.addEventListener('click', () => {
    status.textContent = 'Reviewed';
    stop.dataset.reviewed = 'true';
    button.disabled = true;
  });
}
