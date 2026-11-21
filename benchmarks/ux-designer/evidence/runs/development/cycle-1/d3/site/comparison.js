const differences = document.querySelector('#differences');
const alder = document.querySelector('#alder');
const comparison = document.querySelector('[data-testid="comparison"]');
const rows = Array.from(comparison.tBodies[0].rows);
const alderCells = comparison.querySelectorAll('[data-alder]');
const region = comparison.parentElement;
const count = document.querySelector('#comparison-count');
const scrollHint = document.querySelector('#scroll-hint');
const reset = document.querySelector('[data-testid="reset"]');

function updateComparison() {
  const showAlder = alder.checked;
  const modelCount = showAlder ? 3 : 2;
  let rowCount = 0;

  for (const cell of alderCells) {
    cell.hidden = !showAlder;
  }

  for (const row of rows) {
    const values = Array.from(row.querySelectorAll('td:not([hidden])'), cell => cell.textContent.trim());
    row.hidden = differences.checked && new Set(values).size === 1;
    if (!row.hidden) rowCount++;
  }

  region.dataset.models = modelCount;
  count.textContent = `${modelCount} models · ${rowCount} specifications`;
  scrollHint.hidden = !showAlder;
}

differences.addEventListener('change', updateComparison);
alder.addEventListener('change', updateComparison);
reset.addEventListener('click', () => {
  differences.checked = false;
  alder.checked = true;
  updateComparison();
  region.scrollLeft = 0;
});

updateComparison();
