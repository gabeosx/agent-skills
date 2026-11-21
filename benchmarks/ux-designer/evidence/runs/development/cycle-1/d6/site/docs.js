const mobileToggle = document.querySelector('[data-testid="nav-toggle"]');
const docsNav = document.getElementById('docs-nav');
const equipmentToggle = document.querySelector('[data-testid="equipment-toggle"]');
const equipmentLinks = document.getElementById('equipment-links');
const currentPage = docsNav.querySelector('[aria-current="page"]');

function setMobileNav(open) {
  mobileToggle.setAttribute('aria-expanded', open);
  docsNav.dataset.open = String(open);
}

mobileToggle.addEventListener('click', () => {
  setMobileNav(mobileToggle.getAttribute('aria-expanded') !== 'true');
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !panel.open && docsNav.dataset.open === 'true' && mobileToggle.offsetWidth) {
    setMobileNav(false);
    mobileToggle.focus();
  }
});

currentPage.addEventListener('click', () => setMobileNav(false));

equipmentToggle.addEventListener('click', () => {
  const expanded = equipmentToggle.getAttribute('aria-expanded') !== 'true';
  equipmentToggle.setAttribute('aria-expanded', expanded);
  equipmentLinks.hidden = !expanded;
});

const outlineLinks = [...document.querySelectorAll('.outline a')];

function updateOutline() {
  const fragment = location.hash || '#isolate';

  for (const link of outlineLinks) {
    if (link.getAttribute('href') === fragment) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

window.addEventListener('hashchange', updateOutline);
updateOutline();

const topics = {
  start: ['Start here', 'Identify the equipment and review the site safety and lockout procedures before selecting a maintenance task.'],
  pump: ['Centrifugal pump', 'Use the equipment record to locate the fill port, identify the approved priming fluid, and find the flow gauge for this pump.'],
  skid: ['Dosing skid', 'Consult the skid equipment record for its fluid, controls, and site-specific isolation and restart procedures.'],
  seal: ['Replace a seal', 'Identify the pump model and seal from the equipment record. Use the approved maintenance procedure for that model.'],
  flow: ['Check flow', 'Read the flow gauge after the site restart procedure and compare it with the expected operating range in the equipment record.'],
  troubleshooting: ['Troubleshooting', 'If flow does not recover after a routine loss of prime, stop the pump and tell maintenance which pump was affected and what the gauge showed.']
};
const panel = document.getElementById('supporting-article');
const panelTitle = document.getElementById('context-title');
const panelBody = document.getElementById('context-body');

for (const link of docsNav.querySelectorAll('[data-topic]')) {
  link.addEventListener('click', event => {
    event.preventDefault();
    const [title, body] = topics[link.dataset.topic];
    panelTitle.textContent = title;
    panelBody.textContent = body;
    panel.showModal();
  });
}
