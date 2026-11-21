const poles = [
  { code: "BH-1042", address: "18 Wren Avenue", landmark: "Across from Wren Library" },
  { code: "BH-1067", address: "76 Wren Avenue", landmark: "Outside Harbor Market", report: { date: "November 18, 2026", reference: "SL-5826" } },
  { code: "BH-2014", address: "9 Mariner Lane", landmark: "Beside the east park gate" },
  { code: "BH-2079", address: "61 Mariner Lane", landmark: "At the pedestrian crossing" }
];

const search = document.querySelector("#pole-search");
const results = document.querySelector("#results");
const count = document.querySelector('[data-testid="result-count"]');
const empty = document.querySelector('[data-testid="no-results"]');
const content = document.querySelector("#report-content");
const idleTemplate = document.querySelector("#idle-template");
const formTemplate = document.querySelector("#report-form");
let selectedPole = null;
let showingConfirmation = false;

function statusMarkup(pole) {
  return pole.report
    ? '<span class="status notice">Crew notified</span>'
    : '<span class="status">Available to report</span>';
}

const rows = poles.map(pole => {
  const row = document.createElement("li");
  row.innerHTML = `
    <button type="button" class="pole" data-testid="pole-${pole.code}" aria-pressed="false">
      <span class="pole-code">${pole.code}</span>
      <span class="pole-location">
        <span class="pole-address">${pole.address}</span>
        <span class="landmark">${pole.landmark}</span>
      </span>
      ${statusMarkup(pole)}
      <span class="chevron" aria-hidden="true"></span>
    </button>`;
  row.firstElementChild.addEventListener("click", () => choosePole(pole));
  results.append(row);
  return { row, pole };
});

function filterPoles() {
  const query = search.value.trim().toLowerCase();
  let matches = 0;
  for (const { row, pole } of rows) {
    const fields = [pole.code, pole.address, pole.landmark];
    const match = fields.some(field => field.toLowerCase().includes(query));
    row.hidden = !match;
    if (match) matches += 1;
  }
  count.textContent = `${matches} streetlight${matches === 1 ? "" : "s"} found`;
  empty.hidden = matches > 0;
}

function updateSelection() {
  for (const { row, pole } of rows) {
    row.firstElementChild.setAttribute("aria-pressed", String(selectedPole === pole));
  }
}

function choosePole(pole) {
  if (showingConfirmation || selectedPole === pole) return;
  selectedPole = pole;
  updateSelection();
  const detail = document.createElement("div");
  detail.className = "detail";
  detail.dataset.testid = "pole-detail";
  detail.innerHTML = `
    <div class="detail-header">
      <span class="pole-code">${pole.code}</span>
      ${statusMarkup(pole)}
    </div>
    <h3 tabindex="-1">${pole.address}</h3>
    <p class="landmark">${pole.landmark}</p>`;

  if (pole.report) {
    detail.insertAdjacentHTML("beforeend", `
      <dl class="existing">
        <div><dt>Logged</dt><dd>${pole.report.date}</dd></div>
        <div><dt>Reference</dt><dd>${pole.report.reference}</dd></div>
      </dl>`);
  } else {
    detail.append(formTemplate.content.cloneNode(true));
    detail.querySelector("form").addEventListener("submit", event => {
      event.preventDefault();
      const issue = detail.querySelector("select").selectedOptions[0].textContent;
      showConfirmation(pole, issue);
    });
  }

  content.replaceChildren(detail);
  detail.querySelector("h3").focus({ preventScroll: !matchMedia("(max-width: 680px)").matches });
}

function showConfirmation(pole, issue) {
  showingConfirmation = true;
  const acknowledgment = document.createElement("div");
  acknowledgment.className = "confirmation";
  acknowledgment.dataset.testid = "confirmation";
  acknowledgment.innerHTML = `
    <span class="confirm-check" aria-hidden="true">✓</span>
    <h3 tabindex="-1">Report submitted</h3>
    <dl class="confirm-data">
      <div><dt>Reference</dt><dd><strong>SL-5842</strong></dd></div>
      <div><dt>Pole</dt><dd>${pole.code}</dd></div>
      <div><dt>Issue</dt><dd>${issue}</dd></div>
    </dl>
    <button type="button" class="primary" data-testid="report-another">Report another light <span aria-hidden="true">→</span></button>`;
  acknowledgment.querySelector("button").addEventListener("click", () => reset(true));
  content.replaceChildren(acknowledgment);
  acknowledgment.querySelector("h3").focus();
}

function reset(focusSearch = false) {
  selectedPole = null;
  showingConfirmation = false;
  search.value = "";
  updateSelection();
  filterPoles();
  content.replaceChildren(idleTemplate.content.cloneNode(true));
  if (focusSearch) search.focus();
}

search.addEventListener("input", filterPoles);
reset();
