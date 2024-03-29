const searchScene = async () => {
  const sceneSearchStore = useSceneSearchStore();
  const tableStore = useTableStore();

  try {
    const scene = await sceneSearchStore.promptToSearch();

    if (isScene(scene) && tableStore.sessionId) {
      await tableStore.setActiveScene(tableStore.sessionId, scene);
    }
  } catch (e) {
    if (isObject(e) && typeof e.message === 'string') {
      console.error(e);
      const notificationStore = useNotificationStore();
      notificationStore.error(e.message);
    }
  }
};

export const useSearchSceneFn = () => {
  return searchScene;
};
