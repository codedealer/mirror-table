import type { ContextAction, DriveWidget, TreeNode } from '~/models/types';
import { DynamicPanelModelTypes } from '~/models/types';

export const WidgetContextActionsFactory = (file: DriveWidget, node?: TreeNode) => {
  const actions: ContextAction[] = [];

  Object.values(DynamicPanelModelTypes).forEach((panel) => {
    actions.push({
      id: `send-to-${panel}`,
      label: `Send to ${panel} panel`,
      icon: { name: `arrow_${panel}`, color: 'primary' },
      action: async () => {
        if (!file.appProperties.firestoreId) {
          return;
        }

        const tableStore = useTableStore();
        await tableStore.addWidgetToPanel(panel, file.appProperties.firestoreId);
      },
      disabled: file.appProperties.firestoreId?.length === 0,
      pinned: true,
      alwaysVisible: false,
    });
  });

  return actions;
};
