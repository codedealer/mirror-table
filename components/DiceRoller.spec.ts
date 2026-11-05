import type { DiceRollerMacro, RollEvaluationResult } from '~/models/Dice';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, onMounted, ref, watch } from 'vue';
import { VaInput } from 'vuestic-ui';
import DevLayout from '~/layouts/dev.vue';
import DevPage from '~/pages/dev.vue';
import { evaluateDiceExpression } from '~/utils/dice-evaluator';
import { Dnd5eProfile } from '~/utils/dice-lowering';
import DevDiceRollerLab from './DevDiceRollerLab.vue';
import DiceRoller from './DiceRoller.vue';

const diceRollerMock = vi.hoisted(() => ({ roll: vi.fn(), setResult: (_value: unknown) => {} }));

vi.mock('~/composables/useDiceRoller', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/composables/useDiceRoller')>();
  const vue = await import('vue');
  return {
    ...actual,
    useDiceRoller: () => {
      const rolling = vue.ref(false);
      const result = vue.ref<RollEvaluationResult | undefined>(undefined);
      diceRollerMock.setResult = (value) => {
        result.value = value as RollEvaluationResult | undefined;
      };
      return {
        expression: vue.ref('1d6'),
        profileId: vue.ref('none'),
        result,
        error: vue.ref(undefined),
        rolling,
        history: vue.ref([{ result: { expression: '1d4', total: 4 }, profileId: 'none' }]),
        roll: () => diceRollerMock.roll(rolling),
        showPrevious: vi.fn(),
        showNext: vi.fn(),
      };
    },
  };
});

// Model Vuestic's closeOnContentClick contract, while allowing selection actions
// to close modelled dropdowns explicitly.
const DropdownStub = defineComponent({
  props: {
    modelValue: { type: Boolean, default: undefined },
    closeOnContentClick: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    const localOpen = ref(false);
    const isOpen = computed(() => props.modelValue === undefined ? localOpen.value : props.modelValue);
    const setOpen = (value: boolean) => {
      if (props.modelValue === undefined)
        localOpen.value = value;
      else
        emit('update:modelValue', value);
    };
    return () => h('div', { 'class': 'dropdown', 'data-open': String(isOpen.value) }, [
      h('div', { class: 'dropdown-anchor', onClick: () => setOpen(true) }, slots.anchor?.()),
      isOpen.value
        ? h('div', {
            class: 'dropdown-content',
            onClick: () => {
              if (props.closeOnContentClick)
                setOpen(false);
            },
          }, slots.default?.())
        : null,
    ]);
  },
});

const ButtonStub = defineComponent({
  props: ['icon', 'disabled', 'class', 'loading'],
  setup(props, { attrs, slots }) {
    return () => h('button', {
      ...attrs,
      'class': props.class,
      'type': 'button',
      'disabled': props.disabled,
      'aria-busy': String(Boolean(props.loading)),
      'data-loading': String(Boolean(props.loading)),
      'data-icon': props.icon,
    }, slots.default?.());
  },
});

const InputStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('input', {
      ...attrs,
      value: props.modelValue,
      onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
    });
  },
});

const passthroughStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const MenuStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.anchor?.());
  },
});

let wrapper: VueWrapper | undefined;
let devRouteQuery: Record<string, string> = {};

const SidebarItemStub = defineComponent({
  props: ['active', 'activeColor', 'hoverColor'],
  setup(props, { slots }) {
    return () => h('span', {
      'class': ['va-sidebar-item', { 'va-sidebar-item--active': props.active }],
      'data-active': String(Boolean(props.active)),
    }, slots.default?.());
  },
});

const SidebarIconStub = defineComponent({
  props: ['name'],
  setup(props) {
    return () => h('i', { 'data-icon': props.name });
  },
});

const DevPageStubComponents = {
  NuxtLayout: DevLayout,
  VaSidebar: passthroughStub,
  VaSidebarItem: SidebarItemStub,
  VaSidebarItemContent: passthroughStub,
  VaSidebarItemTitle: defineComponent({ setup(_, { slots }) { return () => h('span', { class: 'va-sidebar-item-title' }, slots.default?.()); } }),
  VaIcon: SidebarIconStub,
  VaDivider: passthroughStub,
  VaCard: passthroughStub,
  VaCardTitle: passthroughStub,
  VaCardContent: passthroughStub,
};

beforeAll(() => {
  // Nuxt auto-imports Vue APIs in application SFCs; the focused mount uses Vue directly.
  Object.assign(globalThis, {
    computed,
    nextTick,
    onMounted,
    ref,
    watch,
    useNotificationStore: () => ({ error: vi.fn() }),
    definePageMeta: vi.fn(),
    useSeoMeta: vi.fn(),
    useRoute: () => ({ query: devRouteQuery }),
    navigateTo: vi.fn(),
  });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
  diceRollerMock.roll.mockReset().mockResolvedValue(true);
  diceRollerMock.setResult(undefined);
  devRouteQuery = {};
});

