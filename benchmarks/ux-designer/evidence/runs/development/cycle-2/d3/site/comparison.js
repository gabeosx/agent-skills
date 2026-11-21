const panel = document.querySelector(".comparison-panel");
const differences = document.querySelector('[data-testid="differences"]');
const alder = document.querySelector('[data-testid="alder"]');
const reset = document.querySelector('[data-testid="reset"]');
const summary = document.querySelector("#summary");
const rows = [...document.querySelectorAll("tbody tr")];
const alderCells = document.querySelectorAll('[data-model="alder"]');
const tableScroll = document.querySelector(".table-scroll");

function updateComparison() {
  const hideAlder = alder.checked;
  panel.classList.toggle("two-models", hideAlder);
  alderCells.forEach((cell) => { cell.hidden = hideAlder; });

  const visibleRows = rows.filter((row) => {
    const values = [...row.querySelectorAll("td:not([hidden])")].map((cell) => cell.textContent);
    row.hidden = differences.checked && new Set(values).size === 1;
    row.classList.remove("last-visible");
    return !row.hidden;
  });

  visibleRows.at(-1)?.classList.add("last-visible");
  summary.firstChild.textContent = `${hideAlder ? 2 : 3} models `;
  summary.lastChild.textContent = ` ${visibleRows.length} specifications`;
}

differences.addEventListener("change", updateComparison);
alder.addEventListener("change", () => {
  tableScroll.scrollLeft = 0;
  updateComparison();
});
reset.addEventListener("click", () => {
  differences.checked = false;
  alder.checked = false;
  tableScroll.scrollLeft = 0;
  updateComparison();
});

updateComparison();
