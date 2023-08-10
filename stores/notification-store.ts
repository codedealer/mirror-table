import { acceptHMRUpdate, defineStore } from 'pinia';
import type { Notification } from '~/models/types';

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([]);

  const add = (notification: Partial<Notification>) => {
    const id = new Date().getTime().toString();
    notifications.value.push({
      id,
      message: notification.message ?? '',
      ...notification,
    });
  };

  const error = (message: string) => {
    add({ message, icon: 'error_outline', color: 'danger' });
  };

  const remove = (id: string) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  return {
    notifications,
    add,
    error,
    remove,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useNotificationStore, import.meta.hot),
  );
}
