import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const file = process.argv[2] ?? new URL('../../../skills/ux-designer/assets/design-system-core.css', import.meta.url);
const asset = await readFile(file, 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(`
    <!doctype html>
    <div id="existing">
      <h1>Heading</h1><p>Paragraph of text</p><ul><li>Native list</li></ul><button>Native button</button>
    </div>
    <section class="ux-prototype">
      <div class="ux-prose"><p>Body copy</p></div>
      <input aria-label="Test field"><button>Test action</button>
    </section>
  `);
  const snapshot = () => page.locator('#existing, #existing *').evaluateAll((nodes) =>
    nodes.map(node => {
      const css = getComputedStyle(node);
      return [css.margin, css.padding, css.maxWidth, css.boxSizing, css.lineHeight, css.fontFamily];
    }));
  const native = await snapshot();
  await page.addStyleTag({ content: asset });
  assert.deepEqual(await snapshot(), native, 'Global import must preserve ordinary markup and controls');
  assert.equal(await page.locator('.ux-prototype input').evaluate(node => getComputedStyle(node).boxSizing), 'border-box');
  const [appliedWidth, expectedWidth] = await page.locator('.ux-prototype .ux-prose').evaluate(node => {
    const appliedWidth = getComputedStyle(node).maxInlineSize;
    node.style.maxInlineSize = '65ch';
    return [appliedWidth, getComputedStyle(node).maxInlineSize];
  });
  assert.equal(appliedWidth, expectedWidth);
  console.log('Prototype CSS leaves existing markup untouched and styles the opt-in region.');
} finally {
  await browser.close();
}
