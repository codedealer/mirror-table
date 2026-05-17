import type { DriveAsset, DriveFile, DriveTreeNode, TreeNode } from '~/models/types';
import { AssetPropertiesFactory } from '~/models/AssetProperties';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';
import { AppPropertiesTypes, AssetPropertiesKinds, DataRetrievalStrategies, DriveFileExtensions, DriveMimeTypes, isObject, PickerViewTemplates, SelectionGroups } from '~/models/types';
import { stripFileExtension } from '~/utils';
import { extractErrorMessage } from '~/utils/extractErrorMessage';

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

  const createImageAsset = async (
    image: DriveFile,
    assetTitle: string,
    kind: AssetPropertiesKind,
    parentFolderId?: string,
  ): Promise<DriveAsset> => {
    if (!image.imageMediaMetadata) {
      throw new Error('Image does not have image metadata');
    }

    const userStore = useUserStore();
    const workspaceFolderId = userStore.profile?.settings.driveFolderId;

    if (!workspaceFolderId) {
      throw new Error('User workspace folder not configured');
    }

    const fileExtension = DriveFileExtensions[DriveMimeTypes.MARKDOWN];
    const fileName = `${assetTitle || stripFileExtension(image.name)}.${fileExtension}`;
    const fileObject = new File([], fileName, { type: DriveMimeTypes.MARKDOWN });

    const appProperties = AssetPropertiesFactory({
      type: AppPropertiesTypes.ASSET,
      kind,
      title: assetTitle,
      showTitle: '',
    });

    appProperties.preview = PreviewPropertiesFactory({
      id: image.id,
      nativeWidth: image.imageMediaMetadata.width,
      nativeHeight: image.imageMediaMetadata.height,
    });

    const assetFileId = await driveFileStore.createFile(fileObject, parentFolderId ?? workspaceFolderId, appProperties);

    if (!assetFileId) {
      throw new Error(`Failed to create asset file "${fileName}"`);
    }

    const { file: assetFile } = await driveFileStore.getFile(assetFileId, DataRetrievalStrategies.SOURCE);

    if (!assetFile || !assetFile.appProperties) {
      throw new Error(`Failed to load asset file after creating "${fileName}"`);
    }

    return assetFile as DriveAsset;
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
          await createImageAsset(image, title, kind, parentNode.id);
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
          createdAsset = await createImageAsset(image, '', AssetPropertiesKinds.IMAGE, assetFolderId);

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
