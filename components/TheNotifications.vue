<script setup lang="ts">
const notificationStore = useNotificationStore();
onMounted(() => {

});
</script>

<template>
  <div class="notifications-container">
    <div v-if="notificationStore.notifications.length">
      <ToastNotification
        v-for="notification of notificationStore.notifications"
        :key="notification.id"
        :title="notification.title"
        :message="notification.message"
        :icon="notification.icon"
        :duration="notification.duration"
        :color="notification.color"
        @close="notificationStore.remove(notification.id)"
      >
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
      </ToastNotification>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notifications-container {
  position: fixed;
  right: 0;
  top: 0;
  z-index: 9999;
}
</style>
