import type {
  AppProperties,
  DataRetrievalStrategy,
  DriveAsset,
  DriveFile,
  DriveFileRaw,
  DriveFileUpdateReturnType, RawMediaObject,
} from '~/models/types';
import {
  DataRetrievalStrategies, isDriveFile, updateFieldMask,
} from '~/models/types';
import {
  generateFileRequest,
  generateMediaRequest,
  getFile as loadFile,
  downloadMedia as loadMedia,
  parseMediaResponse, updateMedia, updateMetadata, uploadMedia,
} from '~/utils/driveOps';
import { serializeAppProperties } from '~/utils/appPropertiesSerializer';

type FileRequest = gapi.client.Request<gapi.client.drive.File>;
type FileResponse = gapi.client.Response<gapi.client.drive.File>;

export const useDriveFileStore = defineStore('drive-file', () => {
  const _files = ref<Record<string, DriveFile>>({});
  const fileRequestRegistry: Map<string, FileRequest> = new Map();

  const files = computed(() => {
    return _files.value;
  });

  const cacheFile = (file: DriveFile) => {
    _files.value[file.id] = file;
  };

  const retrieveFileFromCache = (id: string) => {
    return id in files.value ? files.value[id] : undefined;
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

  const parseResponse = (response: FileResponse[]) => {
    const result: DriveFile[] = [];

    response.forEach((res) => {
      if (res.result) {
        const file = convertToDriveFile(res.result as DriveFileRaw);
        cacheFile(file);
        result.push(file);
      }
    });

    return result;
  };

  const getFiles = async (
    ids: string[],
    strategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
  ) => {
    let idsToLoad: string[] = [];
    let result: DriveFile[] = [];

    if (strategy !== DataRetrievalStrategies.SOURCE) {
      // search the cache first
      const cachedFiles = ids.map(retrieveFileFromCache);
      const cachedFilesIds = cachedFiles.map(f => f?.id).filter(id => id);
      const missingFileIds = ids.filter(id => !cachedFilesIds.includes(id));

      if (missingFileIds.length === 0 || strategy === DataRetrievalStrategies.OPTIMISTIC_CACHE) {
        return cachedFiles;
      } else if (strategy === DataRetrievalStrategies.CACHE_ONLY) {
        throw new Error(`Missing files: ${missingFileIds.join(', ')}`);
      }

      idsToLoad = missingFileIds;
      result = cachedFiles.filter(isDriveFile);
    } else {
      idsToLoad = ids;
    }

    if (!idsToLoad.length) {
      console.log('No files to load');

      return result;
    }

    console.log(`Preparing to load files: ${idsToLoad.join(', ')}`);

    const driveStore = useDriveStore();
    const client = await driveStore.getClient();

    // check if there are any pending requests
    const pendingIds = idsToLoad.filter(id => fileRequestRegistry.has(id));
    if (pendingIds.length) {
      console.warn(`Duplicate requests for files ${pendingIds.join(', ')}`);

      const pendingRequests = pendingIds.map(id => fileRequestRegistry.get(id)) as FileRequest[];
      const pendingResults = await Promise.all(pendingRequests);

      result.push(...parseResponse(pendingResults));
    }

    const unfulfilledIds = idsToLoad.filter(id => !pendingIds.includes(id));
    if (!unfulfilledIds.length) {
      console.log('After pending requests are cleared there are no files to load');
      return result;
    }

    console.log(`Loading files: ${unfulfilledIds.join(', ')}`);

    const batch = client.newBatch();
    const pendingRequests: FileRequest[] = [];
    unfulfilledIds.forEach((id) => {
      const req = generateFileRequest(client, id);
      fileRequestRegistry.set(id, req);
      pendingRequests.push(req);
      batch.add(req);
    });

    try {
      void await batch;

      const rawResult = await Promise.all(pendingRequests);

      result.push(...parseResponse(rawResult));
    } finally {
      console.log(`Finished loading files: ${unfulfilledIds.join(', ')}`);
      console.log('Cleaning up file request registry');

      unfulfilledIds.forEach((id) => {
        fileRequestRegistry.delete(id);
      });
    }

    return result;
  };

  const getFile = async (
    id: string,
    strategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
  ) => {
    const files = await getFiles([id], strategy);

    return files.length ? files[0] : undefined;
  };

  const listFilesInFolder = async (folderId: string) => {
    const rawResult = await listFiles(folderId);

    const result = rawResult.map((file) => {
      const f = convertToDriveFile(file);
      cacheFile(f);

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

  const mediaRequestRegistry: Map<string, Promise<FileResponse>> = new Map();

  /**
   * This method is not supported by the Drive API
   * @param fileIds
   * @param strategy
   * @param metaStrategy
   */
  const batchDownloadMedia = async (
    fileIds: string[],
    strategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
    metaStrategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
  ) => {
    const result: Record<string, RawMediaObject> = {};
    const files = await getFiles(fileIds, metaStrategy);

    // we will check cache here later

    const idsToLoad = files.filter(f => f).map(f => f!.id);
    const pendingIds = idsToLoad.filter(id => mediaRequestRegistry.has(id));
    if (pendingIds.length) {
      console.warn(`Duplicate media requests for files ${pendingIds.join(', ')}`);

      const pendingRequests = pendingIds.map(id => mediaRequestRegistry.get(id)) as FileRequest[];
      const pendingResults = await Promise.all(pendingRequests);

      pendingResults.forEach((res) => {
        const file = files.find(f => f?.id === res.result?.id);
        if (!file) {
          return;
        }

        const media = parseMediaResponse(file, res);
        if (media) {
          result[file.id] = media;
        }
      });
    }

    const unfulfilledIds = idsToLoad.filter(id => !pendingIds.includes(id));
    if (!unfulfilledIds.length) {
      console.log('After pending requests are cleared there are no files to load');
      return result;
    }

    const driveStore = useDriveStore();
    const client = await driveStore.getClient();

    console.log(`Loading media for files: ${unfulfilledIds.join(', ')}`);

    const batch = client.newBatch();
    const pendingRequests: FileRequest[] = [];
    unfulfilledIds.forEach((id) => {
      const req = generateMediaRequest(client, id);
      mediaRequestRegistry.set(id, req);
      pendingRequests.push(req);
      batch.add(req);
    });

    try {
      void await batch;

      const rawResult = await Promise.all(pendingRequests);

      rawResult.forEach((res) => {
        const file = files.find(f => f?.id === res.result?.id);
        if (!file) {
          return;
        }

        const media = parseMediaResponse(file, res);
        if (media) {
          result[file.id] = media;
        }
      });
    } finally {
      console.log(`Finished loading media for files: ${unfulfilledIds.join(', ')}`);
      console.log('Cleaning up media request registry');

      unfulfilledIds.forEach((id) => {
        mediaRequestRegistry.delete(id);
      });
    }

    return result;
  };

  const downloadMedia = async (
    fileId: string,
    mediaStrategy: DataRetrievalStrategy = DataRetrievalStrategies.LAZY,
    fileStrategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
  ): Promise<RawMediaObject | undefined> => {
    const file = await getFile(fileId, fileStrategy);

    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    if (!file.capabilities?.canDownload) {
      throw new Error(`File ${fileId} cannot be downloaded`);
    }

    if (!file.size || Number(file.size) === 0) {
      // cut short and return a faux media object
      console.log(`File ${fileId} appears to be empty`);
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        md5Checksum: file.md5Checksum!,
        loadedAt: Date.now(),
        data: '',
      };
    }

    // TODO: deal with cache

    // check the request registry
    let request: Promise<FileResponse>;
    let response: FileResponse;
    try {
      if (mediaRequestRegistry.has(fileId)) {
        console.warn(`Duplicate media request for file ${fileId}`);

        request = mediaRequestRegistry.get(fileId)!;
      } else {
        request = loadMedia(fileId);
        mediaRequestRegistry.set(fileId, request);
      }

      response = await request;
    } finally {
      mediaRequestRegistry.delete(fileId);
    }

    const media = parseMediaResponse(file, response);
    // TODO: deal with cache

    return media;
  };

  return {
    files,
    getFile,
    getFiles,
    listFilesInFolder,
    createFile,
    removeFile,
    saveFile,
    downloadMedia,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveFileStore, import.meta.hot));
}
