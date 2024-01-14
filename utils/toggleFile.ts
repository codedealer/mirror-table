import type {
  DriveFile,
  ModalWindowContent,
  ModalWindowContentMarkdown,
  ModalWindowContentWidget,
} from '~/models/types';
import { WindowFactory } from '~/models/Window';

const toggleFile = (file: DriveFile | undefined, label: string) => {
  if (!file || file.trashed) {
    return;
  }

  const windowStore = useWindowStore();

  // create a new window
  let windowContent: ModalWindowContent;
  if (isDriveAsset(file)) {
    windowContent = {
      type: 'markdown',
      editing: false,
      data: undefined,
    } as ModalWindowContentMarkdown;
  } else if (isDriveWidget(file)) {
    windowContent = {
      type: 'widget',
      editing: false,
    } as ModalWindowContentWidget;
  } else {
    throw new Error('Trying to open an unknown file type');
  }

  const window = WindowFactory(
    file.id,
    label,
    windowContent,
  );

  windowStore.toggleOrAdd(window);
};

export default toggleFile;
