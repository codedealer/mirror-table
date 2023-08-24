import type { DriveFile, DriveTreeNode } from '~/models/types';
import driveWorkspaceSentinel from '~/utils/driveWorkspaceSentinel';

const buildNodes = (files: DriveFile[]) => {
  const nodes = files.map(file => DriveTreeNodeFactory(file));
  nodes[0].children = [nodes[1], nodes[2]];

  return nodes;
};

const listFiles = async (folderId: string) => {
  const driveStore = useDriveStore();
  const client = await driveStore.getClient();

  const response = await client.drive.files.list({
    q: `'${folderId}' in parents and trashed = false and (mimeType = '${DriveMimeTypes.FOLDER}' or appProperties has { key = 'type' and value = 'asset' })`,
    fields: `files(${fieldMask})`,
    orderBy: 'folder, name',
  });

  return response.result.files as DriveFile[] | undefined;
};

export const useDriveFileTree = () => {
  const nodes = ref<DriveTreeNode[]>([]);
  const loading = ref(false);
  const error = shallowRef<unknown>(null);
  let initialized = false;

  const driveStore = useDriveStore();
  const userStore = useUserStore();

  const { isReady } = toRefs(driveStore);
  const { profile } = toRefs(userStore);

  watch([profile, isReady], async ([profile, isReady]) => {
    if (initialized || !isReady || !profile || loading.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      await driveWorkspaceSentinel();

      const folderToSearch = profile.settings.driveFolderId;
      const files = await listFiles(folderToSearch);

      nodes.value = buildNodes(files ?? []);
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
      initialized = true;
    }
  }, { immediate: true });

  return {
    nodes,
    loading,
    error,
  };
};
