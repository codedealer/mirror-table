<script setup lang="ts">
const hotkeyStore = useHotkeyStore();
const { isHotkeyModalVisible } = storeToRefs(hotkeyStore);
</script>

<template>
  <va-modal
    v-model="isHotkeyModalVisible"
    title="Hotkeys"
    close-button
    hide-default-actions
  >
    <va-card outlined>
      <va-card-content>
        <div class="hotkey-body">
          <div
            v-for="group in hotkeyStore.groupedHotkeys"
            :key="group.namespace"
            class="hotkey-group"
          >
            <h3 class="namespace-title">
              {{ group.namespace }}
            </h3>
            <div
              v-for="hotkey in group.hotkeys"
              :key="`${hotkey.namespace}-${hotkey.key}`"
              class="hotkey-row"
            >
              <KbdLabel
                :button="hotkey.key"
                :modifiers="Object.keys(hotkey.modifiers)"
                size="large"
              />
              <span class="hotkey-description">{{ hotkey.description }}</span>
            </div>
          </div>
        </div>
      </va-card-content>
    </va-card>
  </va-modal>
</template>

<style scoped lang="scss">
.namespace-title {
  font-size: 1.1rem;
  font-weight: 400;
  padding-bottom: 3px;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--va-background-border);
}
.hotkey-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
</style>
