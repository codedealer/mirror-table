// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, proxyRefs, ref, watch } from 'vue';
import { DataRetrievalStrategies, DriveMimeTypes } from '~/models/types';

vi.mock('pinia', () => ({
  defineStore: (_id: string, setup: () => unknown) => () => (globalThis as any).proxyRefs(setup()),
  acceptHMRUpdate: () => () => {},
}));

const boundary = vi.hoisted(() => ({
  files: new Map<string, any>(),
  getFile: vi.fn(),
  listFilesInFolder: vi.fn(),
  updateProfileSettings: vi.fn(),
  error: vi.fn(),
  sentinel: vi.fn(),
}));

vi.mock('~/utils/driveOps', () => ({
  buildNodes: (files: any[]) => files.map(file => ({
    id: file.id,
    label: file.name,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    loaded: false,
    loading: false,
    disabled: false,
  })),
  convertToBlob: vi.fn(),
  moveFile: vi.fn(),
}));
vi.mock('~/utils/driveWorkspaceSentinel', () => ({ default: boundary.sentinel }));
vi.mock('~/utils/extractErrorMessage', () => ({
  extractErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
}));
vi.mock('~/models/DriveTreeNode', () => ({
  DriveTreeNodeFactory: (file: any) => ({
    id: file.id,
    label: file.name,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    loaded: false,
    loading: false,
    disabled: false,
  }),
}));

const folder = (id: string, name = id) => ({
  id,
  name,
  mimeType: DriveMimeTypes.FOLDER,
  trashed: false,
  parents: [],
});
const profile = (driveFolderId: string, lastVisibleRootFolderId?: string) => ({
  settings: { driveFolderId, searchFolderId: '', lastVisibleRootFolderId },
});

let user: any;
let activeProfile: any;
let driveReady: any;
let treeStore: any;
let notificationStore: { error: ReturnType<typeof vi.fn> };

async function installStore(initialProfile = profile('workspace-a'), initialFiles: any[] = []) {
  vi.resetModules();
  boundary.files.clear();
  initialFiles.forEach(file => boundary.files.set(file.id, file));
  boundary.getFile.mockReset();
  boundary.listFilesInFolder.mockReset();
  boundary.updateProfileSettings.mockReset().mockResolvedValue(undefined);
  boundary.error.mockReset();
  boundary.sentinel.mockReset().mockResolvedValue(undefined);
  user = ref({ uid: 'user-a' });
  activeProfile = ref(initialProfile);
  driveReady = ref(true);
  notificationStore = { error: boundary.error };
  const userStore = { user, profile: activeProfile, updateProfileSettings: boundary.updateProfileSettings };
  const driveStore = { isReady: driveReady };
  const driveFileStore = {
    getFile: boundary.getFile,
    listFilesInFolder: boundary.listFilesInFolder,
  };
  const stores = new Map<string, any>();
  Object.assign(globalThis, {
    ref,
    computed,
    watch,
    nextTick,
    proxyRefs,
    defineStore: (id: string, setup: () => unknown) => () => {
      if (!stores.has(id)) {
        stores.set(id, proxyRefs(setup() as any));
      }
      return stores.get(id);
    },
    acceptHMRUpdate: () => () => {},
    storeToRefs: (store: any) => store,
    useUserStore: () => userStore,
    useDriveStore: () => driveStore,
    useDriveFileStore: () => driveFileStore,
    useDriveSearchStore: () => ({ showSearchModal: false }),
    useNotificationStore: () => notificationStore,
    useTableImportImagesAsScenes: () => ({ importImagesAsAssets: vi.fn() }),
    DriveMimeTypes,
    DataRetrievalStrategies,
    extractErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
    PickerViewTemplates: { ALL: 'all' },
    AppPropertiesTypes: { ASSET: 'asset' },
    AssetPropertiesKinds: { TEXT: 'text' },
    AssetPropertiesFactory: (value: unknown) => value,
  });
  boundary.getFile.mockImplementation(async (id: string) => ({ file: boundary.files.get(id) }));
  boundary.listFilesInFolder.mockImplementation(async () => []);
  const { useDriveTreeStore } = await import('./drive-tree-store');
  treeStore = useDriveTreeStore();
}

