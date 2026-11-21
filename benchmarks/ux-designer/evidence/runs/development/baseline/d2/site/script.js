const periods = {
  '30': { sales: '$1.28M', margin: '24.8%', stockout: '3.1%' },
  '7': { sales: '$318K', margin: '22.4%', stockout: '4.2%' },
};

const departments = [
  { name: 'Produce', '30': ['$405K', '20.2%'], '7': ['$95K', '18.1%'], status: 'Investigate' },
  { name: 'Grocery', '30': ['$532K', '28.1%'], '7': ['$130K', '27.0%'], status: 'On track' },
  { name: 'Frozen', '30': ['$204K', '25.2%'], '7': ['$54K', '22.3%'], status: 'Watch' },
  { name: 'Bakery', '30': ['$139K', '25.1%'], '7': ['$39K', '19.4%'], status: 'Investigate' },
];

const weeklyMargins = [25.1, 26.0, 25.7, 24.9, 24.3, 23.8, 22.4];
const period = document.querySelector('#period');
const status = document.querySelector('#status');
const tableBody = document.querySelector('[data-testid="rows"]');
const detail = document.querySelector('[data-testid="detail"]');
const rowCount = document.querySelector('#row-count');
const chart = document.querySelector('#chart');
const brush = chart.getContext('2d');

function showProduce() {
  document.querySelector('#detail-period').textContent = period.selectedOptions[0].textContent;
  document.querySelector('#detail-margin').textContent = departments[0][period.value][1];
  detail.showModal();
}

function renderDepartments() {
  const visible = status.value === 'investigate'
    ? departments.filter(department => department.status === 'Investigate')
    : departments;

  tableBody.replaceChildren(...visible.map(department => {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope = 'row';
    if (department.name === 'Produce') {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'row-action';
      action.dataset.testid = 'produce';
      action.append(department.name);
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      action.append(arrow);
      action.addEventListener('click', showProduce);
      name.append(action);
    } else {
      name.textContent = department.name;
    }
    row.append(name);
    for (const value of department[period.value]) {
      const cell = row.insertCell();
      cell.textContent = value;
    }
    const pill = document.createElement('span');
    pill.classList.add('pill', department.status.toLowerCase().replace(' ', '-'));
    const dot = document.createElement('span');
    dot.setAttribute('aria-hidden', 'true');
    pill.append(dot, department.status);
    row.insertCell().append(pill);
    return row;
  }));
  rowCount.textContent = visible.length === departments.length
    ? '4 departments'
    : '2 of 4 departments';
}

function drawTrend() {
  const { width, height } = chart.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const shortPeriod = period.value === '7';

  chart.width = Math.round(width * scale);
  chart.height = Math.round(height * scale);
  brush.scale(scale, scale);

  const left = 36;
  const right = width - 25;
  const top = 13;
  const bottom = height - 25;
  const y = value => bottom - (value - 22) / 4 * (bottom - top);
  const x = index => left + index / (weeklyMargins.length - 1) * (right - left);
  const points = weeklyMargins.map((value, index) => [x(index), y(value)]);

  function lineThrough(samples) {
    brush.beginPath();
    brush.moveTo(...samples[0]);
    for (const point of samples.slice(1)) brush.lineTo(...point);
  }

  brush.font = '11px system-ui, sans-serif';
  brush.lineWidth = 1;
  brush.textBaseline = 'middle';
  for (const value of [26, 24, 22]) {
    brush.strokeStyle = '#e2e9e2';
    brush.beginPath();
    brush.moveTo(left, y(value));
    brush.lineTo(width, y(value));
    brush.stroke();
    brush.fillStyle = '#586b62';
    brush.fillText(value + '%', 0, y(value));
  }

  const area = brush.createLinearGradient(0, top, 0, bottom);
  area.addColorStop(0, shortPeriod ? '#e6eee8' : '#d4ecda');
  area.addColorStop(1, '#ffffff');
  lineThrough(points);
  brush.lineTo(right, bottom);
  brush.lineTo(left, bottom);
  brush.closePath();
  brush.fillStyle = area;
  brush.fill();

  const latest = points.at(-1);
  brush.strokeStyle = shortPeriod ? '#7e9286' : '#27805b';
  brush.lineJoin = 'round';
  brush.lineWidth = shortPeriod ? 1.5 : 2.5;
  if (shortPeriod) brush.setLineDash([4, 4]);
  lineThrough(shortPeriod ? points.slice(0, -1) : points);
  brush.stroke();
  brush.setLineDash([]);

  if (shortPeriod) {
    brush.fillStyle = '#26926913';
    const band = (right - left) / (points.length - 1) / 2;
    brush.fillRect(right - band, top, band + 18, bottom - top);
    brush.strokeStyle = '#197751';
    brush.lineWidth = 3;
    lineThrough(points.slice(-2));
    brush.stroke();
  }

  points.forEach(([px, py], index) => {
    const current = index === points.length - 1;
    brush.beginPath();
    brush.arc(px, py, current ? 4.5 : 3, 0, Math.PI * 2);
    brush.fillStyle = current || !shortPeriod ? '#27805b' : '#889b90';
    brush.fill();
    brush.strokeStyle = '#fff';
    brush.lineWidth = 1;
    brush.stroke();
  });

  brush.font = '600 11px system-ui, sans-serif';
  brush.textAlign = 'right';
  brush.fillStyle = '#205a41';
  brush.fillText('22.4%', latest[0] + 16, latest[1] - 13);
  brush.font = '11px system-ui, sans-serif';
  brush.fillStyle = '#586b62';
  for (let index = 0; index < points.length; index += 1) {
    const current = index === points.length - 1;
    if (width < 460 && ![0, 2, 4, 6].includes(index)) continue;
    brush.textAlign = current ? 'right' : 'center';
    brush.fillText(current ? 'Latest week' : 'W' + (index + 1), current ? width : x(index), height - 10);
  }
}

function updatePeriod() {
  const metrics = periods[period.value];
  document.querySelector('[data-testid="revenue"]').textContent = metrics.sales;
  document.querySelector('[data-testid="margin"]').textContent = metrics.margin;
  document.querySelector('#stockout').textContent = metrics.stockout;

  const weekly = period.value === '7';
  const previous = weekly ? weeklyMargins.at(-2) : weeklyMargins[0];
  const decline = (previous - weeklyMargins.at(-1)).toFixed(1);
  document.querySelector('#trend-description').textContent = weekly
    ? 'Latest week highlighted against the preceding six weeks'
    : 'Weekly gross margin · oldest to latest';
  document.querySelector('#change span').textContent = 'Down ' + decline + ' pp';
  document.querySelector('#change').title = 'Down ' + decline + ' percentage points';
  renderDepartments();
  drawTrend();
}

period.addEventListener('change', updatePeriod);
status.addEventListener('change', renderDepartments);
detail.querySelector('[data-testid="detail-close"]').addEventListener('click', () => detail.close());
detail.addEventListener('close', () => tableBody.querySelector('[data-testid="produce"]')?.focus());

new ResizeObserver(drawTrend).observe(chart);
updatePeriod();
