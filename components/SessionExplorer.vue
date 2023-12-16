<script setup lang="ts">
const sessionStore = useSessionStore();

const { confirm } = useModal();

const onPrivateSessionCreate = async () => {
  if (sessionStore.privateSessions.length > 0) {
    const confirmed = await confirm({
      title: 'Private session already exists',
      message: 'One private session can be used on multiple devices, you only need another one if you\'re planning on showing different scenes on different devices/screens. Do you want to create another private session?',
      okText: 'Create',
      cancelText: 'Cancel',
      size: 'small',
    });

    if (!confirmed) {
      return;
    }
  }

  await sessionStore.createPrivateSession();
};
</script>

<template>
  <div class="session-explorer">
    <div class="session-explorer-header mb">
      <div class="session-explorer-header__title">
        <h3>Active Sessions</h3>
      </div>
      <div class="session-explorer-header__actions flex">
        <va-popover message="Can't invite others to a private table" placement="bottom">
          <div>
            <va-button
              round
              size="small"
              color="secondary"
              icon="person_add"
              disabled
            />
          </div>
        </va-popover>

        <va-popover message="Add private session" placement="bottom">
          <div>
            <va-button
              round
              size="small"
              color="primary-dark"
              icon="add_to_queue"
              @click="onPrivateSessionCreate"
            />
          </div>
        </va-popover>
      </div>
    </div>

    <va-card
      v-if="sessionStore.emptyTable"
      class="session-explorer__empty"
    >
      <va-card-content>
        <div class="centered mb">
          <va-icon
            name="desktop_access_disabled"
            size="48px"
            color="primary"
          />
        </div>
        <h4 class="mb tc">
          There are no active sessions
        </h4>
        <p class="va-paragraph">
          Each client connecting to a table needs to have a session. A session controls which scene the viewer is currently watching.
        </p>
        <p class="va-paragraph">
          Private sessions are a primary way to present a table. Private session does not have to be on the same device, just on the same account. However, a private session launched on the same device has certain performance advantages.
        </p>

        <div class="tc">
          <va-button
            icon="add_to_queue"
            color="primary-dark"
            size="medium"
            @click="onPrivateSessionCreate"
          >
            Add private session
          </va-button>
        </div>
      </va-card-content>
    </va-card>

    <SessionExplorerList v-else />
  </div>
</template>

<style scoped lang="scss">
.session-explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  border-bottom: 1px solid var(--va-background-border);
}
.session-explorer-header__actions {
  gap: 4px;
}
.session-explorer__empty {
  --va-card-box-shadow: none;
  p {
    font-size: 14px;
  }
}
</style>
