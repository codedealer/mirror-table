<script setup lang="ts">
const prototypes = [
  {
    id: 'dice-roller',
    label: 'Dice roller',
    description: 'Input and notation experiments.',
  },
  {
    id: 'controls',
    label: 'Control samples',
    description: 'A small reference view for future UI work.',
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
          <VaIcon :name="prototype.id === 'dice-roller' ? 'casino' : 'tune'" color="primary" />
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
          <DiceRoller />
        </VaCardContent>
      </VaCard>

      <VaCard
        v-else
        class="prototype-view__content"
      >
        <VaCardTitle>Control samples</VaCardTitle>
        <VaCardContent>
          <div class="prototype-controls">
            <VaButton>
              Primary action
            </VaButton>
            <VaButton preset="secondary">
              Secondary action
            </VaButton>
            <VaInput label="Example field" placeholder="A future control" />
          </div>
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
