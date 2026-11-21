const rooms = ["studio-a", "studio-b", "edit-booth"];
const roomLabels = {
  "studio-a": "Studio A",
  "studio-b": "Studio B",
  "edit-booth": "Edit Booth",
};
const days = { tue: "Tuesday, November 24", wed: "Wednesday, November 25" };
const openingTime = 9 * 60;
const dayDuration = 4 * 60;

const bookings = [
  { day: "tue", room: "studio-a", start: 540, end: 585, title: "Morning Mix", host: "Leah Srivastava", status: "Confirmed" },
  { day: "tue", room: "studio-a", start: 600, end: 660, title: "Signal Check", host: "Mara Ortiz", status: "Confirmed" },
  { day: "tue", room: "studio-a", start: 690, end: 750, title: "Midday Rotation", host: "Minh Tran", status: "Confirmed" },
  { day: "tue", room: "studio-b", start: 540, end: 600, title: "Field Notes", host: "Jonah Reed", status: "Tentative" },
  { day: "tue", room: "studio-b", start: 630, end: 675, title: "Studio Coaching", host: "Elin Fischer", status: "Confirmed" },
  { day: "tue", room: "studio-b", start: 720, end: 765, title: "Volunteer Orientation", host: "Eli Okafor", status: "Tentative" },
  { day: "tue", room: "edit-booth", start: 570, end: 600, title: "Tape Transfer", host: "Robin Hale", status: "Confirmed" },
  { day: "tue", room: "edit-booth", start: 660, end: 705, title: "Promo Edit", host: "Dalia Chen", status: "Confirmed" },
  { day: "wed", room: "studio-a", start: 555, end: 615, title: "Interview Pickup", host: "Nina Flores", status: "Confirmed" },
  { day: "wed", room: "studio-b", start: 600, end: 660, title: "Show Prep", host: "Samir Patel", status: "Tentative" },
  { day: "wed", room: "edit-booth", start: 690, end: 750, title: "Archive Cleanup", host: "Robin Hale", status: "Confirmed" },
];
for (const booking of bookings) {
  booking.id = "booking-" + booking.title.toLowerCase().replaceAll(" ", "-");
}

const dayButtons = document.querySelectorAll("[data-day]");
const filterButton = document.querySelector('[data-testid="tentative-only"]');
const list = document.querySelector(".booking-list");
const count = document.querySelector(".booking-count");
const scheduleDate = document.querySelector("#schedule-date");
const emptyState = document.querySelector(".empty-state");
const axis = document.querySelector(".hour-axis");
const grid = document.querySelector(".grid-lines");
const details = document.querySelector(".details");
const closeButton = document.querySelector(".close-details");
const moveButton = document.querySelector('[data-testid="move-booking"]');
const form = document.querySelector(".move-form");
const destination = document.querySelector("#destination-room");
const conflict = document.querySelector("#move-conflict");
const success = document.querySelector(".move-success");
const saveButton = document.querySelector('[data-testid="save-move"]');
const cancelButton = document.querySelector('[data-testid="cancel-move"]');

let activeDay = "tue";
let tentativeOnly = false;
let selectedBooking = null;

function formatTime(minutes, includePeriod = true) {
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, "0");
  const period = hour < 12 ? "AM" : "PM";
  return (hour % 12 || 12) + ":" + minute + (includePeriod ? " " + period : "");
}

function timeRange(booking) {
  const crossesNoon = booking.start < 720 && booking.end >= 720;
  return formatTime(booking.start, crossesNoon) + "–" + formatTime(booking.end);
}

function appendSpan(parent, className, value) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = value;
  parent.append(span);
  return span;
}

for (let offset = 0; offset <= dayDuration; offset += 15) {
  const position = offset / dayDuration * 100 + "%";
  const isHour = offset % 60 === 0;
  if (isHour) {
    appendSpan(axis, "", formatTime(openingTime + offset)).style.top = position;
  }
  if (offset > 0) {
    appendSpan(grid, isHour ? "interval major" : "interval", "").style.top = position;
  }
}
for (let column = 1; column < rooms.length; column++) {
  appendSpan(grid, "column-divider", "").style.left = column / rooms.length * 100 + "%";
}

