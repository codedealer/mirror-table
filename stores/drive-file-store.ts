import type { AppProperties, DriveAsset, DriveFile, DriveFileRaw, DriveFileUpdateReturnType } from '~/models/types';
import {
  getFile as loadFile,
  downloadMedia as loadMedia,
  updateMedia,
  updateMetadata,
  uploadMedia,
} from '~/utils/driveOps';
import { serializeAppProperties } from '~/utils/appPropertiesSerializer';
import { updateFieldMask } from '~/models/types';

export const useDriveFileStore = defineStore('drive-file', () => {
  const _files = ref<Record<string, DriveFile>>({});

  const files = computed(() => {
    return _files.value;
  });

  const setFile = (file: DriveFile) => {
    _files.value[file.id] = file;
  };

  const convertToDriveFile = (file: DriveFileRaw) => {
    const driveFile = file as DriveFile;
    driveFile.loading = false;

    // convert to DriveAsset if needed
    if (
      file.appProperties &&
      Object.hasOwn(file.appProperties, 'type')
    ) {
      if (
        file.appProperties.type === AppPropertiesTypes.ASSET &&
        Object.hasOwn(file.appProperties, 'kind')
      ) {
        const appProperties = AssetPropertiesFactory(file.appProperties);
        const asset = {
          ...driveFile,
          appProperties,
        } as unknown as DriveAsset;

        return asset;
      } else {
        throw new Error('Not implemented');
      }
    } else {
      return driveFile;
    }
  };

  const getFile = async (id: string) => {
    const rawResult = await loadFile<DriveFileRaw>(id);

    const file = convertToDriveFile(rawResult);
    setFile(file);

    return file;
  };

  const getFiles = async (folderId: string) => {
    const rawResult = await listFiles(folderId);

    const result = rawResult.map((file) => {
      const f = convertToDriveFile(file);
      setFile(f);

      return f;
    });

    return result;
  };

  const createFile = async (nameOrFile: string | File, parentId: string, appProperties?: AppProperties) => {
    if (typeof nameOrFile === 'string') {
      await createFolder(nameOrFile, parentId);
    } else if (appProperties) {
      const propertiesObject = serializeAppProperties(appProperties);

      await uploadMedia(nameOrFile, parentId, propertiesObject);
    } else {
      throw new Error('App Properties are not filled');
    }
  };

  const removeFile = async (id: string, restore: boolean = false) => {
    await deleteFile(id, restore);

    _files.value[id].trashed = !restore;
  };

  const saveFile = async (fileId: string, blob?: File) => {
    if (!_files.value[fileId]) {
      throw new Error('File not found');
    }

    const file = _files.value[fileId];
    if (file.mimeType === DriveMimeTypes.FOLDER) {
      throw new Error('Cannot save folder');
    }
    if (!file.appProperties) {
      throw new Error('File has no properties');
    }

    const propertiesObject = serializeAppProperties(file.appProperties);

    try {
      file.loading = true;

      let updatedMetadata: DriveFileUpdateReturnType;
      if (blob) {
        // in this case another request is needed to get the new metadata
        await updateMedia(fileId, blob, propertiesObject);

        updatedMetadata = await loadFile<DriveFileUpdateReturnType>(fileId, updateFieldMask);
      } else {
        updatedMetadata = await updateMetadata(fileId, propertiesObject as Partial<DriveFileRaw>);
      }

      // update file object with new metadata
      Object.assign(file, updatedMetadata);
    } finally {
      file.loading = false;
    }
  };

  const downloadMedia = async (fileId: string) => {
    const file = _files.value[fileId];
    if (!file) {
      throw new Error('File not found');
    }
    if (file.mimeType === DriveMimeTypes.FOLDER) {
      throw new Error('Cannot download folder');
    }

    try {
      file.loading = true;

      return await loadMedia(fileId);
    } finally {
      file.loading = false;
    }
  };

  return {
    files,
    setFile,
    getFile,
    getFiles,
    createFile,
    removeFile,
    saveFile,
    downloadMedia,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveFileStore, import.meta.hot));
}
