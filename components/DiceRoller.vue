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

const historyOpen = ref(false);

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

      <VaInput
        v-model="expression"
        class="dice-roller__input"
        placeholder="4d6kh3 + 2"
        aria-label="Dice expression"
        @keydown="rememberPhysicalKey"
        @beforeinput="remapBeforeInput"
        @keyup.enter="roll"
        @keyup.up="showPrevious"
        @keyup.down="showNext"
      />

      <VaButton
        class="dice-roller__roll-button"
        icon="casino"
        :loading="rolling"
        :disabled="!expression.trim()"
        aria-label="Roll dice"
        @click="roll"
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
  min-height: 3.75rem;
  padding: 0.4rem 0.5rem;
  border-top: 3px solid var(--va-primary);
  background: var(--va-background-element);
  box-shadow: 0 0.35rem 1rem rgb(0 0 0 / 12%);
}

.dice-roller__profile-button,
.dice-roller__roll-button,
.dice-roller__history-button {
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
}
</style>
