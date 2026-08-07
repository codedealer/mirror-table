<script setup lang="ts">
import type { DieResult } from '~/models/Dice';
import { diceProfileOptions } from '~/composables/useDiceRoller';

const {
  expression,
  profileId,
  result,
  error,
  rolling,
  history,
  roll,
  showPrevious,
  showNext,
} = useDiceRoller();

const inputRef = ref<{ $el?: HTMLElement } | null>(null);
const historyOpen = ref(false);
const syntaxHelpOpen = ref(false);

const syntaxGroups = [
  {
    title: 'General',
    entries: [
      { syntax: 'NdX', description: 'Roll N dice with X sides.', example: '3d6 + 5' },
      { syntax: 'khN / kN', description: 'Keep the highest N dice.', example: '4d6kh3' },
      { syntax: 'klN', description: 'Keep the lowest N dice.', example: '2d20kl1' },
      { syntax: 'dlN / dhN', description: 'Drop the lowest or highest N dice.', example: '4d6dl1' },
      { syntax: '!', description: 'Explode dice on their maximum face.', example: '3d6!' },
      { syntax: '!N / !>=N', description: 'Explode when a die meets a threshold.', example: '1d10!>=8' },
      { syntax: '!p / ![N]', description: 'Explode only the primary or numbered die.', example: '3d6!p' },
      { syntax: '!!', description: 'Compound an explosion into the same die.', example: '1d6!!' },
      { syntax: 'rN / r<=N', description: 'Reroll while the condition is met.', example: '1d20r1' },
      { syntax: 'roN', description: 'Reroll once when the condition is met.', example: '1d20ro1' },
      { syntax: '{ ... }', description: 'Combine pools with individual rules.', example: '{1d6!, 2d6} + 2' },
      { syntax: '( ... )', description: 'Group arithmetic using normal precedence.', example: '(1d6 + 2) * 3' },
      { syntax: 'std: / raw:', description: 'Use standard rolling inside a profile.', example: 'std: 1d20' },
    ],
  },
  {
    title: 'D&D 5e',
    entries: [
      { syntax: 'NdXaM', description: 'Advantage: roll M extra dice and drop the lowest M.', example: '1d20a' },
      { syntax: 'NdXdM', description: 'Disadvantage: roll M extra dice and drop the highest M.', example: '1d20d' },
    ],
  },
  {
    title: 'Nimble',
    entries: [
      { syntax: 'nd NdX', description: 'Nimble damage: the primary die explodes.', example: 'nd 2d6' },
      { syntax: 'nd NdXaM', description: 'Nimble damage with advantage on the primary die.', example: 'nd 2d6a' },
      { syntax: 'nd NdXdM', description: 'Nimble damage with disadvantage on the primary die.', example: 'nd 2d6d' },
      { syntax: 'nd NdX + M', description: 'Nimble damage with a flat modifier.', example: 'nd 2d6 + 3' },
      { syntax: '+^N / bN', description: 'Bump each face value, capped at the die maximum.', example: '1d6+^1' },
    ],
  },
];

const selectExpression = async () => {
  await nextTick();
  inputRef.value?.$el?.querySelector('input')?.select();
};

const rollAndSelectExpression = async () => {
  if (await roll())
    await selectExpression();
};

const showNextOrClearExpression = () => {
  if (!showNext())
    expression.value = '';
};

const profileMenuOptions = computed(() => diceProfileOptions.map(option => ({
  text: option.label,
  value: option.id,
  rightIcon: profileId.value === option.id ? 'check' : undefined,
})));

const historyMenuOptions = computed(() => history.value.map((entry, index) => ({
  text: `${entry.expression} = ${entry.total}`,
  value: index,
})));

const selectProfile = (option: { value: string }) => {
  profileId.value = option.value as typeof profileId.value;
};

const selectHistoryEntry = (index: number) => {
  const entry = history.value[index];
  if (!entry)
    return;
  result.value = entry;
  expression.value = entry.expression;
  error.value = undefined;
  historyOpen.value = false;
};

const physicalKeyMap: Record<string, string> = Object.fromEntries(
  Array.from({ length: 26 }, (_, index) => {
    const letter = String.fromCharCode(65 + index);
    return [`Key${letter}`, letter.toLowerCase()];
  }),
);

let pendingPhysicalKey: { code: string; shiftKey: boolean } | undefined;

const rememberPhysicalKey = (event: KeyboardEvent) => {
  if (!(event.target instanceof HTMLInputElement))
    return;

  pendingPhysicalKey = { code: event.code, shiftKey: event.shiftKey };
};

