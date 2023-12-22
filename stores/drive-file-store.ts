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
  const fileRequestRegistry: Map<string, Promise<DriveFileRaw>> = new Map();

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
    let rawResult: DriveFileRaw;

    try {
      if (fileRequestRegistry.has(id)) {
        console.warn(`Duplicate request for file ${id}`);
        rawResult = await fileRequestRegistry.get(id) as DriveFileRaw;
      } else {
        const request = loadFile<DriveFileRaw>(id);

        fileRequestRegistry.set(id, request);
        rawResult = await request;
      }
    } finally {
      fileRequestRegistry.delete(id);
    }

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
        updatedMetadata = await updateMetadata(
          fileId,
          {
            name: file.name,
            appProperties: propertiesObject,
          },
        );
      }

      // update file object with new metadata
      // WARNING: this is a naive merge relying on the fact that update mask only has primitive values
      Object.assign(file, updatedMetadata);
    } finally {
      file.loading = false;
    }
  };

  // TODO: needs a request registry of its own
  const downloadMedia = async <B extends boolean>(
    fileId: string,
    ignoreFile: boolean,
    toBlob: B,
  ): Promise<B extends true ? Blob : string> => {
    const file = _files.value[fileId];
    if (!file && !ignoreFile) {
      throw new Error('File not found');
    }
    if (file && file.mimeType === DriveMimeTypes.FOLDER) {
      throw new Error('Cannot download folder');
    }

    try {
      if (file) {
        file.loading = true;
      }

      return await loadMedia(fileId, toBlob);
    } finally {
      if (file) {
        file.loading = false;
      }
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
