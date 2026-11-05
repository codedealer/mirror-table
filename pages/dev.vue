<script setup lang="ts">
const prototypes = [
  {
    id: 'dice-roller',
    label: 'Dice roller',
    description: 'Input and notation experiments.',
  },
  {
    id: 'image-framing',
    label: 'Image framing',
    description: 'Explore local image crops and a mock parent save flow.',
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

// Keep rendered destinations unique by their visible name as well as their route.
// This prevents a stale/aliased lab entry from appearing as a second sidebar tab.
const sidebarPrototypes = computed(() => {
  const labels = new Set<string>();
  return prototypes.filter((prototype) => {
    if (labels.has(prototype.label))
      return false;
    labels.add(prototype.label);
    return true;
  });
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
        v-for="prototype in sidebarPrototypes"
        :key="prototype.id"
        :active="activePrototype === prototype.id"
        active-color="primary"
        hover-color="primary"
        @click="selectPrototype(prototype.id)"
      >
        <VaSidebarItemContent>
          <VaIcon :name="prototype.id.startsWith('dice-roller') ? 'casino' : 'groups'" />
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
        <VaCardContent>
          <DevDiceRollerLab :macro-adapter="localDiceMacroAdapter" />
        </VaCardContent>
      </VaCard>

      <VaCard
        v-else-if="activePrototype === 'image-framing'"
        class="prototype-view__content"
      >
        <VaCardTitle>Image framing lab</VaCardTitle>
        <VaCardContent><DevImageFramingLab /></VaCardContent>
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