function renderSchedule() {
  const visibleBookings = bookings
    .filter(booking => booking.day === activeDay && (!tentativeOnly || booking.status === "Tentative"))
    .sort((first, second) => first.start - second.start || rooms.indexOf(first.room) - rooms.indexOf(second.room));

  for (const button of dayButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.day === activeDay));
  }
  filterButton.setAttribute("aria-pressed", String(tentativeOnly));
  scheduleDate.textContent = days[activeDay];
  count.textContent = visibleBookings.length + (visibleBookings.length === 1 ? " booking" : " bookings");
  list.replaceChildren();
  emptyState.hidden = visibleBookings.length > 0;

  for (const booking of visibleBookings) {
    const wrapper = document.createElement("li");
    wrapper.className = "booking";
    wrapper.classList.toggle("booking-short", booking.end - booking.start <= 30);
    wrapper.dataset.testid = "booking";
    wrapper.style.setProperty("--booking-top", (booking.start - openingTime) / dayDuration * 100 + "%");
    wrapper.style.setProperty("--booking-height", (booking.end - booking.start) / dayDuration * 100 + "%");
    wrapper.style.setProperty("--room-offset", rooms.indexOf(booking.room) / rooms.length * 100 + "%");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "booking-button";
    button.classList.toggle("tentative", booking.status === "Tentative");
    button.dataset.testid = booking.id;
    button.setAttribute("aria-expanded", String(booking === selectedBooking));
    button.setAttribute("aria-controls", details.id);
    appendSpan(button, "booking-title", booking.title);
    appendSpan(button, "booking-time", timeRange(booking));
    appendSpan(button, "booking-room", roomLabels[booking.room]);
    appendSpan(button, "booking-status", booking.status);
    button.addEventListener("click", () => openDetails(booking));
    wrapper.append(button);
    list.append(wrapper);
  }
}

function clearConflict() {
  conflict.hidden = true;
  conflict.textContent = "";
  destination.removeAttribute("aria-invalid");
  destination.removeAttribute("aria-describedby");
}

function endMove() {
  form.hidden = true;
  moveButton.hidden = false;
  clearConflict();
}

function renderDetails() {
  document.querySelector("#booking-title").textContent = selectedBooking.title;
  document.querySelector("#booking-room").textContent = roomLabels[selectedBooking.room];
  document.querySelector("#booking-time").textContent = timeRange(selectedBooking);
  document.querySelector("#booking-host").textContent = selectedBooking.host;
  const status = document.querySelector("#booking-status");
  status.textContent = selectedBooking.status;
  status.classList.toggle("tentative", selectedBooking.status === "Tentative");
}

function markExpandedCard() {
  for (const button of list.querySelectorAll("button")) {
    button.setAttribute("aria-expanded", String(button.dataset.testid === selectedBooking?.id));
  }
}

function openDetails(booking) {
  if (selectedBooking !== booking) {
    selectedBooking = booking;
    endMove();
    success.hidden = true;
    renderDetails();
    markExpandedCard();
  }
  details.hidden = false;
  closeButton.focus({ preventScroll: true });
}

function closeDetails(restoreFocus = false) {
  const priorBooking = selectedBooking;
  selectedBooking = null;
  details.hidden = true;
  endMove();
  success.hidden = true;
  markExpandedCard();
  if (restoreFocus && priorBooking) {
    list.querySelector('[data-testid="' + priorBooking.id + '"]')?.focus();
  }
}

for (const button of dayButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.day === activeDay) return;
    activeDay = button.dataset.day;
    closeDetails();
    renderSchedule();
  });
}
filterButton.addEventListener("click", () => {
  tentativeOnly = !tentativeOnly;
  if (tentativeOnly && selectedBooking?.status === "Confirmed") closeDetails();
  renderSchedule();
});

closeButton.addEventListener("click", () => closeDetails(true));
document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || details.hidden) return;
  event.preventDefault();
  if (form.hidden) {
    closeDetails(true);
  } else {
    endMove();
    moveButton.focus();
  }
});

moveButton.addEventListener("click", () => {
  clearConflict();
  destination.value = selectedBooking.room;
  saveButton.disabled = true;
  success.hidden = true;
  moveButton.hidden = true;
  form.hidden = false;
  destination.focus();
});

cancelButton.addEventListener("click", () => {
  endMove();
  moveButton.focus();
});

destination.addEventListener("change", () => {
  clearConflict();
  saveButton.disabled = destination.value === selectedBooking.room;
});

form.addEventListener("submit", event => {
  event.preventDefault();
  if (destination.value === selectedBooking.room) return;
  const room = destination.value;
  const roomName = roomLabels[room];
  const overlap = bookings.find(booking =>
    booking !== selectedBooking && booking.day === activeDay &&
    booking.room === room && booking.start < selectedBooking.end && selectedBooking.start < booking.end
  );

  if (overlap) {
    conflict.hidden = false;
    conflict.textContent = "Overlaps " + overlap.title + " in " + roomName + ".";
    destination.setAttribute("aria-invalid", "true");
    destination.setAttribute("aria-describedby", conflict.id);
    destination.focus();
    return;
  }

  selectedBooking.room = room;
  endMove();
  renderDetails();
  renderSchedule();
  success.hidden = false;
  success.textContent = "Booking moved to " + roomName + ".";
  moveButton.focus();
});

renderSchedule();
