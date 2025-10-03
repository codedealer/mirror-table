<script setup lang="ts">
const sessionStore = useSessionStore();
</script>

<template>
  <div class="drive-tree-container">
    <div class="he-tree session-tree">
      <div class="session-tree-group">
        <div class="session-tree-group__title">
          <span>Private Sessions</span>
        </div>
        <div
          v-for="presence in sessionStore.privateSessions"
          :key="presence.sessionId"
          class="tree-node"
        >
          <SessionExplorerListNode
            :presence="presence"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.session-tree-group {
  margin-inline: calc(-1 * var(--va-tree-view-padding));
}
.session-tree-group__title {
  color: color-mix(in oklab, var(--va-text-primary) 80%, black 20%);
  font-weight: normal;
  border-bottom: 1px solid var(--va-background-border);
  padding-bottom: 6px;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  font-size: 13px;
}
</style>