const remapBeforeInput = (event: InputEvent) => {
  const input = event.target;
  const physicalKey = pendingPhysicalKey;
  pendingPhysicalKey = undefined;

  if (!(input instanceof HTMLInputElement))
    return;

  if (event.inputType !== 'insertText' || event.isComposing || event.data == null || [...event.data].length !== 1 || physicalKey == null)
    return;

  const replacement = physicalKeyMap[physicalKey.code];
  if (replacement == null)
    return;

  event.preventDefault();

  const mapped = physicalKey.shiftKey ? replacement.toUpperCase() : replacement;
  input.setRangeText(
    mapped,
    input.selectionStart ?? input.value.length,
    input.selectionEnd ?? input.value.length,
    'end',
  );
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: mapped,
  }));
};

const dieFlagLabels = (die: DieResult): string[] => {
  const labels: string[] = [];
  if (die.flags.dropped)
    labels.push('dropped');
  if (die.flags.exploded)
    labels.push('exploded');
  if (die.flags.rerolled)
    labels.push('rerolled');
  if (die.flags.bumped)
    labels.push('bumped');
  if (die.flags.capped)
    labels.push('capped');
  return labels;
};
</script>

<template>
  <div class="dice-roller">
    <section class="dice-roller__row" aria-label="Dice roller">
      <slot name="leading" />

      <VaMenu :options="profileMenuOptions" @selected="selectProfile">
        <template #anchor>
          <VaButton
            class="dice-roller__profile-button"
            preset="secondary"
            :color="profileId === 'none' ? 'tertiary' : 'primary-dark'"
            icon="settings"
            :aria-label="`Dice profile: ${diceProfileOptions.find(option => option.id === profileId)?.label}`"
          />
        </template>
      </VaMenu>

      <VaDropdown v-model="historyOpen" class="dice-roller__history-menu" placement="bottom-start">
        <template #anchor>
          <VaButton class="dice-roller__history-button" preset="secondary" color="tertiary" icon="history" aria-label="Roll history" :disabled="!history.length" />
        </template>
        <VaDropdownContent class="dice-roller__history-content">
          <va-scroll-container vertical class="dice-roller__history-scroll">
            <VaMenuList :options="historyMenuOptions" value-by="value" @selected="selectHistoryEntry" />
          </va-scroll-container>
        </VaDropdownContent>
      </VaDropdown>

      <VaButton
        class="dice-roller__help-button"
        preset="secondary"
        color="tertiary"
        icon="help_outline"
        aria-label="Dice syntax help"
        @click="syntaxHelpOpen = true"
      />

      <VaInput
        ref="inputRef"
        v-model="expression"
        class="dice-roller__input"
        placeholder="4d6kh3 + 2"
        aria-label="Dice expression"
        @keydown="rememberPhysicalKey"
        @beforeinput="remapBeforeInput"
        @keyup.enter="rollAndSelectExpression"
        @keyup.up="showPrevious"
        @keyup.down="showNextOrClearExpression"
      />

      <VaButton
        class="dice-roller__roll-button"
        icon="casino"
        :loading="rolling"
        :disabled="!expression.trim()"
        aria-label="Roll dice"
        @click="rollAndSelectExpression"
      />

      <VaDivider vertical style="align-self:normal; margin-block:5px" />

      <VaDropdown class="dice-roller__result-menu" placement="bottom-end">
        <template #anchor>
          <VaButton class="dice-roller__result-button" preset="primary" :aria-label="result ? `Show details for ${result.expression}` : 'No roll yet'">
            <strong class="dice-roller__total">{{ result?.total ?? 0 }}</strong>
          </VaButton>
        </template>
        <VaDropdownContent class="dice-roller__detail">
          <template v-if="result">
            <div class="dice-roller__detail-title">
              Roll details
            </div>
            <div v-for="(pool, poolIndex) in result.breakdown" :key="poolIndex" class="dice-roller__pool">
              <span class="dice-roller__pool-subtotal">Pool {{ poolIndex + 1 }} <strong>{{ pool.subtotal }}</strong></span>
              <div class="dice-roller__dice">
                <VaChip
                  v-for="(die, dieIndex) in pool.dice"
                  :key="dieIndex"
                  size="small"
                  :color="die.flags.dropped ? 'secondary' : die.flags.capped ? 'warning' : 'background-element'"
                  :class="{ 'dice-roller__die--dropped': die.flags.dropped }"
                  :title="dieFlagLabels(die).join(', ') || 'kept as-is'"
                >
                  d{{ die.sides }}: {{ die.rawRoll }}<template v-if="die.finalValue !== die.rawRoll">
                    &rarr; {{ die.finalValue }}
                  </template>
                </VaChip>
              </div>
            </div>
          </template>
          <span v-else class="dice-roller__detail-empty">Roll the dice to see details.</span>
        </VaDropdownContent>
      </VaDropdown>

      <slot name="trailing" />
    </section>

    <VaModal
      v-model="syntaxHelpOpen"
      class="top-tier-modal"
      title="Dice syntax"
      size="large"
      close-button
      hide-default-actions
    >
      <va-scroll-container vertical class="dice-roller__syntax-scroll">
        <section v-for="group in syntaxGroups" :key="group.title" class="dice-roller__syntax-group">
          <h2>{{ group.title }}</h2>
          <dl>
            <div v-for="entry in group.entries" :key="entry.syntax" class="dice-roller__syntax-entry">
              <dt><code>{{ entry.syntax }}</code></dt>
              <dd>{{ entry.description }} <code>{{ entry.example }}</code></dd>
            </div>
          </dl>
        </section>
      </va-scroll-container>
    </VaModal>

    <VaAlert v-if="error" color="danger" outline>
      {{ error }}
    </VaAlert>
  </div>
