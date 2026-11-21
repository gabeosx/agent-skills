const filter = document.querySelector('[data-testid="late-only"]');
const filterStatus = document.querySelector('#filter-status');
const stops = Array.from(document.querySelectorAll('#stops .stop'));

filter.addEventListener('click', () => {
  const lateOnly = filter.getAttribute('aria-pressed') === 'false';
  filter.setAttribute('aria-pressed', String(lateOnly));

  let visibleCount = 0;
  for (const stop of stops) {
    stop.hidden = lateOnly && stop.dataset.late !== 'true';
    if (!stop.hidden) visibleCount++;
  }

  const noun = visibleCount === 1 ? 'stop' : 'stops';
  if (visibleCount === 0) {
    filterStatus.textContent = lateOnly ? 'No late stops' : 'No scheduled stops';
  } else if (lateOnly) {
    filterStatus.textContent = `Showing ${visibleCount} late ${noun}`;
  } else {
    filterStatus.textContent = `Showing all ${visibleCount} ${noun}`;
  }
});

for (const stop of stops) {
  const button = stop.querySelector('.acknowledge');
  const state = stop.querySelector('[data-review-state]');

  button.addEventListener('click', () => {
    stop.dataset.reviewed = 'true';
    state.textContent = 'Reviewed';
    button.disabled = true;
  });
}