const mountRoller = async (initial: DiceRollerMacro[] = [], useRealInput = false) => {
  let saved = [...initial];
  const macroAdapter = {
    load: () => saved,
    save: (macros: DiceRollerMacro[]) => {
      saved = macros;
    },
  };
  wrapper = mount(DiceRoller, {
    props: { macroAdapter },
    global: {
      components: useRealInput ? { VaInput } : {},
      stubs: {
        ...(!useRealInput ? { VaInput: InputStub } : {}),
        'VaButton': ButtonStub,
        'VaChip': passthroughStub,
        'VaDropdown': DropdownStub,
        'VaDropdownContent': passthroughStub,
        'VaDivider': passthroughStub,
        'VaMenu': MenuStub,
        'VaModal': passthroughStub,
        'va-scroll-container': passthroughStub,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const openHistory = async (view: VueWrapper) => {
  await view.get('[aria-label="Roll history"]').trigger('click');
  await nextTick();
};

const expectHistoryOpen = (view: VueWrapper) => {
  expect(view.find('.dice-roller__history-menu').attributes('data-open')).toBe('true');
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('diceRoller live roll feedback', () => {
  it('exposes the active System Profile in the profile control tooltip', async () => {
    const view = await mountRoller();
    expect(view.get('[aria-label="Dice profile: No profile"]').attributes('title')).toContain('natural hints follow the selected profile');
  });

  it('hints at transient invalid syntax without showing a parse error or blocking the roll action', async () => {
    const view = await mountRoller();
    const input = view.get('[aria-label="Dice expression"]');

    await input.setValue('1d6+');
    expect(input.classes()).toContain('dice-roller__input--invalid');
    expect(view.find('[role="alert"]').exists()).toBe(false);
    expect(view.find('.dice-roller__save-hint').exists()).toBe(false);

    await input.trigger('keyup.enter');
    expect(diceRollerMock.roll).toHaveBeenCalledOnce();

    await input.setValue('1d6+2');
    expect(input.classes()).not.toContain('dice-roller__input--invalid');
  });

  it('keeps loading feedback on the existing result control while Enter starts a delayed roll', async () => {
    const pending = deferred<void>();
    diceRollerMock.roll.mockImplementation(async (rolling: { value: boolean }) => {
      rolling.value = true;
      try {
        await pending.promise;
        return true;
      } finally {
        rolling.value = false;
      }
    });
    const view = await mountRoller();
    expect(view.find('[aria-label="Roll dice"]').exists()).toBe(false);
    const resultControl = view.get('[aria-label="No roll yet"]');
    await resultControl.trigger('click');
    await nextTick();
    expect(view.text()).toContain('Roll the dice to see details.');
    expect(diceRollerMock.roll).not.toHaveBeenCalled();

    const rollInput = view.get('[aria-label="Dice expression"]');
    const roll = rollInput.trigger('keyup.enter');
    await nextTick();
    expect(resultControl.attributes('data-loading')).toBe('true');
    expect(resultControl.attributes('aria-busy')).toBe('true');
    expect(resultControl.attributes('aria-label')).toBe('Rolling dice');

    pending.resolve();
    await roll;
    await flushPromises();
    expect(resultControl.attributes('data-loading')).toBe('false');
    expect(resultControl.attributes('aria-busy')).toBe('false');
  });

  it('clears loading feedback on the result control when a delayed roll fails', async () => {
    const pending = deferred<void>();
    diceRollerMock.roll.mockImplementation(async (rolling: { value: boolean }) => {
      rolling.value = true;
      try {
        await pending.promise;
        return true;
      } catch {
        return false;
      } finally {
        rolling.value = false;
      }
    });
    const view = await mountRoller();
    const resultControl = view.get('[aria-label="No roll yet"]');
    const roll = view.get('[aria-label="Dice expression"]').trigger('keyup.enter');
    await nextTick();
    expect(resultControl.attributes('data-loading')).toBe('true');

    pending.reject(new Error('RNG request failed'));
    await roll;
    await flushPromises();
    expect(resultControl.attributes('data-loading')).toBe('false');
    expect(resultControl.attributes('aria-busy')).toBe('false');
  });
});

describe('dice roller development result presets', () => {
  it('renders exactly one Nimble group sidebar destination with the right icon and active route state', async () => {
    devRouteQuery = { prototype: 'nimble-group' };
    wrapper = mount(DevPage, { global: { stubs: DevPageStubComponents } });
    await flushPromises();

    const nimbleDestinations = wrapper.findAll('.va-sidebar-item-title').filter(item => item.text() === 'Nimble group');
    expect(nimbleDestinations).toHaveLength(1);
    expect(wrapper.findAll('.va-sidebar-item-title').map(item => item.text())).not.toContain('Dice result fixtures');
    const nimbleItem = nimbleDestinations[0]!.element.closest('.va-sidebar-item');
    expect(nimbleItem?.getAttribute('data-active')).toBe('true');
    expect(nimbleDestinations[0]!.element.parentElement?.querySelector('[data-icon="groups"]')).not.toBeNull();
    expect(wrapper.findAll('.va-sidebar-item--active')).toHaveLength(1);
  });

  it('marks only the Dice roller destination active on the Dice roller route', async () => {
    devRouteQuery = { prototype: 'dice-roller' };
    wrapper = mount(DevPage, { global: { stubs: DevPageStubComponents } });
    await flushPromises();

    const sidebarLabels = wrapper.findAll('.va-sidebar-item-title').map(item => item.text());
    expect(sidebarLabels).not.toContain('Dice result fixtures');
    expect(sidebarLabels.filter(label => label === 'Nimble group')).toHaveLength(1);
    const activeItems = wrapper.findAll('.va-sidebar-item--active');
    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]!.text()).toContain('Dice roller');
  });

  it('labels the focusable native Vuestic input with the player-facing expression name', async () => {
    const view = await mountRoller([], true);
    expect(view.get('.dice-roller__input input').attributes('aria-label')).toBe('Dice expression');
  });

  it('keeps expression input typography readable and distinguishes die metadata visually', async () => {
    const source = readFileSync(resolve(process.cwd(), 'components/DiceRoller.vue'), 'utf8');
    expect(source).toMatch(/\.dice-roller__input :deep\(\.va-input-wrapper__field\)\s*\{\s*font-size: 1rem;\s*font-weight: 400;/);
    expect(source.match(/class="dice-roller__die-metadata" aria-hidden="true"/g)).toHaveLength(2);
    expect(source).toMatch(/\.dice-roller__die-metadata\s*\{\s*margin-inline-end: 0\.25em;\s*opacity: 0\.58;/);
    const view = await mountRoller();
    expect(view.get('[aria-label="Dice expression"]').attributes('aria-label')).toBe('Dice expression');
    expect(view.findAll('button').some(button => button.text().trim().toLowerCase() === 'roll')).toBe(false);
  });

  it('loads deterministic evaluator results through accessible preset buttons', async () => {
    wrapper = mount(DevDiceRollerLab, {
      props: {
        macroAdapter: { load: () => [], save: () => {} },
      },
      global: {
        stubs: {
          'VaButton': ButtonStub,
          'VaChip': passthroughStub,
          'VaDropdown': DropdownStub,
          'VaDropdownContent': passthroughStub,
          'VaDivider': passthroughStub,
          'VaInput': InputStub,
          'VaMenu': MenuStub,
          'VaModal': passthroughStub,
          'va-scroll-container': passthroughStub,
        },
      },
    });
    await flushPromises();
    expect(wrapper.findAll('.dice-roller')).toHaveLength(1);

    const select = async (label: string, expression: string) => {
      const buttons = wrapper!.findAll('button');
      const preset = buttons.find(button => button.text() === label);
      expect(preset, `missing preset button: ${label}`).toBeTruthy();
      await preset!.trigger('click');
      await flushPromises();
      await nextTick();
      expect(wrapper!.text()).toContain(`Selected: ${label} ·`);
      if (!wrapper!.find('[aria-label="Final calculation"]').exists()) {
        const resultButton = wrapper!.findAll('button').find(button => button.attributes('aria-label')?.startsWith(`Show details for ${expression}`));
        expect(resultButton, `missing result for ${expression}`).toBeTruthy();
        await resultButton!.trigger('click');
        await nextTick();
      }
    };

    await select('D&D Nat 1 with Keep/Drop', '2d20kl1');
    expect(wrapper.get('button[aria-pressed="true"]').classes()).toContain('dice-result-lab__fixture--selected');
    expect(wrapper.text()).toContain('Nat 1');
    expect(wrapper.get('[aria-label="Final calculation"]').text()).toContain('1 = 1');
    expect(wrapper.get('[aria-label^="d20: 3;"]').attributes('title')).toContain('dropped by Keep/Drop');

    await select('D&D Nat 20', '1d20');
    expect(wrapper.text()).toContain('Nat 20');
    expect(wrapper.get('[aria-label="Final calculation"]').text()).toContain('20 = 20');

    await select('Complex grouped arithmetic', 'nd 2d6 + (1d8 + 2) * 2');
    expect(wrapper.get('[aria-label="Final calculation"] strong').text()).toBe('((3 + 5) + ((4 + 2) * 2)) = 20');
    const complexDetail = wrapper.get('.dice-roller__detail');
    const groupedPools = complexDetail.findAll('.dice-roller__pool-result-unit--nimble');
    expect(groupedPools).toHaveLength(1);
    expect(groupedPools[0]!.attributes('aria-label')).toBe('Nimble damage group, total 8');
    expect(groupedPools[0]!.findAll('.dice-roller__pool')).toHaveLength(2);
    const nimbleHeading = groupedPools[0]!.find('.dice-roller__pool-result-unit-heading');
    expect(nimbleHeading.text()).toContain('Nimble damage');
    expect(nimbleHeading.find('strong').text()).toBe('= 8');
    expect(groupedPools[0]!.text().match(/Nimble damage/g)).toHaveLength(1);
    expect(groupedPools[0]!.text()).toContain('Primary');
    expect(groupedPools[0]!.text()).toContain('Extra');
    expect(groupedPools[0]!.findAll('.dice-roller__pool').every(pool => !pool.text().includes('Nimble damage'))).toBe(true);
    expect(groupedPools[0]!.text()).toContain('d6: 3');
    expect(groupedPools[0]!.text()).toContain('d6: 5');
    expect(groupedPools[0]!.text()).toContain('= 8');
    const primaryPool = groupedPools[0]!.findAll('.dice-roller__pool')[0]!;
    const extraPool = groupedPools[0]!.findAll('.dice-roller__pool')[1]!;
    expect(primaryPool.get('.dice-roller__pool-subtotal').text()).toBe('= 3');
    expect(primaryPool.text()).not.toContain('= 8');
    expect(extraPool.get('.dice-roller__pool-subtotal').text()).toBe('= 5');
    expect(extraPool.text()).not.toContain('= 8');
    expect(groupedPools[0]!.text()).not.toContain('d8: 4');
    const ungroupedPools = complexDetail.findAll('.dice-roller__pool-result-unit--pool');
    expect(ungroupedPools).toHaveLength(1);
    expect(ungroupedPools[0]!.findAll('.dice-roller__pool')).toHaveLength(1);
    expect(ungroupedPools[0]!.text()).toContain('Pool 1');
    expect(ungroupedPools[0]!.find('.dice-roller__pool-label').text()).toBe('Pool 1');
    expect(ungroupedPools[0]!.get('.dice-roller__dice').attributes('aria-label')).toBe('Pool 1 dice');
    const complexPools = complexDetail.findAll('.dice-roller__pool');
    expect(complexPools).toHaveLength(3);
    expect(complexPools.map(pool => pool.get('.dice-roller__pool-label').text())).toEqual(['Primary', 'Extra', 'Pool 1']);
    expect(complexPools.every((pool) => {
      const label = pool.get('.dice-roller__pool-label').text();
      return pool.get('.dice-roller__dice').attributes('aria-label') === `${label} dice`
        && pool.findAll('.dice-roller__pool-label').length === 1;
    })).toBe(true);
    const complexDetailSource = readFileSync(resolve(process.cwd(), 'components/DiceRoller.vue'), 'utf8');
    const groupedSurfaceStyle = complexDetailSource.match(/\.dice-roller__repetition-result,\s*\.dice-roller__pool-result-unit--nimble \{([^}]*)\}/)?.[1] ?? '';
    expect(groupedSurfaceStyle).toContain('border: 1px solid var(--va-background-border)');
    expect(groupedSurfaceStyle).toContain('background: color-mix(in srgb, var(--va-background-element) 70%, transparent)');
    expect(groupedSurfaceStyle).not.toContain('--va-primary');
    const groupedSubtotalStyle = complexDetailSource.match(/\.dice-roller__pool-result-unit--nimble \.dice-roller__pool-subtotal \{([^}]*)\}/)?.[1] ?? '';
    expect(groupedSubtotalStyle).toContain('color: var(--va-text-primary)');

    await select('Nimble primary explosion', 'nd 1d6');
    const singlePoolNimbleGroup = wrapper.get('.dice-roller__pool-result-unit--nimble');
    expect(singlePoolNimbleGroup.find('.dice-roller__pool-result-unit-heading').text()).toContain('Nimble damage');
    expect(singlePoolNimbleGroup.text().match(/Nimble damage/g)).toHaveLength(1);
    expect(singlePoolNimbleGroup.find('.dice-roller__pool-label').text()).toBe('Primary');
    expect(singlePoolNimbleGroup.find('.dice-roller__pool').text()).not.toContain('Nimble damage');
    expect(wrapper.get('.dice-roller__die-marker').text()).toBe('✦');
    expect(wrapper.get('.dice-roller__die-marker').attributes('title')).toBe('Explosion');
    expect(wrapper.get('[aria-label^="d6: 6;"]').classes()).toContain('dice-roller__die--exploded');
    expect(wrapper.get('[aria-label^="d6: 6;"]').attributes('aria-label')).toContain('Exploded');
    expect(wrapper.get('[aria-label^="d6: 6;"]').attributes('aria-label')).not.toContain('on 4');
    expect(wrapper.text()).toContain('d6: 4');
    const explosionDetail = wrapper.get('.dice-roller__detail');

    await select('Nimble critical miss with sibling', 'nd 1d6 + nd 1d6');
    expect(wrapper.find('[aria-label="Nimble critical miss; this damage group is voided"]').exists()).toBe(false);
    const criticalMissGroups = wrapper.findAll('.dice-roller__pool-result-unit--nimble');
    expect(criticalMissGroups).toHaveLength(2);
    expect(criticalMissGroups.every(group => group.find('.dice-roller__pool-result-unit-heading').text().includes('Nimble damage'))).toBe(true);
    expect(criticalMissGroups.every(group => group.text().match(/Nimble damage/g)?.length === 1)).toBe(true);
    expect(criticalMissGroups[0]!.find('.dice-roller__pool-result-unit-heading strong').text()).toBe('= 0');
    expect(criticalMissGroups[0]!.find('.dice-roller__pool-subtotal').text()).toBe('= 1');
    expect(criticalMissGroups[1]!.find('.dice-roller__pool-result-unit-heading strong').text()).toBe('= 4');
    expect(criticalMissGroups[1]!.find('.dice-roller__pool-subtotal').text()).toBe('= 4');
    expect(wrapper.get('[aria-label="Final calculation"]').text()).toContain('4');

    await select('Repetition with a local void', '(nd 1d6 + nd 1d6 + 2)~2');
    const voidDetail = wrapper.get('.dice-roller__detail');
    expect(voidDetail.classes()).toEqual(explosionDetail.classes());
    const detailSource = readFileSync(resolve(process.cwd(), 'components/DiceRoller.vue'), 'utf8');
    const detailStyle = detailSource.match(/\.dice-roller__detail \{([^}]*)\}/)?.[1] ?? '';
    expect(detailStyle).toContain('width: min(22rem, calc(100vw - 2rem))');
    expect(detailStyle).toContain('max-width: min(28rem, calc(100vw - 2rem))');
    expect(detailStyle).toContain('box-sizing: border-box');
    const repetitions = wrapper.get('[aria-label="Repetition results"]');
    const repetitionOne = repetitions.get('[aria-label="Repetition 1"]');
    const repetitionTwo = repetitions.get('[aria-label="Repetition 2"]');
    expect(repetitionOne.text()).toContain('d6: 1');
    expect(repetitionOne.text()).toContain('d6: 4');
    const firstGroups = repetitionOne.findAll('.dice-roller__repetition-unit--nimble');
    expect(firstGroups).toHaveLength(2);
    expect(firstGroups[0]!.find('.dice-roller__repetition-group-heading').text()).toContain('Nimble damage');
    expect(firstGroups[0]!.find('.dice-roller__repetition-group-heading').text()).not.toContain('Group');
    expect(firstGroups[0]!.text()).toContain('Primary');
    expect(firstGroups[0]!.text().match(/Nimble damage/g)).toHaveLength(1);
    expect(firstGroups[0]!.text()).toContain('= 0');
    expect(firstGroups[0]!.text()).not.toContain('void');
    expect(firstGroups[0]!.attributes('aria-label')).toContain('voided, total zero');
    expect(firstGroups[1]!.find('.dice-roller__repetition-group-heading').text()).toContain('Nimble damage');
    expect(firstGroups[1]!.find('.dice-roller__repetition-group-heading').text()).not.toContain('Group');
    expect(firstGroups[1]!.text()).toContain('Primary');
    expect(firstGroups[1]!.text().match(/Nimble damage/g)).toHaveLength(1);
    expect(firstGroups[1]!.text()).toContain('= 6');
    expect(firstGroups.every(group => !group.text().toLowerCase().includes('subtotal'))).toBe(true);
    expect(repetitionOne.text()).not.toContain('Nimble damage · primary die');
    expect(firstGroups.every(group => group.findAll('.dice-roller__pool').every(pool => !pool.text().includes('Nimble damage')))).toBe(true);
    expect(repetitionOne.text()).toContain('= 6');
    expect(repetitionOne.get('.dice-roller__repetition-equation').text()).toBe('(0 + (4 + 2)) = 6');
    expect(repetitionTwo.text()).toContain('d6: 3');
    expect(repetitionTwo.text()).toContain('d6: 2');
    expect(repetitionTwo.text()).toContain('= 7');
    expect(repetitionTwo.get('.dice-roller__repetition-equation').text()).toBe('(3 + (2 + 2)) = 7');
    expect(repetitions.findAll('.dice-roller__pool')).toHaveLength(4);
    expect(repetitions.text()).not.toContain('repetitions total');
    expect(repetitions.text()).not.toContain('locally voided group');
    expect(wrapper.get('[aria-label="Final calculation"] strong').text()).toBe('((0 + (4 + 2)) + (3 + (2 + 2))) = 13');
    const resultButton = wrapper.findAll('button').find(button => button.attributes('aria-label')?.startsWith('Show details for (nd 1d6 + nd 1d6 + 2)~2'))!;
    expect(resultButton.classes()).toContain('dice-roller__result-button--natural-minimum');
    expect(resultButton.attributes('aria-label')).toContain('Nat 1 on d6');
    const poolHeadings = wrapper.findAll('.dice-roller__pool-heading');
    expect(poolHeadings[0].text()).toContain('Nat 1');
    expect(poolHeadings[1].text()).not.toContain('Nat');
    expect(firstGroups[0]!.text()).toContain('= 0');
    expect(firstGroups[0]!.text()).not.toContain('void');
    expect(wrapper.get('[aria-label^="d6: 1;"]').attributes('aria-label')).toContain('Nat 1');
    expect(wrapper.get('[aria-label^="d6: 4;"]').attributes('aria-label')).not.toContain('Nat');
    expect(wrapper.find('.dice-roller__detail-naturals').exists()).toBe(false);

    const reset = wrapper.get('[aria-label="Reset selected fixture"]');
    expect(reset.attributes('disabled')).toBeUndefined();
    await reset.trigger('click');
    expect(wrapper.text()).toContain('Roll the dice to see details.');
    expect(wrapper.find('button[aria-pressed="true"]').exists()).toBe(false);
    expect(wrapper.get('[aria-label="Reset selected fixture"]').attributes('disabled')).toBeDefined();
  });
});

describe('diceRoller evaluation rundown', () => {
  it('keeps the result control structurally and dimensionally stable for natural results', async () => {
    const view = await mountRoller();
    const anchor = view.get('.dice-roller__result-anchor');
    expect(anchor.element.children).toHaveLength(1);
    expect(anchor.findAll('button')).toHaveLength(1);

    const evaluated = await evaluateDiceExpression('2d20kl1', async (_, max) => max === 20 ? 1 : 1, Dnd5eProfile);
    diceRollerMock.setResult(evaluated);
    await nextTick();

    expect(anchor.element.children).toHaveLength(1);
    expect(anchor.findAll('button')).toHaveLength(1);
    expect(anchor.find('.dice-roller__natural-cue').exists()).toBe(false);
    expect(anchor.findAll('va-chip')).toHaveLength(0);

    const source = readFileSync(resolve(process.cwd(), 'components/DiceRoller.vue'), 'utf8');
    const resultButtonStyle = source.match(/\.dice-roller__result-button \{([^}]*)\}/)?.[1] ?? '';
    const naturalTotalStyle = source.match(/\.dice-roller__result-button--natural-minimum \.dice-roller__total \{([^}]*)\}/)?.[1] ?? '';
    expect(resultButtonStyle).toContain('width: 3.5rem');
    expect(resultButtonStyle).toContain('height: 2.25rem');
    expect(naturalTotalStyle).not.toContain('background');
    const poolNaturalStyle = source.match(/\.dice-roller__pool-natural \{([^}]*)\}/)?.[1] ?? '';
    const naturalDieStyle = source.match(/\.dice-roller__die--natural-minimum \{([^}]*)\}/)?.[1] ?? '';
    const explosionDieStyle = source.match(/\.dice-roller__die--exploded \{([^}]*)\}/)?.[1] ?? '';
    expect(poolNaturalStyle).toContain('border-radius: 999px');
    expect(poolNaturalStyle).toContain('border: 1px solid currentColor');
    expect(naturalDieStyle).toContain('outline: 1px solid');
    expect(explosionDieStyle).toContain('animation: dice-roller-explosion 700ms ease-out');
  });

  it('styles every exploding die in a cascade and keeps roll details scrollable', async () => {
    const rolls = [6, 6, 2];
    let rollIndex = 0;
    const evaluated = await evaluateDiceExpression('1d6!', async () => rolls[rollIndex++]!);
    const view = await mountRoller();
    diceRollerMock.setResult(evaluated);
    await nextTick();
    await view.get('[aria-label^="Show details for 1d6!"]').trigger('click');

    const explodedDice = view.findAll('.dice-roller__die--exploded');
    expect(explodedDice).toHaveLength(2);
    expect(explodedDice.map(die => die.attributes('title'))).toEqual(['Exploded', 'Exploded']);
    expect(explodedDice.map(die => die.attributes('aria-label'))).toEqual([
      expect.stringContaining('Exploded'),
      expect.stringContaining('Exploded'),
    ]);
    expect(view.find('.dice-roller__detail-scroll').exists()).toBe(true);
    const detailSource = readFileSync(resolve(process.cwd(), 'components/DiceRoller.vue'), 'utf8');
    const scrollStyle = detailSource.match(/\.dice-roller__detail-scroll \{([^}]*)\}/)?.[1] ?? '';
    expect(scrollStyle).toContain('max-height: min(32rem, calc(100vh - 2rem))');
  });

  it('keeps details open after a die-chip click and shows the compact rundown', async () => {
    const view = await mountRoller();
    diceRollerMock.setResult({
      expression: 'nd 2d6',
      total: 10,
      breakdown: [],
      naturalHints: [],
      capped: false,
      ast: { type: 'LITERAL', value: 10 },
      trace: {
        type: 'GROUPED_POOL',
        value: 10,
        pools: [
          {
            type: 'POOL',
            poolId: 1,
            sides: 6,
            provenance: { intent: 'nimble-damage', role: 'primary' },
            subtotal: 8,
            capped: false,
            dice: [
              { dieId: 1, sides: 6, initialRoll: 6, rerolls: [], finalValue: 6, dropped: false, capped: false, bumpAmount: 0, exploded: true },
              { dieId: 2, sides: 6, initialRoll: 2, rerolls: [], finalValue: 2, dropped: false, capped: false, bumpAmount: 0, exploded: false, generatedBy: 1 },
            ],
          },
          {
            type: 'POOL',
            poolId: 2,
            sides: 6,
            provenance: { intent: 'nimble-damage', role: 'extra' },
            subtotal: 2,
            capped: false,
            dice: [{ dieId: 3, sides: 6, initialRoll: 2, rerolls: [], finalValue: 2, dropped: false, capped: false, bumpAmount: 0, exploded: false }],
          },
        ],
      },
    });
    await nextTick();
    await view.get('[aria-label^="Show details for nd 2d6"]').trigger('click');
    expect(view.get('.dice-roller__result-menu').attributes('data-open')).toBe('true');
    await view.get('[aria-label="Final calculation"]').trigger('click');
    expect(view.get('.dice-roller__result-menu').attributes('data-open')).toBe('true');

    await view.get('[aria-label^="d6: 6;"]').trigger('click');
    expect(view.get('.dice-roller__result-menu').attributes('data-open')).toBe('true');

    expect(view.text()).toContain('Primary');
    expect(view.text()).toContain('Extra');
    expect(view.get('.dice-roller__die-marker').attributes('title')).toBe('Explosion');
    expect(view.get('.dice-roller__die-marker').text()).toBe('✦');
    expect(view.text()).toContain('+ d6: 2');
    expect(view.text()).toContain('(8 + 2) = 10');
  });

  it('renders nested repetition traces once in their corresponding sections', async () => {
    const faces = [1, 2, 3, 4];
    let index = 0;
    const evaluated = await evaluateDiceExpression('((1d6)~2)~2', async () => faces[index++]);
    expect(evaluated.total).toBe(10);

    const view = await mountRoller();
    diceRollerMock.setResult(evaluated);
    await nextTick();
    await view.get('[aria-label^="Show details for ((1d6)~2)~2"]').trigger('click');

    const repetitions = view.get('[aria-label="Repetition results"]');
    const outerOne = repetitions.get('[aria-label="Repetition 1"]');
    const outerTwo = repetitions.get('[aria-label="Repetition 2"]');
    const nestedOne = repetitions.get('[aria-label="Repetition 1.1"]');
    const nestedTwo = repetitions.get('[aria-label="Repetition 1.2"]');
    const nestedThree = repetitions.get('[aria-label="Repetition 2.1"]');
    const nestedFour = repetitions.get('[aria-label="Repetition 2.2"]');

    expect(outerOne.text()).toContain('= 3');
    expect(outerOne.get('.dice-roller__repetition-equation').text()).toBe('(1 + 2) = 3');
    expect(outerOne.findAll('.dice-roller__pool')).toHaveLength(0);
    expect(outerTwo.text()).toContain('= 7');
    expect(outerTwo.get('.dice-roller__repetition-equation').text()).toBe('(3 + 4) = 7');
    expect(outerTwo.findAll('.dice-roller__pool')).toHaveLength(0);
    expect(nestedOne.text()).toContain('d6: 1');
    expect(nestedOne.text()).toContain('= 1');
    expect(nestedTwo.text()).toContain('d6: 2');
    expect(nestedTwo.text()).toContain('= 2');
    expect(nestedThree.text()).toContain('d6: 3');
    expect(nestedThree.text()).toContain('= 3');
    expect(nestedFour.text()).toContain('d6: 4');
    expect(nestedFour.text()).toContain('= 4');
    const renderedDice = repetitions.findAll('[aria-label^="d6:"]');
    expect(renderedDice).toHaveLength(4);
    for (const face of faces)
      expect(renderedDice.filter(die => die.attributes('aria-label')?.startsWith(`d6: ${face};`))).toHaveLength(1);
    expect(view.get('[aria-label="Final calculation"] strong').text()).toBe('((1 + 2) + (3 + 4)) = 10');
  });

  it('shows every repetition outcome and local Nimble voids in roll details', async () => {
    const view = await mountRoller();
    diceRollerMock.setResult({
      expression: '(nd 1d6 + 2 + 1d6)~2',
      total: 14,
      breakdown: [],
      naturalHints: [],
      capped: false,
      ast: { type: 'LITERAL', value: 14 },
      trace: {
        type: 'REPETITION',
        count: 2,
        value: 14,
        repetitions: [
          {
            type: 'ARITHMETIC',
            operator: '+',
            leftValue: 0,
            rightValue: 3,
            value: 3,
            left: {
              type: 'GROUPED_POOL',
              intent: 'nimble-damage',
              value: 0,
              voided: true,
              flatModifier: 2,
              preVoidValue: 3,
              pools: [{ type: 'POOL', poolId: 1, sides: 6, subtotal: 1, capped: false, dice: [] }],
            },
            right: { type: 'POOL', poolId: 2, sides: 6, subtotal: 3, capped: false, dice: [] },
          },
          {
            type: 'ARITHMETIC',
            operator: '+',
            leftValue: 6,
            rightValue: 5,
            value: 11,
            left: {
              type: 'GROUPED_POOL',
              intent: 'nimble-damage',
              value: 6,
              flatModifier: 2,
              pools: [{ type: 'POOL', poolId: 3, sides: 6, subtotal: 4, capped: false, dice: [] }],
            },
            right: { type: 'POOL', poolId: 4, sides: 6, subtotal: 5, capped: false, dice: [] },
          },
        ],
      },
    });
    await nextTick();
    await view.get('[aria-label^="Show details for"]').trigger('click');

    const repetitionResults = view.get('[aria-label="Repetition results"]');
    expect(repetitionResults.text()).toContain('Repetition 1');
    expect(repetitionResults.text()).toContain('Repetition 2');
    expect(repetitionResults.text()).toContain('= 3');
    expect(repetitionResults.text()).toContain('= 11');
    expect(repetitionResults.text()).not.toContain('repetitions total');
    expect(view.get('[aria-label="Final calculation"] strong').text()).toBe('((0 + 3) + ((4 + 2) + 5)) = 14');
  });

  it('shows the 2d20kl1 surviving natural in details without dropped-pill wording', async () => {
    const faces = [1, 3];
    let index = 0;
    const evaluated = await evaluateDiceExpression('2d20kl1', async () => faces[index++], Dnd5eProfile);
    expect(evaluated.total).toBe(1);
    expect(evaluated.naturalHints).toMatchObject([{ kind: 'minimum', face: 1 }]);

    const view = await mountRoller();
    diceRollerMock.setResult(evaluated);
    await nextTick();

    const resultButton = view.get('[aria-label^="Show details for 2d20kl1"]');
    expect(resultButton.text()).toContain('1');
    expect(resultButton.attributes('aria-label')).toContain('total 1');
    expect(resultButton.attributes('aria-label')).toContain('Nat 1 on d20');
    expect(resultButton.attributes('title')).toContain('die 1');
    expect(resultButton.classes()).toContain('dice-roller__result-button--natural-minimum');
    expect(view.find('.dice-roller__natural-cue').exists()).toBe(false);
    expect(view.find('.dice-roller__natural-hint').exists()).toBe(false);
    expect(view.get('.dice-roller__result-anchor').element.children).toHaveLength(1);
    await resultButton.trigger('click');

    expect(view.get('[aria-label="Final calculation"]').text()).toContain('1 = 1');
    expect(view.get('.dice-roller__pool-heading').text()).toContain('Nat 1');
    const naturalLabel = view.get('.dice-roller__pool-natural');
    expect(naturalLabel.text()).toBe('Nat 1');
    expect(naturalLabel.classes()).toContain('dice-roller__pool-natural--minimum');
    const naturalDie = view.get('[aria-label^="d20: 1;"]');
    expect(naturalDie.classes()).toContain('dice-roller__die--natural-minimum');
    expect(naturalDie.attributes('aria-label')).toContain('Nat 1 on d20');
    const droppedDie = view.get('[aria-label^="d20: 3;"]');
    expect(droppedDie.text()).not.toContain('Dropped');
    expect(droppedDie.attributes('title')).toContain('dropped by Keep/Drop');
  });

  it('shows a qualifying natural consistently in accessible roll details', async () => {
    const view = await mountRoller();
    diceRollerMock.setResult({
      expression: '1d20a',
      total: 20,
      breakdown: [],
      naturalHints: [{
        kind: 'maximum',
        face: 20,
        sides: 20,
        dieId: 2,
        poolId: 1,
        context: 'D&D advantage/disadvantage pool',
      }],
      capped: false,
      ast: { type: 'LITERAL', value: 20 },
      trace: {
        type: 'POOL',
        poolId: 1,
        sides: 20,
        provenance: { intent: 'dnd5e-advantage' },
        subtotal: 20,
        capped: false,
        dice: [
          { dieId: 1, sides: 20, initialRoll: 1, rerolls: [], finalValue: 1, dropped: true, capped: false, bumpAmount: 0, exploded: false, events: [] },
          { dieId: 2, sides: 20, initialRoll: 20, rerolls: [], finalValue: 20, dropped: false, capped: false, bumpAmount: 0, exploded: false, events: [] },
        ],
      },
    });
    await nextTick();

    const resultHint = view.get('[aria-label^="Show details for 1d20a"]');
    expect(resultHint.text()).toContain('20');
    expect(resultHint.attributes('aria-label')).toContain('total 20');
    expect(resultHint.attributes('aria-label')).toContain('Nat 20 on d20, die 2');
    expect(resultHint.attributes('title')).toContain('die 2');
    expect(resultHint.classes()).toContain('dice-roller__result-button--natural-maximum');
    expect(view.find('.dice-roller__natural-cue').exists()).toBe(false);
    expect(view.find('.dice-roller__natural-hint').exists()).toBe(false);
    expect(view.get('.dice-roller__result-anchor').element.children).toHaveLength(1);

    await resultHint.trigger('click');
    expect(view.find('.dice-roller__detail-naturals').exists()).toBe(false);
    expect(view.find('.dice-roller__pool-heading').text()).toContain('Nat 20');
    const qualifyingDie = view.get('[aria-label^="d20: 20;"]');
    expect(qualifyingDie.attributes('aria-label')).toContain('Nat 20');
    const unrelated = view.get('[aria-label^="d20: 1;"]');
    expect(unrelated.attributes('aria-label')).not.toContain('Nat');
  });

  it('shows accessible Nimble critical-miss and settled-maximum hints in result details', async () => {
    const view = await mountRoller();
    diceRollerMock.setResult({
      expression: 'nd 2d6+5',
      total: 0,
      breakdown: [],
      naturalHints: [{ kind: 'minimum', face: 1, sides: 6, dieId: 1, poolId: 1, context: 'Nimble Primary Die' }],
      capped: false,
      ast: { type: 'LITERAL', value: 0 },
      trace: {
        type: 'GROUPED_POOL',
        value: 0,
        intent: 'nimble-damage',
        flatModifier: 5,
        voided: true,
        preVoidValue: 9,
        pools: [{
          type: 'POOL',
          poolId: 1,
          sides: 6,
          provenance: { intent: 'nimble-damage', role: 'primary' },
          subtotal: 4,
          capped: false,
          dice: [{ dieId: 1, sides: 6, initialRoll: 1, rerolls: [], finalValue: 1, dropped: false, capped: false, bumpAmount: 0, exploded: false, events: [{ type: 'ROLLED', value: 1 }] }],
        }],
      },
    });
    await nextTick();

    const resultHint = view.get('[aria-label^="Show details for nd 2d6+5"]');
    expect(resultHint.attributes('aria-label')).toContain('Nat 1 on d6, die 1 in Nimble Primary Die');
    expect(resultHint.classes()).toContain('dice-roller__result-button--natural-minimum');
    expect(view.find('.dice-roller__natural-cue').exists()).toBe(false);
    await resultHint.trigger('click');
    expect(view.find('[aria-label="Nimble critical miss; this damage group is voided"]').exists()).toBe(false);
    expect(view.get('.dice-roller__pool-result-unit-heading').text()).toContain('= 0');
    expect(view.get('.dice-roller__pool-heading').text()).toContain('Nat 1');
    expect(view.get('.dice-roller__pool-subtotal').text()).toBe('= 4');
    expect(view.get('.dice-roller__pool-heading').text()).not.toContain('void');
    const naturalPrimary = view.get('[aria-label^="d6: 1;"]');
    expect(naturalPrimary.attributes('aria-label')).toContain('Nat 1 on d6');
    expect(view.get('[aria-label="Final calculation"]').text()).toContain('0 = 0');
    expect(view.get('[aria-label="Final calculation"]').text()).not.toContain('void');

    diceRollerMock.setResult({
      expression: 'nd 1d6+^1',
      total: 7,
      breakdown: [],
      naturalHints: [{ kind: 'maximum', face: 7, sides: 6, dieId: 2, poolId: 2, context: 'Nimble Primary Die (settled value)' }],
      capped: false,
      ast: { type: 'LITERAL', value: 7 },
      trace: {
        type: 'GROUPED_POOL',
        value: 7,
        intent: 'nimble-damage',
        pools: [{
          type: 'POOL',
          poolId: 2,
          sides: 6,
          provenance: { intent: 'nimble-damage', role: 'primary' },
          subtotal: 7,
          capped: false,
          dice: [{ dieId: 2, sides: 6, initialRoll: 6, rerolls: [], finalValue: 7, dropped: false, capped: false, bumpAmount: 1, exploded: true, events: [{ type: 'ROLLED', value: 6 }, { type: 'BUMPED', from: 6, amount: 1, to: 7 }] }],
        }],
      },
    });
    await nextTick();
    expect(view.find('.dice-roller__natural-cue').exists()).toBe(false);
    const bumpedResult = view.get('.dice-roller__result-button');
    expect(bumpedResult.attributes('aria-label')).toContain('Nat 7 on d6');
    await bumpedResult.trigger('click');
    const bumpedNaturalLabel = view.get('.dice-roller__pool-natural');
    expect(bumpedNaturalLabel.text()).toBe('Nat 7');
    expect(bumpedNaturalLabel.classes()).toContain('dice-roller__pool-natural--maximum');
    expect(view.get('.dice-roller__die--natural-maximum').attributes('aria-label')).toContain('Nat 7 on d6');
  });

  it('warns accessibly when a capped partial result is opened in details', async () => {
    const view = await mountRoller();
    diceRollerMock.setResult({
      expression: '1d6r1',
      total: 1,
      breakdown: [],
      naturalHints: [],
      capped: true,
      ast: { type: 'LITERAL', value: 1 },
      trace: {
        type: 'POOL',
        poolId: 1,
        sides: 6,
        subtotal: 1,
        capped: true,
        dice: [{ dieId: 1, sides: 6, initialRoll: 1, rerolls: [], finalValue: 1, dropped: false, capped: true, bumpAmount: 0, exploded: false }],
      },
    });
    await nextTick();
    await view.get('[aria-label^="Show details for 1d6r1"]').trigger('click');

    const warning = view.get('[role="alert"]');
    expect(warning.text()).toContain('Safety cap reached');
    expect(warning.text()).toContain('partial result');
    expect(view.text()).toContain('Safety cap');
  });
});

