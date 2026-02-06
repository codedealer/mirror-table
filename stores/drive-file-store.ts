import type {
  AppProperties,
  AppPropertiesType,
  AssetPropertiesKind,
  DataRetrievalStrategy,
  DriveFile,
  DriveFileRaw,
  DriveFileUpdateObject,
  DriveFileUpdateReturnType,
  GetFilesOptions,
  RawMediaObject,
} from '~/models/types';
import type { updateMetadataPayload } from '~/utils/driveOps';
import colors from 'ansi-colors';

import { convertToDriveFile } from '~/models/DriveFile';
import { SceneElementCanvasObjectAssetPropertiesFactory } from '~/models/SceneElementCanvasObjectAsset';
import { DataRetrievalStrategies, updateFieldMask } from '~/models/types';
import { serializeAppProperties } from '~/utils/appPropertiesSerializer';
import {
  generateFileRequest,
  generateMediaRequest,
  getFile as loadFile,
  downloadMedia as loadMedia,
  parseMediaResponse,
  searchFiles,
  updateMedia,
  updateMetadata,
  uploadMedia,
} from '~/utils/driveOps';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

const { bgGreen, bgWhite, bgYellow } = colors;

type FileRequest = gapi.client.Request<gapi.client.drive.File>;
type FileResponse = gapi.client.Response<gapi.client.drive.File>;

export interface GetFilesResult {
  files: DriveFile[];
  errors: Record<string, unknown>;
}

export interface GetFileResult {
  file?: DriveFile;
  error?: unknown;
}

