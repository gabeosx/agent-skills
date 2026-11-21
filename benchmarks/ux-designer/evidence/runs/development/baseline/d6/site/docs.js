const menuToggle = document.querySelector('[data-testid="nav-toggle"]');
const docsNav = document.querySelector('[data-testid="docs-nav"]');
const equipmentToggle = document.querySelector('[data-testid="equipment-toggle"]');
const equipmentLinks = document.querySelector('[data-testid="equipment-links"]');
const panel = document.querySelector('.context-panel');
const panelTitle = document.querySelector('#context-title');
const panelCopy = document.querySelector('#context-copy');
const outlineLinks = document.querySelectorAll('.outline a');
const narrowLayout = window.matchMedia('(max-width: 680px)');
let panelTrigger;

const topics = {
  'start-here': {
    title: 'Start here',
    copy: 'Identify the pump and check its equipment documentation before beginning. Use Restore prime for routine loss of prime and have your site lockout and restart procedures available.'
  },
  'centrifugal-pump': {
    title: 'Centrifugal pump',
    copy: 'Check the pump’s equipment instructions for the approved priming fluid, the fill port location, and the expected flow reading.'
  },
  'dosing-skid': {
    title: 'Dosing skid',
    copy: 'Consult the skid’s equipment instructions for the dosing pump, approved fluid, and isolation points. Follow the applicable site procedure for that system.'
  },
  'replace-a-seal': {
    title: 'Replace a seal',
    copy: 'Record the equipment ID and any signs of leakage. Contact maintenance to identify the correct seal and the replacement procedure for the pump.'
  },
  'check-flow': {
    title: 'Check flow',
    copy: 'After following the site restart procedure, confirm the flow on the gauge and compare it with the expected reading for the pump. Stop the pump and notify maintenance if flow does not recover.'
  },
  troubleshooting: {
    title: 'Troubleshooting',
    copy: 'If priming does not restore flow, stop the pump and notify maintenance. Give them the equipment ID, the gauge reading, and the steps already completed.'
  }
};

function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  docsNav.classList.toggle('is-open', open);
}

function syncOutline() {
  for (const link of outlineLinks) {
    if (link.hash === window.location.hash) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') === 'false');
});

equipmentToggle.addEventListener('click', () => {
  const expanded = equipmentToggle.getAttribute('aria-expanded') === 'false';
  equipmentToggle.setAttribute('aria-expanded', String(expanded));
  equipmentLinks.hidden = !expanded;
});

docsNav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;

  const topic = topics[link.dataset.topic];
  setMenu(false);
  if (!topic) return;

  event.preventDefault();
  panelTrigger = link;
  panelTitle.textContent = topic.title;
  panelCopy.textContent = topic.copy;
  panel.showModal();
});

panel.addEventListener('click', event => {
  if (event.target === panel) panel.close();
});

panel.addEventListener('close', () => {
  if (narrowLayout.matches) {
    menuToggle.focus();
  } else {
    panelTrigger?.focus();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuToggle.focus();
  }
});

window.addEventListener('hashchange', () => {
  if (panel.open) panel.close();
  setMenu(false);
  syncOutline();
});

narrowLayout.addEventListener('change', () => setMenu(false));
syncOutline();