</template>

<style scoped lang="scss">
.dice-roller {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 48rem;
}

.dice-roller__row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.25rem;
  border-top: 3px solid var(--va-primary);
  background: var(--va-background-element);
  box-shadow: 0 0.35rem 1rem rgb(0 0 0 / 12%);
}

.dice-roller__profile-button,
.dice-roller__roll-button,
.dice-roller__history-button,
.dice-roller__help-button {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
}

.dice-roller__result-menu {
  flex-shrink: 0;
}

.dice-roller__history-menu {
  flex-shrink: 0;
}

.dice-roller__history-content {
  padding: 0;
}

.dice-roller__history-scroll {
  max-height: min(24rem, calc(100vh - 8rem));
}

.dice-roller__syntax-scroll {
  max-height: min(70vh, 42rem);
  padding-right: 0.5rem;
}

.dice-roller__syntax-group + .dice-roller__syntax-group {
  margin-top: 1.5rem;
}

.dice-roller__syntax-group h2 {
  margin: 0 0 0.5rem;
  color: var(--va-primary);
  font-size: 1.1rem;
}

.dice-roller__syntax-group dl {
  display: grid;
  gap: 0.5rem;
  margin: 0;
}

.dice-roller__syntax-entry {
  display: grid;
  grid-template-columns: minmax(6rem, 8rem) 1fr;
  gap: 0.75rem;
  align-items: baseline;
}

.dice-roller__syntax-entry dt,
.dice-roller__syntax-entry dd {
  margin: 0;
}

.dice-roller__syntax-entry dt code {
  color: var(--va-primary);
  font-weight: 700;
}

.dice-roller__syntax-entry dd {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
}

.dice-roller__syntax-entry dd code {
  opacity: 0.75;
}

.dice-roller .va-modal-entry {
  display: contents;
}

.dice-roller__result-button {
  width: 3.5rem;
  height: 2.25rem;
  flex-shrink: 0;
  justify-content: center;
}

.dice-roller__input {
  width: min(12rem, 42vw);
  flex: 0 1 12rem;
}

.dice-roller__roll-button {
  display: none;
}

.dice-roller__total {
  color: var(--va-primary);
  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1;
}

.dice-roller__detail {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: min(28rem, calc(100vw - 2rem));
}

.dice-roller__detail-title {
  color: var(--va-primary);
  font-weight: 700;
}

.dice-roller__detail-empty {
  opacity: 0.7;
}

.dice-roller__pool {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dice-roller__pool-subtotal {
  font-size: 0.85rem;
  opacity: 0.7;
}

.dice-roller__pool-subtotal strong {
  color: var(--va-text-primary);
  margin-left: 0.25rem;
}

.dice-roller__dice {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.dice-roller__die--dropped {
  opacity: 0.45;
  text-decoration: line-through;
}

@media (max-width: 520px) {
  .dice-roller__row {
    gap: 0.1rem;
  }

  .dice-roller__input {
    width: auto;
    flex-basis: 0;
  }

  .dice-roller__roll-button {
    display: inline-flex;
  }

  .dice-roller__total {
    font-size: 1.35rem;
  }

  .dice-roller__syntax-entry {
    grid-template-columns: 1fr;
    gap: 0.125rem;
  }
}
</style>
