// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileString } from 'sass';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'vue/compiler-sfc';

const componentPath = resolve(process.cwd(), 'components/TableWidgetsNimbleGroupContent.vue');
const componentSource = readFileSync(componentPath, 'utf8');
const { descriptor } = parse(componentSource, { filename: componentPath });
const compiledComponentStyles = compileString(descriptor.styles[0]?.content ?? '', { syntax: 'scss' }).css;
const componentStyleElement = document.createElement('style');
componentStyleElement.textContent = compiledComponentStyles;

beforeAll(() => document.head.append(componentStyleElement));
afterEach(() => document.body.replaceChildren());
afterAll(() => componentStyleElement.remove());

const renderPopoverBody = (contentClass: string, controls: string[]) => {
  const content = document.createElement('div');
  content.className = contentClass;
  const body = document.createElement('div');
  body.className = 'va-popover__body';
  const controlElements = controls.map((className) => {
    const control = document.createElement('div');
    control.className = className;
    return control;
  });
  body.append(...controlElements);
  content.append(body);
  document.body.append(content);
  return { body, controls: controlElements };
};

describe('nimble group popover layout', () => {
  it('centers the remove icon on the hitpoint input row and preserves spacing', () => {
    const { body, controls } = renderPopoverBody('nimble-row__hitpoint-popover', [
      'nimble-row__hitpoint-input',
      'nimble-row__hitpoint-remove',
    ]);
    const bodyStyle = getComputedStyle(body);

    expect(bodyStyle.display).toBe('flex');
    expect(bodyStyle.alignItems).toBe('center');
    expect(bodyStyle.gap).toBe('0.35rem');
    expect(getComputedStyle(controls[1]!).alignSelf).toBe('center');
    expect(getComputedStyle(controls[1]!).transform).toBe('translateY(9px)');
  });

  it('centers the condition icon on its input and preserves spacing', () => {
    const { body, controls } = renderPopoverBody('nimble-row__condition-popover', [
      'nimble-row__condition-input',
      'nimble-row__condition-submit',
    ]);
    const bodyStyle = getComputedStyle(body);

    expect(bodyStyle.display).toBe('flex');
    expect(bodyStyle.alignItems).toBe('center');
    expect(bodyStyle.gap).toBe('0.5rem');
    expect(getComputedStyle(controls[0]!).flexGrow).toBe('1');
    expect(getComputedStyle(controls[1]!).alignSelf).toBe('center');
  });
});
