<script setup lang="ts">
const tableExplorerStore = useTableExplorerStore();
const sceneStore = useSceneStore();
</script>

<template>
  <div class="drive-directory-tree-header">
    <div
      v-if="tableExplorerStore.rootNode"
      class="drive-directory-tree-header__content"
    >
      <div class="drive-directory-tree-header__root-nav">
        <va-popover
          message="Reload"
        >
          <va-button
            preset="plain"
            color="primary"
            size="medium"
            :loading="tableExplorerStore.rootNode.loading"
            :disabled="tableExplorerStore.rootNode.disabled"
            @click="tableExplorerStore.loadChildren(tableExplorerStore.rootNode)"
          >
            <div class="drive-node__icon">
              <va-icon
                name="refresh"
                color="primary"
                size="medium"
                class="drive-node__icon"
              />
            </div>
          </va-button>
        </va-popover>
      </div>
      <div
        class="drive-directory-tree-header__folder-title"
        :title="tableExplorerStore.rootNode.label"
      >
        {{ tableExplorerStore.rootNode?.label }}
      </div>
      <div class="drive-directory-tree-header__actions">
        <va-popover
          message="Search (SHIFT + S)"
        >
          <va-button
            preset="plain"
            color="primary"
            size="medium"
            @click="sceneStore.searchModalState = true"
          >
            <div class="drive-node__icon">
              <va-icon
                name="search"
                color="primary"
                size="medium"
                class="drive-node__icon"
              />
            </div>
          </va-button>
        </va-popover>

        <TableExplorerTreeCategoryContextMenu
          :node="tableExplorerStore.rootNode"
          :path="[]"
        />
      </div>
    </div>
    <div v-else class="drive-directory-tree-header__content">
      <div class="drive-directory-tree-header__folder-title">
        <va-icon
          :name="tableExplorerStore.isReady ? 'person_off' : 'sync'"
          color="primary-dark"
          size="large"
          :spin="!tableExplorerStore.isReady"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
