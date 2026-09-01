<script setup lang="ts">
const prototypes = [
  {
    id: 'dice-roller',
    label: 'Dice roller',
    description: 'Input and notation experiments.',
  },
  {
    id: 'nimble-group',
    label: 'Nimble group',
    description: 'Exercise the Nimble group widget with local mock actors.',
  },
] as const;

type PrototypeId = typeof prototypes[number]['id'];

definePageMeta({
  layout: false,
});

useSeoMeta({
  title: 'Prototype Lab',
});

const route = useRoute();
const activePrototype = computed<PrototypeId>(() => {
  const requestedPrototype = route.query.prototype;
  const prototypeId = Array.isArray(requestedPrototype)
    ? requestedPrototype[0]
    : requestedPrototype;
  const prototype = prototypes.find(prototype => prototype.id === prototypeId);

  return prototype?.id ?? 'dice-roller';
});

const selectPrototype = (prototype: PrototypeId) => {
  navigateTo({ path: '/dev', query: { prototype } });
};

// Keep the playground entirely local: no auth store, Firebase, or production settings.
const localDiceMacros = ref<import('~/models/Dice').DiceRollerMacro[]>([]);
const localDiceMacroAdapter = {
  load: () => localDiceMacros.value,
  save: (macros: import('~/models/Dice').DiceRollerMacro[]) => {
    localDiceMacros.value = macros;
  },
};
</script>

<template>
  <NuxtLayout name="dev">
    <template #navigation>
      <VaSidebarItem
        v-for="prototype in prototypes"
        :key="prototype.id"
        :active="activePrototype === prototype.id"
        active-color="#fa45ab20"
        hover-color="primary"
        @click="selectPrototype(prototype.id)"
      >
        <VaSidebarItemContent>
          <VaIcon :name="prototype.id === 'dice-roller' ? 'casino' : 'groups'" color="primary" />
          <VaSidebarItemTitle>{{ prototype.label }}</VaSidebarItemTitle>
        </VaSidebarItemContent>
      </VaSidebarItem>
    </template>

    <div class="prototype-view">
      <VaCard>
        <VaCardTitle>{{ prototypes.find(prototype => prototype.id === activePrototype)?.label }}</VaCardTitle>
        <VaCardContent>
          {{ prototypes.find(prototype => prototype.id === activePrototype)?.description }}
        </VaCardContent>
      </VaCard>

      <VaCard
        v-if="activePrototype === 'dice-roller'"
        class="prototype-view__content"
      >
        <VaCardTitle>Dice roller</VaCardTitle>
        <VaCardContent>
          <DiceRoller :macro-adapter="localDiceMacroAdapter" />
        </VaCardContent>
      </VaCard>

      <VaCard
        v-else-if="activePrototype === 'nimble-group'"
        class="prototype-view__content"
      >
        <VaCardTitle>Nimble group</VaCardTitle>
        <VaCardContent>
          <DevNimbleGroupLab />
        </VaCardContent>
      </VaCard>
    </div>
  </NuxtLayout>
</template>

<style scoped lang="scss">
.prototype-view {
  max-width: 60rem;
}

.prototype-view__content {
  margin-top: 1rem;
}

.prototype-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 1rem;
}

.prototype-controls :deep(.va-input-wrapper) {
  min-width: 13rem;
}
</style>
