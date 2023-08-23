import type { DriveInvalidParentFolderError } from '~/models/types';
import { createFolder, folderExists, shareFolder } from '~/utils/driveOps';

// check the workspace only once per session
let checkedWorkspaceFolder = false;

const checkWorkspaceFolder = async (parentId: string) => {
  const err = new Error('Invalid parent folder') as DriveInvalidParentFolderError;
  err.code = 'drive_invalid_parent_folder';

  // parent cannot be empty
  if (!parentId) {
    throw err;
  }

  if (checkedWorkspaceFolder) {
    return;
  }

  const config = useRuntimeConfig();
  // do not check root folder
  if (parentId === config.public.rootFolder) {
    checkedWorkspaceFolder = true;
    return;
  }

  // check if the folder exists
  if (!(await folderExists(parentId))) {
    throw err;
  }

  // the following code is not needed for now: search folder can only
  // contain shortcuts and keeping track of them can be cumbersome
  // if files can be arbitrarily changed/deleted outside the app

  // if there is a non-root parent folder, there must be a .search child folder
  /* const searchError = new Error('Invalid search folder') as DriveInvalidSearchFolderError;
  searchError.code = 'drive_invalid_search_folder';
  if (!searchId || !(await folderExists(searchId))) {
    throw searchError;
  } */

  checkedWorkspaceFolder = true;
};

const createSearchFolder = async (parentId: string) => {
  const config = useRuntimeConfig();
  const searchFolderId = await createFolder(config.public.searchFolder, parentId);

  return searchFolderId;
};

const createWorkspaceFolder = async (name: string) => {
  const workspaceId = await createFolder(name);

  // share folder with anyone with link
  await shareFolder(workspaceId);

  // create .search folder
  const searchId = await createSearchFolder(workspaceId);

  return { workspace: workspaceId, search: searchId };
};

export const usePickerParentFolder = () => {
  return {
    checkWorkspaceFolder,
    createWorkspaceFolder,
    createSearchFolder,
  };
};
