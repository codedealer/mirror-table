<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core';
import type { ItemSelectorOption } from '~/models/types';

const props = withDefaults(defineProps<{
  options: ItemSelectorOption[]
  loading?: boolean
}>(), {
  loading: false,
});

const inputModel = defineModel<string>({
  required: true,
});

const selected = defineModel<ItemSelectorOption>('selected', {
  required: false,
});

const showNoResults = computed(() => {
  return props.options.length === 0 && !props.loading && inputModel.value.length > 0;
});

const active = ref<ItemSelectorOption>();

watchEffect(() => {
  if (props.options.length === 0) {
    active.value = undefined;
    return;
  }

  if (selected.value) {
    active.value = selected.value;
    return;
  }

  if (active.value && props.options.includes(active.value)) {
    return;
  }

  active.value = props.options[0];
});

const container = ref();

const findActiveIndex = () => {
  return props.options.findIndex(option => option.id === active.value?.id);
};

const moveUp = () => {
  const index = findActiveIndex();

  if (index < 1) {
    return;
  }

  active.value = props.options[index - 1];
};

const moveDown = () => {
  const index = findActiveIndex();

  if (index === -1 || index === props.options.length - 1) {
    return;
  }

  active.value = props.options[index + 1];
};

const select = (option: ItemSelectorOption) => {
  selected.value = option;
};

onKeyStroke(['ArrowUp', 'ArrowDown', 'Enter'], (event) => {
  event.preventDefault();
  event.stopPropagation();

  if (event.key === 'Enter') {
    if (active.value) {
      select(active.value);
    }

    return;
  }

  if (event.key === 'ArrowUp') {
    moveUp();
  } else {
    moveDown();
  }
}, {
  target: container,
  dedupe: true,
});
</script>

<template>
  <div ref="container" class="item-selector">
    <va-input
      v-model="inputModel"
      v-bind="$attrs"
      class="item-selector__input"
    />

    <va-inner-loading :loading="loading">
      <div
        v-show="!showNoResults"
        class="item-selector__result"
      >
        <va-scroll-container vertical>
          <div class="item-selector__options">
            <a
              v-for="option in options"
              :key="option.id"
              :class="active && active.id === option.id ? 'item-selector__item--active' : ''"
              class="item-selector__item"
              href="#"
              @click.prevent="select(option)"
            >
              <slot :option="option">
                <va-list-item-section>
                  <va-list-item-label caption>
                    {{ option.id }}
                  </va-list-item-label>
                </va-list-item-section>
              </slot>
            </a>
          </div>
        </va-scroll-container>
      </div>

      <div
        v-show="showNoResults"
        class="item-selector__result item-selector__result--empty"
      >
        <va-card outlined>
          <va-card-content>
            <p class="centered">
              <em>No results found</em>
            </p>
          </va-card-content>
        </va-card>
      </div>
    </va-inner-loading>
  </div>
</template>

<style scoped lang="scss">
.item-selector__input {
  width: 100%;
}
.item-selector__result {
  margin-top: 2rem;
  height: min(var(--va-modal-dialog-max-height), 45vh);

  &--empty {
    em {
      opacity: 0.8;
      font-size: 85%;
    }
  }

  .item-selector__item {
    --active-color: color-mix(in oklab, var(--va-primary-dark) 40%, transparent 60%);
    --hover-color: color-mix(in oklab, var(--va-primary-dark) 20%, transparent 80%);
    --border-radius: 6px;

    min-height: 2rem;
    padding: 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    border-radius: var(--border-radius);
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: var(--hover-color);
    }

    &:focus {
      outline: none;
    }

    &--active {
      background-color: var(--active-color);
    }
  }
}
</style>
