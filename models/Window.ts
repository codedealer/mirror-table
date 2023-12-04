import type { ModalWindow, ModalWindowContent } from '~/models/types';

export const WindowFactory = (id: string, title: string, content: ModalWindowContent, status: typeof ModalWindowStatus[keyof typeof ModalWindowStatus] = ModalWindowStatus.SYNCED): ModalWindow => ({
  id,
  title,
  pinned: false,
  active: true,
  status,
  content,
});
