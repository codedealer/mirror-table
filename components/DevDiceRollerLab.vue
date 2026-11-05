<script setup lang="ts">
import type { DiceRollerMacroAdapter } from '~/composables/useDiceRollerMacros';
import type { DiceProfileId } from '~/models/Dice';
import DiceRoller from './DiceRoller.vue';

const props = defineProps<{ macroAdapter?: DiceRollerMacroAdapter }>();

interface Fixture {
  id: string;
  label: string;
  expression: string;
  profileId: DiceProfileId;
  draws: number[];
}

const fixtures: Fixture[] = [
  {
    id: 'natural-one-keep-drop',
    label: 'D&D Nat 1 with Keep/Drop',
    expression: '2d20kl1',
    profileId: 'dnd5e',
    draws: [1, 3],
  },
  {
    id: 'natural-twenty',
    label: 'D&D Nat 20',
    expression: '1d20',
    profileId: 'dnd5e',
    draws: [20],
  },
  {
    id: 'grouped-arithmetic',
    label: 'Complex grouped arithmetic',
    expression: 'nd 2d6 + 2 + (1d8 + 2) * 2',
    profileId: 'nimble5e',
    draws: [5, 3, 8],
  },
  {
    id: 'explosion',
    label: 'Nimble primary explosion',
    expression: 'nd 1d6',
    profileId: 'nimble5e',
    draws: [6, 4],
  },
  {
    id: 'critical-miss-sibling',
    label: 'Nimble critical miss with sibling',
    expression: 'nd 1d6 + nd 1d6',
    profileId: 'nimble5e',
    draws: [1, 4],
  },
  {
    id: 'repetition-local-void',
    label: 'Repetition with a local void',
    expression: '(nd 1d6 + nd 1d6 + 2)~2',
    profileId: 'nimble5e',
    draws: [1, 4, 3, 2],
  },
  {
    id: 'repeated-nimble-modifier',
    label: 'Repeated Nimble modifier',
    expression: '(nd 1d6 + 2)~2',
    profileId: 'nimble5e',
    draws: [3, 4],
  },
];

const roller = ref<{
  loadDeterministicResult: (fixture: Pick<Fixture, 'expression' | 'profileId' | 'draws'>) => Promise<void>;
  clearDeterministicResult: () => void;
} | null>(null);
const selectedFixture = ref<Fixture>();

const selectFixture = async (fixture: Fixture) => {
  selectedFixture.value = fixture;
  await roller.value?.loadDeterministicResult(fixture);
};

const reset = () => {
  selectedFixture.value = undefined;
  roller.value?.clearDeterministicResult();
};
</script>

<template>
  <section class="dice-result-lab" aria-label="Deterministic dice roller result presets">
    <div class="dice-result-lab__buttons" role="group" aria-label="Result presets">
      <VaButton
        v-for="fixture in fixtures"
        :key="fixture.id"
        preset="secondary"
        :color="selectedFixture?.id === fixture.id ? 'primary-dark' : 'secondary'"
        :class="{ 'dice-result-lab__fixture--selected': selectedFixture?.id === fixture.id }"
        :aria-pressed="selectedFixture?.id === fixture.id"
        @click="selectFixture(fixture)"
      >
        {{ fixture.label }}
      </VaButton>
      <VaButton preset="secondary" color="secondary" aria-label="Reset selected fixture" title="Clear the selected fixture and result" :disabled="!selectedFixture" @click="reset">
        Reset fixture
      </VaButton>
    </div>
    <p v-if="selectedFixture" class="dice-result-lab__selection" role="status">
      <strong>Selected: {{ selectedFixture.label }}</strong>
      <span> · {{ selectedFixture.profileId }} · <code>{{ selectedFixture.expression }}</code></span>
    </p>
    <DiceRoller ref="roller" :macro-adapter="props.macroAdapter" />
  </section>
</template>

<style scoped lang="scss">
.dice-result-lab__selection {
  margin: 0 0 0.75rem;
}

.dice-result-lab__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dice-result-lab__fixture--selected {
  box-shadow: 0 0 0 2px var(--va-primary);
}

.dice-result-lab__selection {
  font-size: 0.875rem;
}
</style>
