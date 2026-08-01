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

// Maps a KeyboardEvent.code (physical key, layout-independent) to the character it
// represents on a US-QWERTY layout
const KEY_CODE_MAP: Record<string, { plain?: string; shift?: string }> = {
  KeyA: { plain: 'a' },
  KeyB: { plain: 'b' },
  KeyD: { plain: 'd' },
  KeyH: { plain: 'h' },
  KeyK: { plain: 'k' },
  KeyL: { plain: 'l' },
  KeyN: { plain: 'n' },
  KeyO: { plain: 'o' },
  KeyP: { plain: 'p' },
  KeyR: { plain: 'r' },
  KeyS: { plain: 's' },
  KeyT: { plain: 't' },
  KeyW: { plain: 'w' },
  Digit0: { plain: '0', shift: ')' },
  Digit1: { plain: '1', shift: '!' },
  Digit2: { plain: '2' },
  Digit3: { plain: '3' },
  Digit4: { plain: '4' },
  Digit5: { plain: '5', shift: '%' },
  Digit6: { plain: '6', shift: '^' },
  Digit7: { plain: '7' },
  Digit8: { plain: '8', shift: '*' },
  Digit9: { plain: '9', shift: '(' },
  Numpad0: { plain: '0' },
  Numpad1: { plain: '1' },
  Numpad2: { plain: '2' },
  Numpad3: { plain: '3' },
  Numpad4: { plain: '4' },
  Numpad5: { plain: '5' },
  Numpad6: { plain: '6' },
  Numpad7: { plain: '7' },
  Numpad8: { plain: '8' },
  Numpad9: { plain: '9' },
  NumpadAdd: { plain: '+' },
  NumpadSubtract: { plain: '-' },
  NumpadDivide: { plain: '/' },
  NumpadMultiply: { plain: '*' },
  Equal: { plain: '=', shift: '+' },
  Minus: { plain: '-' },
  Slash: { plain: '/' },
  Comma: { plain: ',', shift: '<' },
  Period: { plain: '.', shift: '>' },
  Semicolon: { plain: ';', shift: ':' },
  BracketLeft: { plain: '[', shift: '{' },
  BracketRight: { plain: ']', shift: '}' },
  Space: { plain: ' ' },
};

const mapKeyEvent = (event: KeyboardEvent): string | undefined => {
  const mapping = KEY_CODE_MAP[event.code];
  if (!mapping)
    return undefined;
  return event.shiftKey ? (mapping.shift ?? mapping.plain) : mapping.plain;
};

const onKeydown = (event: KeyboardEvent) => {
  // Let browser/OS shortcuts (copy, paste, select-all...) through untouched.
  if (event.ctrlKey || event.metaKey || event.altKey)
    return;

  if (event.code === 'Enter' || event.code === 'NumpadEnter') {
    event.preventDefault();
    roll();
    return;
  }
  if (event.code === 'ArrowUp') {
    event.preventDefault();
    showPrevious();
    return;
  }
  if (event.code === 'ArrowDown') {
    event.preventDefault();
    showNext();
    return;
  }
  if (event.code === 'Backspace') {
    event.preventDefault();
    expression.value = expression.value.slice(0, -1);
    return;
  }
  if (event.code === 'Delete') {
    event.preventDefault();
    expression.value = '';
    return;
  }

  const char = mapKeyEvent(event);
  if (char !== undefined) {
    event.preventDefault();
    expression.value += char;
  }
  // Unmapped physical keys (ArrowLeft/Right, Home/End, Tab, etc.) pass through untouched
  // so native cursor movement, selection, and focus traversal keep working.
};

const pinned = ref(false);
const hovering = ref(false);
const detailVisible = computed(() => pinned.value || hovering.value);

const toggleDetail = () => {
  pinned.value = !pinned.value;
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
    <div class="dice-roller__profiles">
      <VaButton
        v-for="option in diceProfileOptions"
        :key="option.id"
        size="small"
        :preset="profileId === option.id ? undefined : 'secondary'"
        @click="profileId = option.id"
      >
        {{ option.label }}
      </VaButton>
    </div>

    <div class="dice-roller__input-row">
      <input
        v-model="expression"
        class="dice-roller__input va-input-wrapper"
        type="text"
        placeholder="e.g. 4d6kh3, nd 3d6a + 4, 1d20a"
        aria-label="Dice expression"
        @keydown="onKeydown"
      >
      <VaButton :loading="rolling" :disabled="!expression.trim()" @click="roll">
        Roll
      </VaButton>
    </div>

    <p v-if="error" class="dice-roller__error">
      {{ error }}
    </p>

    <div v-if="result" class="dice-roller__result">
      <button
        type="button"
        class="dice-roller__summary"
        @click="toggleDetail"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
      >
        <span class="dice-roller__summary-expression">{{ result.expression }}</span>
        <span class="dice-roller__summary-total">= {{ result.total }}</span>
        <VaIcon v-if="result.capped" name="warning" color="warning" size="small" title="Hit a safety cap" />
      </button>

      <div v-if="detailVisible" class="dice-roller__detail">
        <div v-for="(pool, poolIndex) in result.breakdown" :key="poolIndex" class="dice-roller__pool">
          <span class="dice-roller__pool-subtotal">Pool {{ poolIndex + 1 }}: {{ pool.subtotal }}</span>
          <div class="dice-roller__dice">
            <span
              v-for="(die, dieIndex) in pool.dice"
              :key="dieIndex"
              class="dice-roller__die"
              :class="{
                'dice-roller__die--dropped': die.flags.dropped,
                'dice-roller__die--capped': die.flags.capped,
              }"
              :title="dieFlagLabels(die).join(', ') || 'kept as-is'"
            >
              d{{ die.sides }}: {{ die.rawRoll }}<template v-if="die.finalValue !== die.rawRoll"> &rarr; {{ die.finalValue }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="history.length" class="dice-roller__history">
      <VaCardTitle class="dice-roller__history-title">
        History (&uarr;/&darr;)
      </VaCardTitle>
      <ul class="dice-roller__history-list">
        <li v-for="(entry, index) in history" :key="index">
          <span class="dice-roller__history-expression">{{ entry.expression }}</span>
          <span class="dice-roller__history-total">= {{ entry.total }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dice-roller {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 32rem;
}

.dice-roller__profiles {
  display: flex;
  gap: 0.5rem;
}

.dice-roller__input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dice-roller__input {
  flex: 1;
  padding: 0 0.75rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  font-family: monospace;
  font-size: 1rem;
}

.dice-roller__error {
  color: var(--va-danger);
  margin: 0;
}

.dice-roller__result {
  position: relative;
}

.dice-roller__summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 5%);
  border: none;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.dice-roller__summary-expression {
  font-family: monospace;
  opacity: 0.8;
}

.dice-roller__summary-total {
  font-weight: bold;
  margin-left: auto;
}

.dice-roller__detail {
  margin-top: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 3%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.dice-roller__dice {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.dice-roller__die {
  font-family: monospace;
  font-size: 0.85rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 8%);
}

.dice-roller__die--dropped {
  opacity: 0.4;
  text-decoration: line-through;
}

.dice-roller__die--capped {
  outline: 1px solid var(--va-warning);
}

.dice-roller__history-title {
  padding: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}

.dice-roller__history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 10rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dice-roller__history-list li {
  display: flex;
  gap: 0.5rem;
  font-family: monospace;
  font-size: 0.85rem;
  opacity: 0.7;
}

.dice-roller__history-total {
  margin-left: auto;
}
</style>
