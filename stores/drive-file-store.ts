import type {
  AppProperties,
  DataRetrievalStrategy,
  DriveFile,
  DriveFileRaw,
  DriveFileUpdateReturnType,
  RawMediaObject,
} from '~/models/types';
import { DataRetrievalStrategies, updateFieldMask } from '~/models/types';
import {
  generateFileRequest,
  generateMediaRequest,
  getFile as loadFile,
  downloadMedia as loadMedia,
  parseMediaResponse,
  updateMedia,
  updateMetadata,
  uploadMedia,
} from '~/utils/driveOps';
import { serializeAppProperties } from '~/utils/appPropertiesSerializer';
import { convertToDriveFile } from '~/models/DriveFile';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

type FileRequest = gapi.client.Request<gapi.client.drive.File>;
type FileResponse = gapi.client.Response<gapi.client.drive.File>;

export const useDriveFileStore = defineStore('drive-file', () => {
  const cacheStore = useCacheStore();

  const fileRequestRegistry: Map<string, FileRequest> = new Map();

  const files = computed(() => {
    return cacheStore.files;
  });

  const cacheFiles = async (files: DriveFile[]) => {
    try {
      await cacheStore.setFiles(files);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }
  };

  const cacheFile = async (file: DriveFile) => {
    await cacheFiles([file]);
  };

  const parseResponse = (response: FileResponse[]) => {
    const result: DriveFile[] = [];

    response.forEach((res) => {
      if (res.result) {
        const file = convertToDriveFile(res.result as DriveFileRaw);
        result.push(file);
      }
    });

    void cacheFiles(result);

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
      const cachedFiles = await cacheStore.getFiles(ids);
      const cachedFilesIds = cachedFiles.map(f => f.id);
      const missingFileIds = ids.filter(id => !cachedFilesIds.includes(id));

      if (
        missingFileIds.length === 0 ||
        strategy === DataRetrievalStrategies.OPTIMISTIC_CACHE
      ) {
        return cachedFiles;
      } else if (strategy === DataRetrievalStrategies.CACHE_ONLY) {
        throw new Error(`Missing files: ${missingFileIds.join(', ')}`);
      }

      idsToLoad = missingFileIds;
      result = cachedFiles;
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

    const result = rawResult.map(convertToDriveFile);

    void cacheFiles(result);

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
    if (!files.value[id]) {
      throw new Error('File not found');
    }

    await deleteFile(id, restore);

    files.value[id].trashed = !restore;
    void cacheFile(files.value[id]);
  };

  // this is a bad way of handling this, it needs to be a completely new (clone) file object
  const saveFile = async (fileId: string, blob?: File) => {
    if (!files.value[fileId]) {
      throw new Error('File not found');
    }

    const file = files.value[fileId];
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

      void cacheFile(file);
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

    const idsToLoad = files.filter(f => f).map(f => f.id);
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

    if (!file.md5Checksum) {
      throw new Error(`File ${fileId} has no checksum`);
    }

    if (!file.size || Number(file.size) === 0) {
      // cut short and return a faux media object
      console.log(`File ${fileId} appears to be empty`);
      const media: RawMediaObject = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        md5Checksum: file.md5Checksum,
        loadedAt: Date.now(),
        data: '',
      };

      void cacheStore.setMedia([media]);
      return media;
    }

    if (mediaStrategy !== DataRetrievalStrategies.SOURCE) {
      const cachedMedia = await cacheStore.getMedia(fileId, file.md5Checksum);
      if (cachedMedia) {
        return cachedMedia;
      }

      if (mediaStrategy === DataRetrievalStrategies.CACHE_ONLY) {
        throw new Error(`Media for file ${fileId} not found in cache`);
      } else if (mediaStrategy === DataRetrievalStrategies.OPTIMISTIC_CACHE) {
        return;
      }
    }

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
    void (media && cacheStore.setMedia([media]));

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
