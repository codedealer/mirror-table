import type { DriveFile, ModalWindowContentMarkdown } from '~/models/types';
import { WindowFactory } from '~/models/Window';

const toggleFile = (file: DriveFile | undefined, label: string) => {
  if (!file || file.trashed) {
    return;
  }

  const windowStore = useWindowStore();

  // assuming the file is a markdown file for now
  // create a new window
  const windowContent: ModalWindowContentMarkdown = {
    type: 'markdown',
    editing: false,
    data: undefined,
  };

  const window = WindowFactory(
    file.id,
    label,
    windowContent,
  );

  windowStore.toggleOrAdd(window);
};

export default toggleFile;
