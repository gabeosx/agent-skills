const differences = document.getElementById("differences");
const alder = document.getElementById("alder");
const reset = document.getElementById("reset");
const comparison = document.getElementById("comparison");
const scrollRegion = document.getElementById("table-scroll");
const scrollNote = document.getElementById("scroll-note");
const modelCount = document.getElementById("model-count");
const tableSummary = document.getElementById("table-summary");
const alderCells = comparison.querySelectorAll("[data-alder]");
const rows = Array.from(comparison.tBodies[0].rows);

function updateScrollHint() {
  const needsScroll = scrollRegion.scrollWidth > scrollRegion.clientWidth;
  scrollNote.hidden = !needsScroll;
  if (needsScroll) {
    scrollRegion.tabIndex = 0;
    scrollRegion.setAttribute("aria-describedby", scrollNote.id);
  } else {
    scrollRegion.removeAttribute("tabindex");
    scrollRegion.removeAttribute("aria-describedby");
  }
}

function updateComparison() {
  comparison.classList.toggle("two-models", !alder.checked);
  alderCells.forEach((cell) => { cell.hidden = !alder.checked; });

  let visibleRows = 0;
  rows.forEach((row) => {
    const modelValues = Array.from(row.querySelectorAll("td:not([hidden])"), (cell) => cell.textContent);
    const differs = new Set(modelValues).size > 1;
    row.hidden = differences.checked && !differs;
    if (!row.hidden) visibleRows += 1;
  });

  modelCount.textContent = alder.checked ? "3 models" : "2 models";
  tableSummary.textContent = differences.checked
    ? `Showing ${visibleRows} of ${rows.length} specifications with differences`
    : `Showing all ${rows.length} specifications`;
  updateScrollHint();
}

differences.addEventListener("change", updateComparison);
alder.addEventListener("change", () => {
  scrollRegion.scrollLeft = 0;
  updateComparison();
});
reset.addEventListener("click", () => {
  differences.checked = false;
  alder.checked = true;
  updateComparison();
  scrollRegion.scrollLeft = 0;
});
new ResizeObserver(updateScrollHint).observe(scrollRegion);
updateComparison();