export const useDriveFileStore = defineStore('drive-file', () => {
  const { $logger } = useNuxtApp();
  const fileLog = $logger['drive:file'];
  const mediaLog = $logger['drive:media'];

  const cacheStore = useCacheStore();

  const fileRequestRegistry: Map<string, FileRequest> = new Map();

  // Coalesce rapid file metadata requests into a single Drive batch.
  const queuedFileRequestIds: Set<string> = new Set();
  let queuedFilesFlushPromise: Promise<void> | null = null;

  const scheduleQueuedFilesFlush = (client: typeof gapi.client) => {
    if (queuedFilesFlushPromise) {
      return queuedFilesFlushPromise;
    }

    queuedFilesFlushPromise = new Promise<void>((resolve) => {
      queueMicrotask(async () => {
        try {
          if (!queuedFileRequestIds.size) {
            return;
          }

          const idsToFlush = Array.from(queuedFileRequestIds);
          queuedFileRequestIds.clear();

          fileLog(`${bgWhite.blue('GOOGLE DRIVE API')}\n${idsToFlush.join(', ')}`);

          const batch = client.newBatch();
          idsToFlush.forEach((id) => {
            const req = fileRequestRegistry.get(id);
            if (req) {
              batch.add(req);
            }
          });

          try {
            void await batch;
          } catch (e) {
            // Some Drive batch implementations reject the whole batch if any request fails.
            // Individual request promises should still settle; callers handle per-id errors.
            console.error('Drive file batch failed.', e);
          }
        } finally {
          queuedFilesFlushPromise = null;
          resolve();

          // If more requests were queued during the flush, schedule another.
          if (queuedFileRequestIds.size) {
            void scheduleQueuedFilesFlush(client);
          }
        }
      });
    });

    return queuedFilesFlushPromise;
  };

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
    strategy: DataRetrievalStrategy = DataRetrievalStrategies.RECENT,
  ): Promise<GetFilesResult> => {
    ids = Array.from(new Set(ids));

    if (ids.length > 1) {
      fileLog(`${bgWhite.black.bold('BATCHING')}\n${ids.join(', ')}`);
    } else {
      fileLog(`GET\n${ids.join(', ')}`);
    }

    const errors: Record<string, unknown> = {};

    let idsToLoad: string[] = [];
    let result: DriveFile[] = [];

    if (strategy !== DataRetrievalStrategies.SOURCE) {
      // search the cache first
      fileLog(`${bgYellow.black('CACHE CHECK')}: ${strategy}\n${ids.join(', ')}`);
      const options: GetFilesOptions = {};
      if (strategy === DataRetrievalStrategies.RECENT) {
        options.TTL = 60 * 1000;
        options.skipDisk = true;
      } else if (strategy === DataRetrievalStrategies.PASSIVE) {
        options.skipDisk = true;
        strategy = DataRetrievalStrategies.CACHE_ONLY;
      }
      const cachedFiles = await cacheStore.getFiles(ids, options);
      const cachedFilesIds = cachedFiles.map(f => f.id);
      const missingFileIds = ids.filter(id => !cachedFilesIds.includes(id));

      if (
        missingFileIds.length === 0
        || strategy === DataRetrievalStrategies.OPTIMISTIC_CACHE
      ) {
        return { files: cachedFiles, errors };
      } else if (strategy === DataRetrievalStrategies.CACHE_ONLY) {
        missingFileIds.forEach((id) => {
          errors[id] = new Error(`Missing files: ${id}`);
        });

        return { files: cachedFiles, errors };
      }

      idsToLoad = missingFileIds;
      result = cachedFiles;
    } else {
      idsToLoad = ids;
    }

    if (!idsToLoad.length) {
      fileLog('No files to load');

      return { files: result, errors };
    }

    fileLog(`${bgYellow.black('PENDING')}\n${idsToLoad.join(', ')}`);

    const driveStore = useDriveStore();
    const client = await driveStore.getClient();

    // Ensure each missing id has a request registered and queued.
    const idsForRequests: string[] = [];
    idsToLoad.forEach((id) => {
      if (fileRequestRegistry.has(id)) {
        idsForRequests.push(id);
        return;
      }

      const req = generateFileRequest(client, id);
      fileRequestRegistry.set(id, req);
      queuedFileRequestIds.add(id);
      idsForRequests.push(id);
    });

    // Flush in a microtask to coalesce rapid calls.
    await scheduleQueuedFilesFlush(client);

    const requests = idsForRequests
      .map(id => ({ id, req: fileRequestRegistry.get(id) }))
      .filter((x): x is { id: string; req: FileRequest } => !!x.req);

    const settled = await Promise.allSettled(requests.map(x => x.req));

    const fulfilledResponses: FileResponse[] = [];
    settled.forEach((res, idx) => {
      const id = requests[idx]?.id;
      if (!id) {
        return;
      }

      if (res.status === 'fulfilled') {
        fulfilledResponses.push(res.value);
      } else {
        errors[id] = res.reason;
      }
    });

    if (fulfilledResponses.length) {
      result.push(...parseResponse(fulfilledResponses));
    }

    fileLog(`${bgGreen.black('FINISHED')}\n${idsForRequests.join(', ')}`);
    idsForRequests.forEach((id) => {
      fileRequestRegistry.delete(id);
    });

    return { files: result, errors };
  };

  const getFile = async (
    id: string,
    strategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
  ): Promise<GetFileResult> => {
    const { files, errors } = await getFiles([id], strategy);

    if (errors[id]) {
      return { error: errors[id] };
    }

    return files.length ? { file: files[0] } : {};
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

      const metadata: updateMetadataPayload = {
        name: nameOrFile.name,
        appProperties: propertiesObject,
      };
      // update the content hints for search
      if (isAssetProperties(appProperties)) {
        metadata.contentHints = {
          indexableText: generateFirestoreSearchIndex(appProperties.title).join(' '),
        };
      }

      const result = await uploadMedia(nameOrFile, parentId, metadata);
      if (!result.id) {
        throw new Error('Failed to upload file to Drive');
      }
      // handle the case of complex assets: their properties are stored in firestore
      if (
        isAssetProperties(appProperties)
        && appProperties.kind === AssetPropertiesKinds.COMPLEX
      ) {
        const canvasElementsStore = useCanvasElementsStore();
        const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
          result.id,
          appProperties,
        );
        await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
      }
    } else {
      throw new Error('App Properties are not filled');
    }
  };

  const removeFile = async (id: string, restore: boolean = false) => {
    let file: DriveFile | undefined = files.value[id];
    if (!file) {
      const { file: loaded } = await getFile(id, DataRetrievalStrategies.SOURCE);
      file = loaded;
    }

    if (!file) {
      throw new Error('File not found');
    }

    await deleteFile(id, restore);

    const properties = file.appProperties;

    // Widgets use a Firestore doc for their content/state.
    // We soft-delete them by toggling `trashed` to match the Drive file.
    // Backwards-compat: older versions may have deleted the doc on trash; recreate if missing.
    if (isWidgetProperties(properties) && properties.firestoreId) {
      const widgetId = properties.firestoreId;

      try {
        const widgetStore = useWidgetStore();

        // Best-effort toggle; if it fails we still consider the Drive file trashed/restored.
        // (The widget doc is optional and can be repaired on next open.)
        void widgetStore.updateWidget(widgetId, {
          trashed: !restore,
        });
      } catch (e) {
        console.error(e);
        const notificationStore = useNotificationStore();
        notificationStore.error(extractErrorMessage(e));
      }
    }

    // handle the case of complex assets: their properties are stored in firestore
    if (
      isAssetProperties(properties)
      && properties.kind === AssetPropertiesKinds.COMPLEX
    ) {
      const canvasElementsStore = useCanvasElementsStore();

      const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
        id,
        properties,
      );

      complexAssetProperties.settings = {
        ...(complexAssetProperties.settings ?? {}),
        trashed: !restore,
      };

      // Keep asset_properties present even when the Drive file is trashed.
      // This avoids missing properties for complex assets currently on the canvas.
      await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
    }

    file.trashed = !restore;
    void cacheFile(file);
  };

  const updateFileMetadata = (file: DriveFile, metadata: DriveFileUpdateReturnType) => {
    const {
      appProperties,
      ...payload
    } = metadata;

    if (!Object.keys(payload).every(key => typeof payload[key as keyof typeof payload] === 'string')) {
      console.log(payload);
      throw new Error('Update metadata payload contains non-string values');
    }

    const updateObject = payload as DriveFileUpdateObject;
    if (appProperties) {
      if (isAssetProperties(appProperties)) {
        updateObject.appProperties = AssetPropertiesFactory(appProperties);
      } else if (isWidgetProperties(appProperties)) {
        updateObject.appProperties = WidgetPropertiesFactory(appProperties);
      } else {
        throw new Error('Unknown app properties type');
      }
    }

    Object.assign(file, updateObject, { loadedAt: Date.now() });
  };

  const saveFile = async (
    fileId: string,
    appProperties: AppProperties,
    blobOrFilename?: File | string,
  ) => {
    let file: DriveFile | undefined;
    if (!files.value[fileId]) {
      const res = await getFile(fileId, DataRetrievalStrategies.SOURCE);
      file = res.file;
    } else {
      file = files.value[fileId];
    }

    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    if (file.mimeType === DriveMimeTypes.FOLDER) {
      throw new Error('Cannot save folder');
    }

    if (!blobOrFilename) {
      // assume the filename doesn't change
      blobOrFilename = file.name;
      if (!blobOrFilename) {
        throw new Error('Filename is not provided');
      }
    }

    const propertiesObject = serializeAppProperties(appProperties);

    let updatedMetadata: DriveFileUpdateReturnType;
    try {
      file.loading = true;

      const metadata: updateMetadataPayload = {
        name: typeof blobOrFilename === 'string' ? blobOrFilename : blobOrFilename.name,
        appProperties: propertiesObject,
      };
      // update the content hints for search
      if (isAssetProperties(appProperties)) {
        metadata.contentHints = {
          indexableText: generateFirestoreSearchIndex(appProperties.title).join(' '),
        };
      }
      if (typeof blobOrFilename === 'string') {
        updatedMetadata = await updateMetadata(fileId, metadata);
      } else {
        // in this case another request is needed to get the new metadata
        await updateMedia(fileId, blobOrFilename, metadata);

        updatedMetadata = await loadFile<DriveFileUpdateReturnType>(fileId, updateFieldMask);
      }
    } finally {
      file.loading = false;
    }

    // update file object with new metadata
    try {
      updateFileMetadata(file, updatedMetadata);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));
    }

    // Handle complex assets: update their properties in Firestore
    if (isAssetProperties(appProperties) && appProperties.kind === AssetPropertiesKinds.COMPLEX) {
      const canvasElementsStore = useCanvasElementsStore();
      const complexAssetProperties = SceneElementCanvasObjectAssetPropertiesFactory(
        fileId,
        appProperties,
      );
      try {
        await canvasElementsStore.addComplexAssetProperties(complexAssetProperties);
      } catch (e) {
        console.error(e);
        const notificationStore = useNotificationStore();
        notificationStore.error(extractErrorMessage(e));
      }
    }

    void cacheFile(file);
  };

  const mediaRequestRegistry: Map<string, Promise<FileResponse>> = new Map();

  /**
   * This method is not supported by the Drive API
   * @param fileIds
   * @param _strategy
   * @param metaStrategy
   */
  const _batchDownloadMedia = async (
    fileIds: string[],
    _strategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
    metaStrategy: DataRetrievalStrategy = DataRetrievalStrategies.SOURCE,
  ) => {
    const result: Record<string, RawMediaObject> = {};
    const { files } = await getFiles(fileIds, metaStrategy);

    // we will check cache here later

    const idsToLoad = files.filter(f => f).map(f => f.id);
    const pendingIds = idsToLoad.filter(id => mediaRequestRegistry.has(id));
    if (pendingIds.length) {
      console.warn(`Blocked duplicate media requests for files ${pendingIds.join(', ')}`);

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
    fileOrId: DriveFile | string,
    mediaStrategy: DataRetrievalStrategy = DataRetrievalStrategies.LAZY,
    fileStrategy: DataRetrievalStrategy = DataRetrievalStrategies.RECENT,
  ): Promise<RawMediaObject | undefined> => {
    const fileId = typeof fileOrId === 'string' ? fileOrId : fileOrId.id;
    mediaLog(`File get\n${fileId}`);

    let file: DriveFile | undefined;
    if (typeof fileOrId === 'string') {
      const res = await getFile(fileId, fileStrategy);
      file = res.file;
    } else {
      // Prefer the canonical cached reference if available.
      file = files.value[fileOrId.id] ?? fileOrId;

      // If the caller's file object is incomplete, refresh metadata.
      if (!file.md5Checksum || !file.capabilities) {
        const res = await getFile(fileId, fileStrategy);
        file = res.file ?? file;
      }
    }

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
      mediaLog(`File ${fileId} appears to be empty. Making a stub.`);
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
      mediaLog(`${bgYellow.black('CACHE CHECK')}: ${mediaStrategy}\n${fileId}`);
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
      file.loading = true;

      if (mediaRequestRegistry.has(fileId)) {
        console.warn(`Blocked duplicate media request for file ${fileId}`);

        request = mediaRequestRegistry.get(fileId)!;
      } else {
        mediaLog(`${bgWhite.blue('GOOGLE DRIVE API')}\n${fileId}`);
        request = loadMedia(fileId);
        mediaRequestRegistry.set(fileId, request);
      }

      response = await request;
    } finally {
      file.loading = false;

      mediaRequestRegistry.delete(fileId);
      mediaLog(`${bgGreen.black('FINISHED')}\n${fileId}`);
    }

    const media = parseMediaResponse(file, response);
    void (media && cacheStore.setMedia([media]));

    return media;
  };

  const search = async (name: string, type?: AppPropertiesType, kind?: AssetPropertiesKind) => {
    if (!name.length) {
      return [];
    }

    let result: DriveFileRaw[] = [];
    try {
      result = await searchFiles(name, type, kind);
    } catch (e) {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(extractErrorMessage(e));

      return [];
    }

    const files = result.map(convertToDriveFile);

    void cacheFiles(files);

    return files;
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
    search,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDriveFileStore, import.meta.hot));
}
