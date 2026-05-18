import type { Stat } from '@he-tree/tree-utils';
import type { InjectionKey, Ref } from 'vue';
import type { DriveTreeNode, TreeNode } from '~/models/types';

export interface TreeNodeWithChildren<T> {
  id: string;
  children?: T[];
}

export interface HeTreePublicInstance<T> {
  has: (nodeData: T) => boolean;
  getStat: (nodeData: T) => Stat<T>;
  add: (nodeData: T, parent?: Stat<T> | null, index?: number | null) => void;
  remove: (stat: Stat<T>) => boolean;
  move: (stat: Stat<T>, parent: Stat<T> | null, index: number) => boolean;
  batchUpdate: (task: () => void) => void;
}

export interface DriveTreeDragOpenProgress {
  folderId: string;
  startedAt: number;
  duration: number;
}

export type CanvasDropEligibility = 'unknown' | 'eligible' | 'ineligible';

export interface DriveFileDragPayload {
  nodeId: string;
  eligibility: CanvasDropEligibility;
}

export const driveTreeRefKey = Symbol('drive-tree-ref') as InjectionKey<Ref<HeTreePublicInstance<DriveTreeNode> | null>>;
export const driveTreeIsDraggingKey = Symbol('drive-tree-is-dragging') as InjectionKey<Ref<boolean>>;
export const driveTreeHoveredFolderTargetKey = Symbol('drive-tree-hovered-folder-target') as InjectionKey<Ref<Stat<DriveTreeNode> | null>>;
export const driveTreeDragOpenProgressKey = Symbol('drive-tree-drag-open-progress') as InjectionKey<Ref<DriveTreeDragOpenProgress | null>>;
export const driveTreeSetHoveredFolderTargetKey = Symbol('drive-tree-set-hovered-folder-target') as InjectionKey<(stat: Stat<DriveTreeNode>) => void>;
export const driveTreeClearHoveredFolderTargetKey = Symbol('drive-tree-clear-hovered-folder-target') as InjectionKey<(folderId?: string) => void>;
export const driveTreeSetPendingFolderDropTargetKey = Symbol('drive-tree-set-pending-folder-drop-target') as InjectionKey<(stat: Stat<DriveTreeNode>) => void>;
export const driveFileDragPayloadKey = Symbol('drive-file-drag-payload') as InjectionKey<Ref<DriveFileDragPayload | null>>;

export const explorerTreeRefKey = Symbol('explorer-tree-ref') as InjectionKey<Ref<HeTreePublicInstance<TreeNode> | null>>;
