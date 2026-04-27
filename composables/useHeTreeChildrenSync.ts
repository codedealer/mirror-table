import type { Stat } from '@he-tree/tree-utils';
import type { HeTreePublicInstance, TreeNodeWithChildren } from '~/utils/heTree';
import { watch } from 'vue';

interface UseHeTreeChildrenSyncOptions<T extends TreeNodeWithChildren<T>> {
  node: Readonly<Ref<T>>;
  stat: Readonly<Ref<Stat<T>>>;
  tree: Readonly<Ref<HeTreePublicInstance<T> | null | undefined>>;
}

export const useHeTreeChildrenSync = <T extends TreeNodeWithChildren<T>>({
  node,
  stat,
  tree,
}: UseHeTreeChildrenSyncOptions<T>) => {
  watch(() => node.value.children, (newChildren) => {
    const treeInstance = tree.value;
    if (!newChildren || !treeInstance) {
      return;
    }

    const parentStat = stat.value;
    const newIds = new Set(newChildren.map(child => child.id));

    treeInstance.batchUpdate(() => {
      for (const oldStat of [...parentStat.children]) {
        if (
          oldStat.parent === parentStat
          && (!newIds.has(oldStat.data.id) || !newChildren.includes(oldStat.data))
        ) {
          treeInstance.remove(oldStat);
        }
      }

      for (let index = 0; index < newChildren.length; index++) {
        const child = newChildren[index];

        if (!treeInstance.has(child)) {
          treeInstance.add(child, parentStat, index);
          continue;
        }

        const existingStat = treeInstance.getStat(child);
        if (existingStat.parent !== parentStat || parentStat.children[index] !== existingStat) {
          treeInstance.move(existingStat, parentStat, index);
        }
      }
    });
  }, { flush: 'sync' });
};