async function settle() {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

describe('drive tree visible-root persistence', () => {
  beforeEach(async () => {
    await installStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes at workspace, persists an explicit folder selection, and does not change workspace setting', async () => {
    boundary.listFilesInFolder.mockResolvedValue([]);
    await settle();
    expect(treeStore.visibleRootNode.id).toBe('workspace-a');

    const selected = { id: 'folder-a', label: 'Folder A', isFolder: true, disabled: false };
    await treeStore.setVisibleRootFolder(selected);

    expect(treeStore.visibleRootNode.id).toBe('folder-a');
    expect(boundary.updateProfileSettings).toHaveBeenCalledWith({ lastVisibleRootFolderId: 'folder-a' });
    expect(activeProfile.value.settings.driveFolderId).toBe('workspace-a');
  });

  it('persists an explicit reset as the last visible workspace root', async () => {
    boundary.listFilesInFolder.mockResolvedValue([]);
    await settle();
    await treeStore.setVisibleRootFolder({ id: 'other-folder', label: 'Other', isFolder: true, disabled: false });
    boundary.updateProfileSettings.mockClear();

    await treeStore.resetVisibleRootFolder();

    expect(treeStore.visibleRootNode.id).toBe('workspace-a');
    expect(boundary.updateProfileSettings).toHaveBeenCalledWith({ lastVisibleRootFolderId: 'workspace-a' });
    expect(activeProfile.value.settings.driveFolderId).toBe('workspace-a');
  });

  it('restores a saved accessible folder and loads its children without persisting restoration', async () => {
    await installStore(profile('workspace-a', 'saved-folder'), [folder('saved-folder', 'Saved')]);
    boundary.listFilesInFolder.mockImplementation(async (id: string) => id === 'saved-folder' ? [{ id: 'child', name: 'Child', mimeType: 'text/plain' }] : []);
    await settle();

    expect(treeStore.visibleRootNode.id).toBe('saved-folder');
    expect(treeStore.visibleRootNode.children.map((child: any) => child.id)).toEqual(['child']);
    expect(boundary.updateProfileSettings).not.toHaveBeenCalled();
    expect(activeProfile.value.settings.driveFolderId).toBe('workspace-a');
  });

  it.each([
    ['missing', undefined],
    ['trashed', { ...folder('saved-folder'), trashed: true }],
    ['non-folder', { ...folder('saved-folder'), mimeType: 'text/plain' }],
  ])('falls back to workspace for a %s saved preference without overwriting it', async (_label, saved) => {
    await installStore(profile('workspace-a', 'saved-folder'), saved ? [saved] : []);
    boundary.listFilesInFolder.mockResolvedValue([]);
    boundary.listFilesInFolder.mockResolvedValue([]);
    await settle();

    expect(treeStore.visibleRootNode.id).toBe('workspace-a');
    expect(boundary.updateProfileSettings).not.toHaveBeenCalled();
  });

  it('keeps an explicit selection visible and reports failure to persist it', async () => {
    boundary.listFilesInFolder.mockResolvedValue([]);
    await settle();
    boundary.updateProfileSettings.mockRejectedValueOnce(new Error('save failed'));

    const result = await treeStore.setVisibleRootFolder({ id: 'folder-a', label: 'Folder A', isFolder: true, disabled: false });

    expect(result).toBe(true);
    expect(treeStore.visibleRootNode.id).toBe('folder-a');
    expect(boundary.error).toHaveBeenCalledWith('save failed');
  });

  it('falls back to workspace when loading a saved folder fails', async () => {
    await installStore(profile('workspace-a', 'saved-folder'), [folder('saved-folder')]);
    boundary.listFilesInFolder.mockImplementation(async (id: string) => {
      if (id === 'saved-folder') {
        throw new Error('folder contents unavailable');
      }
      return [];
    });

    await settle();

    expect(treeStore.visibleRootNode.id).toBe('workspace-a');
    expect(boundary.error).not.toHaveBeenCalled();
    expect(boundary.updateProfileSettings).not.toHaveBeenCalled();
  });

  it('loads the parent folder contents when navigating up from the visible root', async () => {
    const parent = folder('drive-root', 'Drive');
    const current = { ...folder('workspace-a', 'Workspace'), parents: ['drive-root'] };
    await installStore(profile('workspace-a'), [parent, current]);
    boundary.listFilesInFolder.mockImplementation(async (id: string) => (
      id === 'drive-root' ? [{ id: 'parent-child', name: 'Parent child', mimeType: 'text/plain' }] : []
    ));
    await settle();

    const result = await treeStore.setVisibleRootToParent();

    expect(result).toBe(true);
    expect(treeStore.visibleRootNode.id).toBe('drive-root');
    expect(treeStore.visibleRootNode.children.map((child: any) => child.id)).toEqual(['parent-child']);
    expect(boundary.listFilesInFolder).toHaveBeenCalledWith('drive-root');
  });

  it('switches profiles to the new user root and does not show the prior user root', async () => {
    boundary.listFilesInFolder.mockResolvedValue([]);
    await installStore(profile('workspace-a', 'user-a-root'), [folder('user-a-root')]);
    boundary.files.set('user-b-root', folder('user-b-root'));
    await settle();
    expect(treeStore.visibleRootNode.id).toBe('user-a-root');

    activeProfile.value = null;
    user.value = { uid: 'user-b' };
    activeProfile.value = profile('workspace-b', 'user-b-root');
    await settle();

    expect(treeStore.visibleRootNode.id).toBe('user-b-root');
    expect(treeStore.visibleRootNode.id).not.toBe('user-a-root');
  });

  it('does not let a pending navigation from the prior user change or persist the new user root', async () => {
    await installStore();
    boundary.listFilesInFolder.mockResolvedValue([]);
    await settle();

    let resolveAChildren!: (files: any[]) => void;
    boundary.listFilesInFolder.mockImplementation((id: string) => {
      if (id === 'folder-a') {
        return new Promise((resolve) => {
          resolveAChildren = resolve;
        });
      }
      return Promise.resolve([]);
    });

    const pendingNavigation = treeStore.setVisibleRootFolder({
      id: 'folder-a',
      label: 'Folder A',
      isFolder: true,
      disabled: false,
    });
    await settle();
    expect(treeStore.visibleRootNode.id).toBe('folder-a');

    boundary.files.set('user-b-root', folder('user-b-root'));
    activeProfile.value = null;
    user.value = { uid: 'user-b' };
    activeProfile.value = profile('workspace-b', 'user-b-root');
    await settle();
    expect(treeStore.visibleRootNode.id).toBe('user-b-root');

    resolveAChildren([]);
    await pendingNavigation;

    expect(treeStore.visibleRootNode.id).toBe('user-b-root');
    expect(boundary.updateProfileSettings).not.toHaveBeenCalled();
  });

  it('loads workspace fallback when retrieving a saved preference fails without an extra error notification', async () => {
    await installStore(profile('workspace-a', 'unavailable'));
    boundary.getFile.mockRejectedValueOnce(new Error('permission denied'));
    boundary.listFilesInFolder.mockResolvedValue([]);

    await settle();

    expect(treeStore.visibleRootNode.id).toBe('workspace-a');
    expect(boundary.listFilesInFolder).toHaveBeenCalledWith('workspace-a');
    expect(boundary.error).not.toHaveBeenCalled();
    expect(boundary.updateProfileSettings).not.toHaveBeenCalled();
  });
});
