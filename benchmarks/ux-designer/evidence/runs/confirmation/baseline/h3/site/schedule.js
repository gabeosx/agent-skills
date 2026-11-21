const rooms = {
  'studio-a': { name: 'Studio A', column: 2 },
  'studio-b': { name: 'Studio B', column: 3 },
  'edit-booth': { name: 'Edit Booth', column: 4 },
};

const days = {
  tue: 'Tuesday, November 24, 2026',
  wed: 'Wednesday, November 25, 2026',
};

const bookings = [
  { day: 'tue', room: 'studio-a', start: 540, end: 585, id: 'morning-mix', title: 'Morning Mix', host: 'Leah Srivastava', status: 'Confirmed' },
  { day: 'tue', room: 'studio-a', start: 600, end: 660, id: 'signal-check', title: 'Signal Check', host: 'Mara Ortiz', status: 'Confirmed' },
  { day: 'tue', room: 'studio-a', start: 690, end: 750, id: 'midday-rotation', title: 'Midday Rotation', host: 'Minh Tran', status: 'Confirmed' },
  { day: 'tue', room: 'studio-b', start: 540, end: 600, id: 'field-notes', title: 'Field Notes', host: 'Jonah Reed', status: 'Tentative' },
  { day: 'tue', room: 'studio-b', start: 630, end: 675, id: 'studio-coaching', title: 'Studio Coaching', host: 'Elin Fischer', status: 'Confirmed' },
  { day: 'tue', room: 'studio-b', start: 720, end: 765, id: 'volunteer-orientation', title: 'Volunteer Orientation', host: 'Eli Okafor', status: 'Tentative' },
  { day: 'tue', room: 'edit-booth', start: 570, end: 600, id: 'tape-transfer', title: 'Tape Transfer', host: 'Robin Hale', status: 'Confirmed' },
  { day: 'tue', room: 'edit-booth', start: 660, end: 705, id: 'promo-edit', title: 'Promo Edit', host: 'Dalia Chen', status: 'Confirmed' },
  { day: 'wed', room: 'studio-a', start: 555, end: 615, id: 'interview-pickup', title: 'Interview Pickup', host: 'Nina Flores', status: 'Confirmed' },
  { day: 'wed', room: 'studio-b', start: 600, end: 660, id: 'show-prep', title: 'Show Prep', host: 'Samir Patel', status: 'Tentative' },
  { day: 'wed', room: 'edit-booth', start: 690, end: 750, id: 'archive-cleanup', title: 'Archive Cleanup', host: 'Robin Hale', status: 'Confirmed' },
];

const openingTime = 9 * 60;
const minutesPerRow = 15;

let activeDay = 'tue';
let tentativeOnly = false;
let selectedBooking = null;

const byId = (id) => document.getElementById(id);
const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);

const dayButtons = [...document.querySelectorAll('[data-day]')];
const filterButton = byTestId('tentative-only');
const scheduleHeading = byId('schedule-heading');
const bookingCount = byId('booking-count');
const track = byId('bookings');
const bookingTemplate = byId('booking-template');
const emptyMessage = byId('empty-message');
const details = byTestId('booking-details');
const detailTitle = byId('detail-title');
const detailRoom = byId('detail-room');
const detailTime = byId('detail-time');
const detailHost = byId('detail-host');
const detailStatus = byId('detail-status');
const closeButton = byTestId('close-details');
const moveButton = byTestId('move-booking');
const moveForm = byTestId('move-form');
const destination = byTestId('destination-room');
const cancelButton = byTestId('cancel-move');
const saveButton = byTestId('save-move');
const conflictMessage = byTestId('move-conflict');
const successMessage = byTestId('move-success');

