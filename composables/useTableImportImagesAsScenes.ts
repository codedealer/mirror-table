import type { DriveAsset, DriveFile, DriveTreeNode, TreeNode } from '~/models/types';
import { AssetPropertiesFactory } from '~/models/AssetProperties';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';
import { AppPropertiesTypes, AssetPropertiesKinds, DataRetrievalStrategies, DriveFileExtensions, DriveMimeTypes, isObject, PickerViewTemplates, SelectionGroups } from '~/models/types';
import { stripFileExtension } from '~/utils';
import { uploadRawMedia } from '~/utils/driveOps';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

export interface ImportImageFilesAsAssetsResult {
  assets: DriveAsset[];
  successCount: number;
  failureCount: number;
}

export interface ImportImageFilesAsAssetsProgress {
  completedCount: number;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export interface ImportImageFilesAsAssetsOptions {
  onFileDone?: (progress: ImportImageFilesAsAssetsProgress) => void;
}

export const uploadImageFileToDrive = async (
  file: File,
  parentFolderId: string,
): Promise<DriveFile> => {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Unsupported image file type: ${file.type || 'unknown'}`);
  }

  const driveFileStore = useDriveFileStore();
  const uploadedFile = await uploadRawMedia(file, parentFolderId);

  if (!uploadedFile.id) {
    throw new Error(`Failed to upload image "${file.name}"`);
  }

  const { file: driveImage } = await driveFileStore.getFile(uploadedFile.id, DataRetrievalStrategies.SOURCE);

  if (!driveImage?.imageMediaMetadata) {
    throw new Error(`Uploaded file "${file.name}" is not a valid Drive image`);
  }

  return driveImage;
};

export const createImageAssetFromDriveImage = async (
  image: DriveFile,
  kind: AssetPropertiesKind,
  parentFolderId: string,
  assetTitle?: string,
): Promise<DriveAsset> => {
  if (!image.imageMediaMetadata) {
    throw new Error('Image does not have image metadata');
  }

  const driveFileStore = useDriveFileStore();

  const resolvedTitle = assetTitle ?? (stripFileExtension(image.name) || image.name || 'Untitled');
  const fileExtension = DriveFileExtensions[DriveMimeTypes.MARKDOWN];
  const fileName = `${resolvedTitle}.${fileExtension}`;
  const fileObject = new File([], fileName, { type: DriveMimeTypes.MARKDOWN });

  const propRecord: Record<string, string> = {
    type: AppPropertiesTypes.ASSET,
    kind,
  };

  if (assetTitle) {
    propRecord.title = assetTitle;
  }

  const appProperties = AssetPropertiesFactory(propRecord);

  appProperties.preview = PreviewPropertiesFactory({
    id: image.id,
    nativeWidth: image.imageMediaMetadata.width,
    nativeHeight: image.imageMediaMetadata.height,
  });

  const assetFileId = await driveFileStore.createFile(fileObject, parentFolderId, appProperties);

  if (!assetFileId) {
    throw new Error(`Failed to create asset file "${fileName}"`);
  }

  const { file: assetFile } = await driveFileStore.getFile(assetFileId, DataRetrievalStrategies.SOURCE);

  if (!assetFile || !assetFile.appProperties) {
    throw new Error(`Failed to load asset file after creating "${fileName}"`);
  }

  return assetFile as DriveAsset;
};

export const importImageFilesAsAssets = async (
  files: File[],
  kind: AssetPropertiesKind,
  parentFolderId: string,
  options?: ImportImageFilesAsAssetsOptions,
): Promise<ImportImageFilesAsAssetsResult> => {
  const result: ImportImageFilesAsAssetsResult = {
    assets: [],
    successCount: 0,
    failureCount: 0,
  };

  const totalCount = files.filter(file => file.type.startsWith('image/')).length;
  let completedCount = 0;

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      continue;
    }

    try {
      const uploadedImage = await uploadImageFileToDrive(file, parentFolderId);
      const title = stripFileExtension(file.name) || file.name || 'Untitled';
      const createdAsset = await createImageAssetFromDriveImage(uploadedImage, kind, parentFolderId, title);

      result.assets.push(createdAsset);
      result.successCount++;
    } catch {
      result.failureCount++;
    } finally {
      completedCount++;
      options?.onFileDone?.({
        completedCount,
        totalCount,
        successCount: result.successCount,
        failureCount: result.failureCount,
      });
    }
  }

  return result;
};

/**
 * Shared image import workflow used by the Drive tree and the Table Explorer.
 */
export const useTableImportImagesAsScenes = () => {
  const tableExplorerStore = useTableExplorerStore();
  const tableStore = useTableStore();
  const driveFileStore = useDriveFileStore();
  const notificationStore = useNotificationStore();
  const sceneStore = useSceneStore();

  const pickImageIds = async (options: { parentId: string; uploadParentId?: string }) => {
    const { buildPicker } = usePicker();

    return await new Promise<string[] | null>((resolve, reject) => {
      void buildPicker({
        parentId: options.parentId,
        uploadParentId: options.uploadParentId,
        template: PickerViewTemplates.IMAGES,
        allowMultiSelect: true,
        allowUpload: true,
        callback: (result) => {
          if (
            result.action === google.picker.Action.PICKED
            && result.docs.length > 0
          ) {
            resolve(result.docs.map(doc => doc.id).filter((id): id is string => !!id));
            return;
          }

          if (
            result.action === google.picker.Action.CANCEL
            || result.action === google.picker.Action.PICKED
          ) {
            resolve(null);
          }
        },
      }).catch(reject);
    });
  };

  const loadImages = async (imageIds: string[]) => {
    const { files } = await driveFileStore.getFiles(imageIds);
    return files.filter((file): file is DriveFile => !!file && !!file.imageMediaMetadata);
  };

  const getSceneIdFromError = (error: unknown) => {
    if (!isObject(error) || typeof error.sceneId !== 'string') {
      return;
    }

    return error.sceneId;
  };

  const importImagesAsAssets = async (
    kind: AssetPropertiesKind,
    parentNode: DriveTreeNode,
  ): Promise<boolean> => {
    const userStore = useUserStore();
    const driveTreeStore = useDriveTreeStore();
    const workspaceFolderId = userStore.profile?.settings.driveFolderId;

    if (!workspaceFolderId) {
      notificationStore.error('User workspace folder not configured');
      return false;
    }

    try {
      const pickedImageIds = await pickImageIds({
        parentId: workspaceFolderId,
        uploadParentId: parentNode.id,
      });

      if (!pickedImageIds?.length) {
        return false;
      }

      driveTreeStore.setNodeLoading(parentNode, true);

      const images = await loadImages(pickedImageIds);
      if (!images.length) {
        notificationStore.error('No valid images to import');
        return false;
      }

      let successCount = 0;
      let failureCount = 0;

      for (const image of images) {
        const title = stripFileExtension(image.name) || image.name || 'Untitled';

        try {
          await createImageAssetFromDriveImage(image, kind, parentNode.id, title);
          successCount++;
        } catch (error) {
          failureCount++;
          notificationStore.error(`Failed to import "${image.name}": ${extractErrorMessage(error)}`);
        }
      }

      if (successCount > 0) {
        await driveTreeStore.loadChildren(parentNode);
        driveTreeStore.setFolderOpen(parentNode.id, true);

        notificationStore.success(
          failureCount > 0
            ? `Imported ${successCount} image asset(s), ${failureCount} failed`
            : `Successfully imported ${successCount} image asset(s)`,
        );

        return true;
      }

      return false;
    } catch (error) {
      notificationStore.error(extractErrorMessage(error));
      return false;
    } finally {
      driveTreeStore.setNodeLoading(parentNode, false);
    }
  };

  const importImagesAsScenes = async (
    parentNode: TreeNode,
    categoryPath: string[],
  ): Promise<boolean> => {
    const userStore = useUserStore();
    const workspaceFolderId = userStore.profile?.settings.driveFolderId;

    if (!tableStore.table) {
      notificationStore.error('Table not loaded');
      return false;
    }

    if (!workspaceFolderId) {
      notificationStore.error('User workspace folder not configured');
      return false;
    }

    try {
      const driveTreeStore = useDriveTreeStore();
      const uploadParentId = driveTreeStore.visibleRootNode.id || workspaceFolderId;
      const pickedImageIds = await pickImageIds({
        parentId: workspaceFolderId,
        uploadParentId,
      });

      if (!pickedImageIds?.length) {
        return false;
      }

      tableExplorerStore.setNodeLoading(parentNode, true);

      const images = await loadImages(pickedImageIds);
      if (!images.length) {
        notificationStore.error('No valid images to import');
        return false;
      }

      let successCount = 0;
      let failureCount = 0;
      const assetFolderId = driveTreeStore.visibleRootNode.id || workspaceFolderId;

      for (const image of images) {
        const sceneTitle = stripFileExtension(image.name) || image.name || 'Untitled';
        let createdSceneId: string | undefined;
        let createdAsset: DriveAsset | undefined;

        try {
          createdSceneId = await tableExplorerStore.saveScene(sceneTitle, parentNode, undefined, categoryPath);

          if (!createdSceneId) {
            throw new Error(`Failed to create scene "${sceneTitle}"`);
          }

          // title is empty because the asset is meant to be a background
          createdAsset = await createImageAssetFromDriveImage(image, AssetPropertiesKinds.IMAGE, assetFolderId);

          const sceneElementId = await sceneStore.addAssetToScene(createdSceneId, createdAsset, undefined, {
            enabled: true,
            selectionGroup: SelectionGroups.BACKGROUND,
          });

          if (!sceneElementId) {
            throw new Error(`Failed to add image background to scene "${sceneTitle}"`);
          }

          successCount++;
        } catch (error) {
          const sceneIdFromError = createdSceneId ?? getSceneIdFromError(error);

          if (createdAsset) {
            try {
              await driveFileStore.removeFile(createdAsset.id);
            } catch (cleanupError) {
              notificationStore.error(
                `Failed to clean up imported asset "${image.name}": ${extractErrorMessage(cleanupError)}`,
              );
            }
          }

          if (sceneIdFromError) {
            try {
              await tableExplorerStore.trashSceneById(sceneIdFromError, true);
            } catch (cleanupError) {
              notificationStore.error(
                `Failed to clean up imported scene "${sceneTitle}": ${extractErrorMessage(cleanupError)}`,
              );
            }
          }

          failureCount++;
          notificationStore.error(`Failed to import "${image.name}": ${extractErrorMessage(error)}`);
        }
      }

      if (successCount > 0) {
        await tableExplorerStore.loadChildren(parentNode);
        notificationStore.success(
          failureCount > 0
            ? `Imported ${successCount} scene(s), ${failureCount} failed`
            : `Successfully imported ${successCount} scene(s)`,
        );

        return true;
      }

      return false;
    } catch (error) {
      notificationStore.error(extractErrorMessage(error));
      return false;
    } finally {
      tableExplorerStore.setNodeLoading(parentNode, false);
    }
  };

  return {
    importImagesAsAssets,
    importImagesAsScenes,
  };
};
