import type { AssetProperties, PreviewProperties } from '~/models/types';
import { DataRetrievalStrategies, isAssetProperties } from '~/models/types';

const normalizePreview = (preview?: PreviewProperties | null) => {
  if (!preview) {
    return undefined;
  }

  return {
    id: preview.id,
    nativeWidth: preview.nativeWidth,
    nativeHeight: preview.nativeHeight,
    rotation: preview.rotation ?? 0,
    scaleX: preview.scaleX ?? 1,
    scaleY: preview.scaleY ?? 1,
  };
};

const nearlyEqual = (a: number, b: number, epsilon = 1e-4) => {
  return Math.abs(a - b) <= epsilon;
};

const areComplexAssetPropertiesEquivalent = (a: AssetProperties, b: AssetProperties) => {
  const titleA = a.title ?? '';
  const titleB = b.title ?? '';
  const showTitleA = titleA ? !!a.showTitle : false;
  const showTitleB = titleB ? !!b.showTitle : false;

  if (a.kind !== b.kind) {
    return false;
  }
  if (titleA !== titleB) {
    return false;
  }
  if (showTitleA !== showTitleB) {
    return false;
  }

  const previewA = normalizePreview(a.preview);
  const previewB = normalizePreview(b.preview);

  if (!previewA && !previewB) {
    return true;
  }
  if (!previewA || !previewB) {
    return false;
  }

  if (previewA.id !== previewB.id) {
    return false;
  }
  if (previewA.nativeWidth !== previewB.nativeWidth || previewA.nativeHeight !== previewB.nativeHeight) {
    return false;
  }
  if (!nearlyEqual(previewA.rotation, previewB.rotation, 1e-2)) {
    return false;
  }
  if (!nearlyEqual(previewA.scaleX, previewB.scaleX) || !nearlyEqual(previewA.scaleY, previewB.scaleY)) {
    return false;
  }

  return true;
};

const updateComplexAssetProperties = async (fileId: string, properties: AssetProperties) => {
  const driveFileStore = useDriveFileStore();

  try {
    // Avoid spamming Drive metadata updates if appProperties are identical.
    // We use cache-only lookup so this guard doesn't trigger extra Drive reads.
    {
      const { file: driveFile } = await driveFileStore.getFile(
        fileId,
        DataRetrievalStrategies.CACHE_ONLY,
      );

      if (driveFile?.appProperties && isAssetProperties(driveFile.appProperties)) {
        if (areComplexAssetPropertiesEquivalent(driveFile.appProperties, properties)) {
          return;
        }
      }
    }

    await driveFileStore.saveFile(fileId, properties);
  } catch (e) {
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));
    console.error(e);
  }
};

export default updateComplexAssetProperties;