function formatTime(minutes, showMeridiem) {
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, '0');
  const meridiem = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12}:${minute}${showMeridiem ? ` ${meridiem}` : ''}`;
}

function formatRange(start, end) {
  const crossesNoon = start < 720 && end >= 720;
  return `${formatTime(start, crossesNoon)}–${formatTime(end, true)}`;
}

function updateFeedback(element, message = '') {
  element.hidden = !message;
  element.textContent = message;
}

function updateDetailFields(booking) {
  detailTitle.textContent = booking.title;
  detailRoom.textContent = rooms[booking.room].name;
  detailTime.textContent = formatRange(booking.start, booking.end);
  detailHost.textContent = booking.host;
  detailStatus.textContent = booking.status;
  detailStatus.classList.toggle('is-tentative', booking.status === 'Tentative');
}

function renderSchedule() {
  for (const button of dayButtons) {
    button.setAttribute('aria-pressed', button.dataset.day === activeDay);
  }
  filterButton.setAttribute('aria-pressed', tentativeOnly);

  const visibleBookings = bookings
    .filter((booking) => booking.day === activeDay && (!tentativeOnly || booking.status === 'Tentative'))
    .sort((first, second) => first.start - second.start || rooms[first.room].column - rooms[second.room].column);

  scheduleHeading.textContent = days[activeDay];
  bookingCount.textContent = `${visibleBookings.length} ${visibleBookings.length === 1 ? 'booking' : 'bookings'}`;
  emptyMessage.hidden = visibleBookings.length !== 0;
  if (!emptyMessage.hidden) {
    emptyMessage.textContent = tentativeOnly ? 'No tentative bookings for this day.' : 'No bookings for this day.';
  }

  const cards = document.createDocumentFragment();
  for (const booking of visibleBookings) {
    const card = bookingTemplate.content.cloneNode(true);
    const wrapper = card.querySelector('.booking');
    const button = card.querySelector('.booking-card');
    const status = card.querySelector('.booking-status');
    const room = rooms[booking.room];
    const time = formatRange(booking.start, booking.end);

    wrapper.style.setProperty('--room-column', room.column);
    wrapper.style.setProperty('--start-row', 1 + (booking.start - openingTime) / minutesPerRow);
    wrapper.style.setProperty('--end-row', 1 + (booking.end - openingTime) / minutesPerRow);
    button.dataset.testid = `booking-${booking.id}`;
    button.setAttribute('aria-pressed', booking === selectedBooking);
    button.setAttribute('aria-label', `${booking.title}, ${room.name}, ${time}, ${booking.status}`);
    card.querySelector('.booking-title').textContent = booking.title;
    card.querySelector('.booking-room').textContent = room.name;
    card.querySelector('.booking-grid-time').textContent = time;
    const [agendaStart, agendaEnd] = card.querySelector('.booking-agenda-time').children;
    agendaStart.textContent = formatTime(booking.start, true);
    agendaEnd.textContent = `– ${formatTime(booking.end, true)}`;
    status.textContent = booking.status;
    if (booking.status === 'Tentative') {
      button.classList.add('is-tentative');
      status.classList.add('is-tentative');
    }

    button.addEventListener('click', () => openDetails(booking));
    cards.append(card);
  }
  track.replaceChildren(cards);
}

function openDetails(booking) {
  if (selectedBooking !== booking) {
    if (selectedBooking) byTestId(`booking-${selectedBooking.id}`)?.setAttribute('aria-pressed', 'false');
    selectedBooking = booking;
    byTestId(`booking-${booking.id}`).setAttribute('aria-pressed', 'true');
    updateDetailFields(booking);
    updateFeedback(successMessage);
    closeMoveForm();
  }
  details.hidden = false;
  detailTitle.focus({ preventScroll: true });
}

function closeDetails({ restoreFocus = false } = {}) {
  const bookingButton = selectedBooking && byTestId(`booking-${selectedBooking.id}`);
  bookingButton?.setAttribute('aria-pressed', 'false');
  details.hidden = true;
  selectedBooking = null;
  closeMoveForm();
  updateFeedback(successMessage);
  if (restoreFocus) bookingButton?.focus({ preventScroll: true });
}

function closeMoveForm() {
  moveForm.hidden = true;
  moveButton.hidden = false;
  destination.removeAttribute('aria-invalid');
  destination.removeAttribute('aria-describedby');
  updateFeedback(conflictMessage);
}

dayButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (activeDay === button.dataset.day) return;
    activeDay = button.dataset.day;
    closeDetails();
    renderSchedule();
  });
});

filterButton.addEventListener('click', () => {
  tentativeOnly = !tentativeOnly;
  if (tentativeOnly && selectedBooking?.status === 'Confirmed') closeDetails();
  renderSchedule();
});

closeButton.addEventListener('click', () => closeDetails({ restoreFocus: true }));

moveButton.addEventListener('click', () => {
  destination.value = selectedBooking.room;
  saveButton.disabled = true;
  updateFeedback(successMessage);
  moveButton.hidden = true;
  moveForm.hidden = false;
  destination.focus({ preventScroll: true });
});

destination.addEventListener('change', () => {
  destination.removeAttribute('aria-invalid');
  destination.removeAttribute('aria-describedby');
  updateFeedback(conflictMessage);
  saveButton.disabled = destination.value === selectedBooking.room;
});

function cancelMove() {
  closeMoveForm();
  moveButton.focus({ preventScroll: true });
}

cancelButton.addEventListener('click', cancelMove);

moveForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const targetRoom = destination.value;
  if (!selectedBooking || targetRoom === selectedBooking.room || !rooms[targetRoom]) return;

  const conflict = bookings.find((booking) =>
    booking !== selectedBooking && booking.day === activeDay && booking.room === targetRoom &&
    booking.start < selectedBooking.end && selectedBooking.start < booking.end
  );

  if (conflict) {
    conflictMessage.id = 'move-conflict';
    destination.setAttribute('aria-invalid', 'true');
    destination.setAttribute('aria-describedby', conflictMessage.id);
    updateFeedback(conflictMessage, `Overlaps ${conflict.title} in ${rooms[targetRoom].name}.`);
    return;
  }

  selectedBooking.room = targetRoom;
  renderSchedule();
  updateDetailFields(selectedBooking);
  closeMoveForm();
  updateFeedback(successMessage, `Booking moved to ${rooms[targetRoom].name}.`);
  moveButton.focus({ preventScroll: true });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || details.hidden || event.defaultPrevented) return;
  if (!moveForm.hidden) {
    cancelMove();
    return;
  }
  closeDetails({ restoreFocus: true });
});

renderSchedule();
