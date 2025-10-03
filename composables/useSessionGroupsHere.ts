import type { Category, Scene } from '~/models/types';
import { isScene } from '~/models/types';

export const useSessionGroupsHere
  = (
    item: Ref<Scene | Category | undefined>,
  ) => {
    const sessionStore = useSessionStore();

    const filter = (item: Scene | Category, positive: boolean) => {
      if (isScene(item)) {
        return sessionStore.sessionGroups.filter(
          g => positive ? g.sceneId === item.id : g.sceneId !== item.id,
        );
      } else {
        return sessionStore.sessionGroups.filter(
          g => positive
            ? g.path.includes(item.id)
            : !g.path.includes(item.id),
        );
      }
    };

    const here = computed(() => {
      if (!item.value) {
        return [];
      }

      return filter(item.value, true);
    });

    const notHere = computed(() => {
      if (!item.value) {
        return [];
      }

      return filter(item.value, false);
    });

    return {
      here,
      notHere,
    };
  };
