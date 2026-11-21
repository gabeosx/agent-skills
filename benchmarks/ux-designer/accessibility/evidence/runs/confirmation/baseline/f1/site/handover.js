const reports = [
  {
    id: 'T-214',
    location: 'Alder Junction',
    crew: 'Wayside team',
    next: 'Check the signal lamp during the next service gap.',
  },
  {
    id: 'T-219',
    location: 'Quay Loop',
    crew: 'Passenger information team',
    next: 'Confirm the replacement display cycles through all destinations.',
  },
  {
    id: 'T-224',
    location: 'Cedar Depot',
    crew: 'Fleet maintenance team',
    next: 'Review the door sensor history before releasing the tram.',
  },
];

const buttons = Array.from(document.querySelectorAll('.report'));
const details = {
  id: document.querySelector('[data-testid="handover-detail-id"]'),
  location: document.querySelector('[data-testid="handover-detail-location"]'),
  crew: document.querySelector('[data-testid="handover-detail-crew"]'),
  next: document.querySelector('[data-testid="handover-detail-next"]'),
};

for (const [index, button] of buttons.entries()) {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;

    for (const reportButton of buttons) {
      reportButton.setAttribute('aria-pressed', String(reportButton === button));
    }

    const selected = reports[index];
    for (const [field, value] of Object.entries(selected)) {
      details[field].textContent = value;
    }
  });
}
