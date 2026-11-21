const mobileToggle = document.querySelector('[data-testid="nav-toggle"]');
const docsNav = document.querySelector('[data-testid="docs-nav"]');
const equipmentToggle = document.querySelector('[data-testid="equipment-toggle"]');
const equipmentLinks = document.querySelector('[data-testid="equipment-links"]');
const currentArticle = docsNav.querySelector('[aria-current="page"]');
const outlineLinks = [...document.querySelectorAll('.outline a')];
const context = document.querySelector('#doc-context');

const references = {
  start: {
    title: 'Start here',
    body: 'Identify the pump and locate the site lockout and restart procedures before beginning work. Check which priming fluid is approved for the equipment.',
  },
  pump: {
    title: 'Centrifugal pump',
    body: 'Use the equipment instructions to locate the fill port, confirm the approved priming fluid, and identify the gauge used to verify flow.',
  },
  skid: {
    title: 'Dosing skid',
    body: 'Check the skid’s equipment instructions for its priming method and compatible fluid. Contact maintenance if the fill point or isolation requirements are unclear.',
  },
  seal: {
    title: 'Replace a seal',
    body: 'Use the seal replacement procedure for the pump model. Confirm the replacement part and site isolation requirements with maintenance before disassembly.',
  },
  flow: {
    title: 'Check flow',
    body: 'Read the flow gauge after following the site restart procedure. Compare the reading with the normal operating range recorded for the pump.',
  },
  troubleshoot: {
    title: 'Troubleshooting',
    body: 'If flow fails to recover after priming, stop the pump and notify maintenance. Record the gauge reading and whether the chamber filled successfully.',
  },
};

function setMobileNav(open) {
  mobileToggle.setAttribute('aria-expanded', open);
  docsNav.classList.toggle('is-open', open);
}

mobileToggle.addEventListener('click', () => {
  setMobileNav(mobileToggle.getAttribute('aria-expanded') !== 'true');
});

equipmentToggle.addEventListener('click', () => {
  const open = equipmentToggle.getAttribute('aria-expanded') !== 'true';
  equipmentToggle.setAttribute('aria-expanded', open);
  equipmentLinks.hidden = !open;
});

currentArticle.addEventListener('click', () => setMobileNav(false));

function closeNavOutside(event) {
  if (context.open || docsNav.contains(event.target) || mobileToggle.contains(event.target)) {
    return;
  }
  setMobileNav(false);
}
document.addEventListener('click', closeNavOutside);
document.addEventListener('focusin', closeNavOutside);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !context.open && docsNav.classList.contains('is-open')) {
    setMobileNav(false);
    mobileToggle.focus();
  }
});

window.matchMedia('(max-width: 690px)').addEventListener('change', () => setMobileNav(false));

for (const link of docsNav.querySelectorAll('[data-doc]')) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const reference = references[link.dataset.doc];
    context.querySelector('#context-title').textContent = reference.title;
    context.querySelector('#context-body').textContent = reference.body;
    context.showModal();
  });
}

function updateOutline() {
  for (const link of outlineLinks) {
    if (link.hash === location.hash) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

window.addEventListener('hashchange', updateOutline);
updateOutline();
