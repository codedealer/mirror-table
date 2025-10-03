import { isDriveInvalidParentFolderError, isDriveInvalidSearchFolderError } from '~/models/types';

/**
 * Check that the workspace folder is set and valid before committing
 * any operations to Google Drive.
 */
const driveWorkspaceSentinel = async () => {
  const userStore = useUserStore();
  const driveStore = useDriveStore();

  if (
    !driveStore.isReady
    || !userStore.isAuthenticated
    || !userStore.profile
  ) {
    throw new Error('Calling Drive API when the API is not ready or user is not authenticated');
  }

  const {
    checkWorkspaceFolder,
    createWorkspaceFolder,
    createSearchFolder,
  } = usePickerParentFolder();

  // check workspace folder
  try {
    const settings = userStore.profile.settings;
    await checkWorkspaceFolder(settings.driveFolderId);
  } catch (e) {
    if (
      !isDriveInvalidParentFolderError(e)
      && !isDriveInvalidSearchFolderError(e)
    ) {
      throw e;
    }

    let workspaceFolderId = '';
    let searchFolderId = '';

    if (isDriveInvalidParentFolderError(e)) {
      // show prompt to create workspace folder
      try {
        const newFolderName = await driveStore.promptToCreateParentFolder() as string;

        // create folder
        const workspaceSettings = await createWorkspaceFolder(newFolderName);
        workspaceFolderId = workspaceSettings.workspace;
        searchFolderId = workspaceSettings.search;
      } catch (e) {
        if (typeof e === 'string') {
          // chose the root folder
          // in this case search folder is not needed
          workspaceFolderId = e;
        } else {
          throw e;
        }
      }
    } else {
      // the workspace folder is valid, but the search folder is not
      workspaceFolderId = userStore.profile.settings.driveFolderId;
      searchFolderId = await createSearchFolder(workspaceFolderId);
    }

    const newProfile = structuredClone(toRaw(userStore.profile));
    newProfile.settings.driveFolderId = workspaceFolderId;
    newProfile.settings.searchFolderId = searchFolderId;
    await userStore.updateProfile(newProfile);
  }
};

export default driveWorkspaceSentinel;
