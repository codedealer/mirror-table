import type { ContextAction, DriveWidget, TreeNode } from '~/models/types';
import { DynamicPanelModelTypes } from '~/models/types';

export const WidgetContextActionsFactory = (file: DriveWidget, node?: TreeNode) => {
  const actions: ContextAction[] = [];

  const tableStore = useTableStore();

  Object.values(DynamicPanelModelTypes).forEach((panel) => {
    actions.push({
      id: `send-to-${panel}`,
      label: `Send to ${panel} panel`,
      icon: { name: `arrow_${panel}`, color: 'primary' },
      action: async () => {
        if (!file.appProperties.firestoreId) {
          return;
        }

        await tableStore.addWidgetToPanel(panel, file.appProperties.firestoreId);
      },
      disabled:
        !file.appProperties.firestoreId ||
        !tableStore.table ||
        tableStore.table.widgets[panel].includes(file.appProperties.firestoreId),
      pinned: true,
      alwaysVisible: false,
    });
  });

  const driveTreeStore = useDriveTreeStore();

  if (node) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: { name: 'delete', color: 'danger' },
      action: () => {
        if (file.appProperties.firestoreId) {
          // remove widget from all panels
          Object.values(DynamicPanelModelTypes).forEach((panel) => {
            void tableStore.removeWidgetFromPanel(panel, file.appProperties.firestoreId!);
          });
        }

        void driveTreeStore.removeFile(node);
      },
      disabled: !file.capabilities?.canDelete,
      pinned: false,
      alwaysVisible: false,
    });
  }

  return actions;
};
