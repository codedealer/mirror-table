export const useSessionStore = defineStore('session', () => {
  const tableStore = useTableStore();
  const { sessionId } = toRefs(tableStore);

  const ownSession = computed(() => {
    if (
      !tableStore.table ||
      !tableStore.sessionId ||
      !Object.hasOwn(tableStore.table.session, tableStore.sessionId)
    ) {
      return undefined;
    }

    return tableStore.table.session[tableStore.sessionId];
  });

  const viewerSessions = computed(() => {
    if (!tableStore.table || !tableStore.sessionId) {
      return [];
    }

    return (({ [tableStore.sessionId]: _, ...viewers }) => Object.entries(viewers).map(([k, v]) => ({ [k]: v })))(tableStore.table.session);
  });

  const emptyTable = computed(() => {
    return viewerSessions.value.length === 0;
  });

  return {
    ownSessionId: sessionId,
    ownSession,
    viewerSessions,
    emptyTable,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useSessionStore, import.meta.hot),
  );
}
