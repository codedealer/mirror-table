import type { DataRetrievalStrategy, DriveFile, RawMediaObject } from '~/models/types';

export const useDriveMedia = (
  file: Ref<DriveFile | undefined>,
  mediaStrategy: DataRetrievalStrategy = DataRetrievalStrategies.LAZY,
  fileStrategy: DataRetrievalStrategy = DataRetrievalStrategies.RECENT,
  reloadRef?: Ref<unknown>,
) => {
  const media = ref<RawMediaObject | undefined>();
  const error = ref<unknown>();

  const reload = reloadRef ?? ref(0);
  const activeRequests = new Set<string>();
  const failedRequests = new Map<string, unknown>();
  const pendingRetries = new Set<string>();
  let observedRequestKey: string | undefined;
  let observedReload = reload.value;

  const requestKeyFor = (currentFile: DriveFile | undefined) => currentFile
    ? JSON.stringify([currentFile.id, currentFile.md5Checksum ?? ''])
    : undefined;

  const loadMedia = async () => {
    const currentFile = file.value;
    const requestKey = requestKeyFor(currentFile);
    const selectionChanged = requestKey !== observedRequestKey;
    if (selectionChanged) {
      observedRequestKey = requestKey;
      failedRequests.clear();
      // Do not show the previous selection's media or error while this selection loads.
      media.value = undefined;
      error.value = undefined;
    }

    const reloadGeneration = reload.value;
    const reloadChanged = !Object.is(reloadGeneration, observedReload);
    if (reloadChanged) {
      observedReload = reloadGeneration;
      if (requestKey)
        failedRequests.delete(requestKey);
    }

    if (!currentFile || !requestKey)
      return;

    if (
      isAssetProperties(currentFile.appProperties)
      && currentFile.appProperties.kind === AssetPropertiesKinds.IMAGE
    ) {
      return;
    }

    if (activeRequests.has(requestKey)) {
      // Loading mutations themselves must not queue retries. A changed selection
      // or explicit reload during the attempt is honored after it settles.
      if (selectionChanged || reloadChanged)
        pendingRetries.add(requestKey);
      return;
    }

    if (currentFile.loading)
      return;

    if (
      currentFile.id === media.value?.id
      && currentFile.md5Checksum
      && currentFile.md5Checksum === media.value?.md5Checksum
    ) {
      return;
    }

    if (failedRequests.has(requestKey) && Object.is(failedRequests.get(requestKey), reloadGeneration))
      return;

    failedRequests.delete(requestKey);
    activeRequests.add(requestKey);
    const attemptReloadGeneration = reloadGeneration;
    const driveFileStore = useDriveFileStore();

    try {
      error.value = undefined;

      const mediaObj = await driveFileStore.downloadMedia(
        currentFile,
        mediaStrategy,
        fileStrategy,
      );

      if (!mediaObj)
        throw new Error('Could not download file');

      // An older request may settle after the consumer has selected a different
      // file. Never publish that response as the current selection's media.
      if (observedRequestKey === requestKey) {
        media.value = mediaObj;
        error.value = undefined;
      }
    } catch (err) {
      console.error(err);
      if (observedRequestKey === requestKey) {
        error.value = err;
        // Loading transitions are deeply watched below. Suppress automatic
        // retries for this generation; explicit reload or selection change clears it.
        failedRequests.set(requestKey, attemptReloadGeneration);
      }
    } finally {
      activeRequests.delete(requestKey);
      const retryWasRequested = pendingRetries.delete(requestKey);
      const generationAdvanced = !Object.is(reload.value, attemptReloadGeneration);
      if (observedRequestKey === requestKey && (retryWasRequested || generationAdvanced)) {
        failedRequests.delete(requestKey);
        queueMicrotask(() => void loadMedia());
      }
    }
  };

  watch([file, reload], loadMedia, {
    immediate: true,
    deep: true,
  });

  return {
    media,
    error,
  };
};
