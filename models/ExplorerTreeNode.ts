import type { Category, Scene, TreeNode } from '~/models/types';
import { isScene } from '~/models/types';

export const ExplorerTreeNodeFactory = (data: Scene | Category): TreeNode => {
  const nodeIsScene = isScene(data);
  return {
    $folded: true,
    id: data.id,
    label: data.title,
    isFolder: !nodeIsScene,
    loaded: false,
    loading: false,
    disabled: false,
    children: !nodeIsScene ? [] : undefined,
  };
};
