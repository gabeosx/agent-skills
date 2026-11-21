const differences = document.querySelector('[data-testid="differences"]');
const alder = document.querySelector('[data-testid="alder"]');
const reset = document.querySelector('[data-testid="reset"]');
const table = document.querySelector('[data-testid="comparison"]');
const scroller = document.querySelector('.table-scroll');
const scrollHint = document.querySelector('#scroll-hint');
const status = document.querySelector('#comparison-status');
const rows = Array.from(table.tBodies[0].rows);
const alderCells = table.querySelectorAll('[data-alder]');

function updateScrollHint() {
  const overflows = scroller.scrollWidth > scroller.clientWidth;
  scrollHint.hidden = !overflows;
  scroller.tabIndex = overflows ? 0 : -1;
}

function updateComparison() {
  const hideAlder = alder.checked;
  table.classList.toggle('two-models', hideAlder);

  for (const cell of alderCells) {
    cell.hidden = hideAlder;
  }

  let visibleRows = 0;
  for (const row of rows) {
    const modelCells = Array.from(row.querySelectorAll('td:not([hidden])'));
    const values = new Set(modelCells.map((cell) => cell.textContent.trim()));
    row.hidden = differences.checked && values.size < 2;
    if (!row.hidden) visibleRows++;
  }

  const qualifier = differences.checked ? 'differing specifications' : 'specifications';
  status.textContent = `${hideAlder ? 2 : 3} models · ${visibleRows} ${qualifier}`;
  updateScrollHint();
}

differences.addEventListener('change', updateComparison);
alder.addEventListener('change', () => {
  scroller.scrollLeft = 0;
  updateComparison();
});
reset.addEventListener('click', () => {
  differences.checked = false;
  alder.checked = false;
  scroller.scrollLeft = 0;
  updateComparison();
});

new ResizeObserver(updateScrollHint).observe(scroller);
updateComparison();
