const reporting = {
  "30": { sales: "$1.28M", margin: "24.8%", stockout: "3.1%" },
  "7": { sales: "$318K", margin: "22.4%", stockout: "4.2%" },
};

const departments = [
  { name: "Produce", status: "Investigate", tone: "investigate", "30": ["$405K", "20.2%"], "7": ["$95K", "18.1%"] },
  { name: "Grocery", status: "On track", tone: "on-track", "30": ["$532K", "28.1%"], "7": ["$130K", "27.0%"] },
  { name: "Frozen", status: "Watch", tone: "watch", "30": ["$204K", "25.2%"], "7": ["$54K", "22.3%"] },
  { name: "Bakery", status: "Investigate", tone: "investigate", "30": ["$139K", "25.1%"], "7": ["$39K", "19.4%"] },
];

const weeklyMargins = [25.1, 26.0, 25.7, 24.9, 24.3, 23.8, 22.4];
const hook = (name) => document.querySelector(`[data-testid="${name}"]`);
const period = hook("period");
const status = hook("status");
const rows = hook("rows");
const detail = hook("detail");
const trend = document.querySelector(".trend");
const chart = document.querySelector("#chart");
const pen = chart.getContext("2d");

const weeks = document.querySelector("#weeks");
weeklyMargins.forEach((value, index) => {
  const week = document.createElement("li");
  const label = document.createElement("span");
  label.textContent = index === weeklyMargins.length - 1 ? "Latest" : `Week ${index + 1}`;
  const margin = document.createElement("span");
  margin.className = "week-value";
  margin.textContent = `${value.toFixed(1)}%`;
  week.append(label, margin);
  weeks.append(week);
});

function renderRows() {
  const visibleDepartments = departments.filter((department) => status.value === "all" || department.tone === status.value);
  rows.replaceChildren();
  for (const department of visibleDepartments) {
    const row = document.createElement("tr");
    const name = document.createElement("th");
    name.scope = "row";
    name.textContent = department.name;
    if (department.name === "Produce") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "row-action";
      button.dataset.testid = "produce";
      button.setAttribute("aria-haspopup", "dialog");
      button.innerHTML = 'Produce <span aria-hidden="true">↗</span>';
      button.addEventListener("click", showDetail);
      name.replaceChildren(button);
    }
    row.append(name);
    department[period.value].forEach((amount, index) => {
      const cell = row.insertCell();
      if (index === 0) cell.className = "sales-col";
      cell.textContent = amount;
    });
    const badge = document.createElement("span");
    badge.className = `status-pill ${department.tone}`;
    badge.append(document.createElement("i"), department.status);
    row.insertCell().append(badge);
    rows.append(row);
  }
  document.querySelector("#row-count").textContent = `${visibleDepartments.length} departments`;
}

function renderPeriod() {
  const selected = reporting[period.value];
  hook("revenue").textContent = selected.sales;
  hook("margin").textContent = selected.margin;
  document.querySelector("#stockout").textContent = selected.stockout;
  trend.dataset.period = period.value;
  document.querySelector("#chart-scope").textContent = period.value === "7" ? "Latest week in context" : "Seven reported weeks";
  renderRows();
  drawChart();
}

function showDetail() {
  const produce = departments[0];
  document.querySelector("#detail-margin-label").textContent = `${period.value}-day gross margin`;
  document.querySelector("#detail-margin-value").textContent = produce[period.value][1];
  detail.showModal();
  document.querySelector("#detail-heading").focus();
}

hook("detail-close").addEventListener("click", () => detail.close());
detail.addEventListener("close", () => hook("produce")?.focus());
period.addEventListener("change", renderPeriod);
status.addEventListener("change", renderRows);

function drawChart() {
  const { width, height } = chart.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  chart.width = width * ratio;
  chart.height = height * ratio;
  pen.scale(ratio, ratio);

  const latestOnly = period.value === "7";
  const y = (percentage) => height * (27 - percentage) / 5.9;
  const x = (index) => (index + .5) * width / weeklyMargins.length;
  const points = weeklyMargins.map((value, index) => [x(index), y(value)]);
  const lastPoint = points.at(-1);

  if (latestOnly) {
    pen.fillStyle = "#e8f5ed";
    pen.fillRect(x(6) - width / 14, 0, width / 7, height);
  }

  pen.strokeStyle = "#dce5df";
  pen.lineWidth = 1;
  for (const tick of [26, 24, 22]) {
    pen.beginPath();
    pen.moveTo(0, y(tick));
    pen.lineTo(width, y(tick));
    pen.stroke();
  }

  if (!latestOnly) {
    const fade = pen.createLinearGradient(0, 0, 0, height);
    fade.addColorStop(0, "#6dbba87a");
    fade.addColorStop(1, "#d4eee920");
    traceLine(points);
    pen.lineTo(lastPoint[0], height);
    pen.lineTo(points[0][0], height);
    pen.closePath();
    pen.fillStyle = fade;
    pen.fill();
  }

  pen.lineJoin = "round";
  pen.lineCap = "round";
  pen.lineWidth = 2.3;
  pen.strokeStyle = latestOnly ? "#779891" : "#177b6d";
  traceLine(latestOnly ? points.slice(0, -1) : points);
  if (latestOnly) pen.setLineDash([3, 4]);
  pen.stroke();
  pen.setLineDash([]);

  if (latestOnly) {
    pen.strokeStyle = "#177b6d";
    traceLine(points.slice(-2));
    pen.stroke();
  }

  for (const [index, point] of points.entries()) {
    const latest = index === points.length - 1;
    pen.beginPath();
    pen.arc(...point, latest ? 4.3 : 2.9, 0, Math.PI * 2);
    pen.strokeStyle = latest || !latestOnly ? "#176e61" : "#698c83";
    pen.fillStyle = latest ? "#176e61" : "#fff";
    pen.fill();
    pen.lineWidth = latest ? 1.8 : 1.4;
    pen.stroke();
  }
}

function traceLine(points) {
  pen.beginPath();
  pen.moveTo(...points[0]);
  for (const point of points.slice(1)) pen.lineTo(...point);
}

renderPeriod();
new ResizeObserver(drawChart).observe(chart);