describe('diceRoller saved-macro popup actions', () => {
  it('uses a compact accessible save action and keeps popup open through save, rename, delete, save and unsave', async () => {
    const view = await mountRoller();
    await openHistory(view);

    const saveCurrent = view.get('[aria-label="Save current expression"]');
    expect(saveCurrent.element.tagName).toBe('BUTTON');
    expect(saveCurrent.attributes('data-icon')).toBe('bookmark_add');
    expect(saveCurrent.attributes('title')).toBe('Save current expression');
    expect(saveCurrent.text()).toBe('');

    await saveCurrent.trigger('click');
    await flushPromises();
    expectHistoryOpen(view);
    expect(view.get('.dice-roller__macro-load').text()).toContain('1d6');

    vi.spyOn(window, 'prompt').mockReturnValue('Renamed macro');
    await view.get('[aria-label="Rename macro"]').trigger('click');
    await flushPromises();
    expectHistoryOpen(view);
    expect(view.get('.dice-roller__macro-load').text()).toContain('Renamed macro');

    await view.get('[aria-label="Delete macro"]').trigger('click');
    await flushPromises();
    expectHistoryOpen(view);
    expect(view.text()).toContain('No saved macros yet');

    await view.get('[aria-label="Save expression"]').trigger('click');
    await flushPromises();
    expectHistoryOpen(view);
    expect(view.get('.dice-roller__macro-load').text()).toContain('1d4');

    await view.get('[aria-label="Remove saved expression"]').trigger('click');
    await flushPromises();
    expectHistoryOpen(view);
    expect(view.text()).toContain('No saved macros yet');
  });

  it('closes after selecting a saved macro or recent roll', async () => {
    const view = await mountRoller([{ id: 'macro-1', expression: '2d6', profileId: 'none', createdAt: 1 }]);
    await openHistory(view);

    await view.get('.dice-roller__macro-load').trigger('click');
    await flushPromises();
    expect(view.find('.dice-roller__history-menu').attributes('data-open')).toBe('false');
    expect((view.get('[aria-label="Dice expression"]').element as HTMLInputElement).value).toBe('2d6');

    await openHistory(view);
    const recentRoll = view.findAll('button').find(button => button.text() === '1d4 = 4');
    expect(recentRoll).toBeDefined();
    await recentRoll!.trigger('click');
    await flushPromises();
    expect(view.find('.dice-roller__history-menu').attributes('data-open')).toBe('false');
    expect((view.get('[aria-label="Dice expression"]').element as HTMLInputElement).value).toBe('1d4');
  });
});
