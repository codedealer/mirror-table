<script setup lang="ts">
import type { DynamicPanelModelType, WidgetCandelaPlayer } from '~/models/types';
import { useDebounceFn } from '@vueuse/core';

const props = defineProps<{
  panel: DynamicPanelModelType;
  widget: WidgetCandelaPlayer;
}>();

const {
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
} = usePreviewImage(toRef(() => props.widget.player?.avatar), {
  strategy: DataRetrievalStrategies.LAZY,
});

const tableStore = useTableStore();
const widgetStore = useWidgetStore();

const showPrivateContent = computed(() => {
  return tableStore.mode === TableModes.OWN && props.widget.privateContent;
});

// Quick edit mode for numerical stats (only for owners)
const canQuickEdit = computed(() => tableStore.mode === TableModes.OWN);

// Track which stat is currently being edited
const editingStat = ref<'body' | 'mind' | 'bleed' | 'scars' | null>(null);

// Local values for editing (to avoid direct mutation)
const localMarks = ref({
  body: 0,
  mind: 0,
  bleed: 0,
});
const localScars = ref(0);

// Sync local values when widget changes or editing starts
const startEditing = async (stat: 'body' | 'mind' | 'bleed' | 'scars') => {
  if (!canQuickEdit.value)
    return;

  localMarks.value = { ...props.widget.player.marks };
  localScars.value = props.widget.player.scars;
  editingStat.value = stat;

  // Focus the input after it renders
  await nextTick();
  const input = document.querySelector('.stat-editing .stat-input') as HTMLInputElement | null;
  input?.focus();
  input?.select();
};

const stopEditing = () => {
  editingStat.value = null;
};

// Debounced save function
const saveMarks = useDebounceFn(async () => {
  if (!props.widget.id)
    return;

  await widgetStore.updateWidget<WidgetCandelaPlayer>(props.widget.id, {
    player: {
      marks: { ...localMarks.value },
      scars: localScars.value,
    },
  });
}, 500);

// Handle value changes
const updateMark = (mark: 'body' | 'mind' | 'bleed', value: number) => {
  localMarks.value[mark] = value;
  saveMarks();
};

const updateScars = (value: number) => {
  localScars.value = value;
  saveMarks();
};

// Handle blur to close editing - only if still editing the same stat
const handleBlur = (stat: 'body' | 'mind' | 'bleed' | 'scars') => {
  // Small delay to allow click events to process first
  setTimeout(() => {
    // Only stop if we're still editing the same stat (not switched to another)
    if (editingStat.value === stat) {
      stopEditing();
    }
  }, 150);
};
</script>

<template>
  <va-card outlined :bordered="false" class="card-thin">
    <TableWidgetsControls :panel="panel" :widget="widget" />
    <va-card-block>
      <va-card-content style="padding-bottom: 0">
        <div class="widget-candela-player-title">
          <p class="widget-candela-player-name">
            {{ widget.player.name }}
          </p>
          <p class="widget-candela-player-role">
            <span
              v-show="widget.player.role"
              class="widget-candela-player-role__role"
            >
              {{ widget.player.speciality ? `${widget.player.role}:` : widget.player.role }}
            </span>
            <span
              class="widget-candela-player-role__speciality"
            >
              {{ widget.player.speciality }}
            </span>
          </p>
        </div>
      </va-card-content>
    </va-card-block>
    <va-card-block>
      <va-card-content :class="widget?.player?.avatar ? 'grid-img-text' : ''">
        <div v-if="widget?.player?.avatar" class="widget-avatar">
          <DriveThumbnail
            :file="imageFile"
            :error="imageError"
            :file-is-loading="imageLoading"
            width="120"
            height="120"
            fit="cover"
          />
        </div>
        <div class="widget-content">
          <div class="widget-candela-player-stats mb-05">
            <!-- Body -->
            <div
              class="widget-candela-player-stat"
              :class="{ 'stat-editable': canQuickEdit, 'stat-editing': editingStat === 'body' }"
              @click="startEditing('body')"
            >
              <va-icon v-show="editingStat !== 'body'" name="man" />
              <input
                v-if="editingStat === 'body'"
                v-model.number="localMarks.body"
                type="number"
                class="stat-input"
                @input="updateMark('body', localMarks.body)"
                @blur="handleBlur('body')"
                @keydown.enter="stopEditing"
                @click.stop
              >
              <span v-else>{{ widget.player.marks.body }}</span>
            </div>
            <!-- Mind -->
            <div
              class="widget-candela-player-stat"
              :class="{ 'stat-editable': canQuickEdit, 'stat-editing': editingStat === 'mind' }"
              @click="startEditing('mind')"
            >
              <va-icon v-show="editingStat !== 'mind'" name="psychology" />
              <input
                v-if="editingStat === 'mind'"
                v-model.number="localMarks.mind"
                type="number"
                class="stat-input"
                @input="updateMark('mind', localMarks.mind)"
                @blur="handleBlur('mind')"
                @keydown.enter="stopEditing"
                @click.stop
              >
              <span v-else>{{ widget.player.marks.mind }}</span>
            </div>
            <!-- Bleed -->
            <div
              class="widget-candela-player-stat"
              :class="{ 'stat-editable': canQuickEdit, 'stat-editing': editingStat === 'bleed' }"
              @click="startEditing('bleed')"
            >
              <va-icon v-show="editingStat !== 'bleed'" name="wifi_tethering" />
              <input
                v-if="editingStat === 'bleed'"
                v-model.number="localMarks.bleed"
                type="number"
                class="stat-input"
                @input="updateMark('bleed', localMarks.bleed)"
                @blur="handleBlur('bleed')"
                @keydown.enter="stopEditing"
                @click.stop
              >
              <span v-else>{{ widget.player.marks.bleed }}</span>
            </div>
            <!-- Scars -->
            <div
              class="widget-candela-player-stat"
              :class="{ 'stat-editable': canQuickEdit, 'stat-editing': editingStat === 'scars' }"
              @click="startEditing('scars')"
            >
              <va-icon v-show="editingStat !== 'scars'" name="healing" color="danger-dark" />
              <input
                v-if="editingStat === 'scars'"
                v-model.number="localScars"
                type="number"
                class="stat-input"
                @input="updateScars(localScars)"
                @blur="handleBlur('scars')"
                @keydown.enter="stopEditing"
                @click.stop
              >
              <span v-else>{{ widget.player.scars }}</span>
            </div>
          </div>
          <MarkdownRenderer :source="widget.content" />
        </div>
      </va-card-content>
    </va-card-block>
    <va-card-block
      v-if="showPrivateContent"
      class="widget-private-content"
    >
      <va-card-content>
        <MarkdownRenderer :source="widget.privateContent" />
      </va-card-content>
    </va-card-block>
  </va-card>
</template>

<style scoped lang="scss">
.stat-editable {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--va-background-element);
  }
}

.stat-editing {
  background-color: var(--va-background-element);
}

.stat-input {
  width: 2.5em;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--va-primary);
  color: inherit;
  font-size: inherit;
  font-family: inherit;
  text-align: center;
  padding: 0;
  margin: 0;
  outline: none;

  // Hide number input spinners for cleaner look
  appearance: textfield;
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}
</style>
