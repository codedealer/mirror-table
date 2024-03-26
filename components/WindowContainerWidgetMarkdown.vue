<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { collection, doc } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import type { DriveWidget, ModalWindow, WidgetMarkdown, WidgetProperties } from '~/models/types';
import { ModalWindowStatus } from '~/models/types';

const props = defineProps<{
  window: ModalWindow
  file?: DriveWidget
}>();

const windowStore = useWindowStore();
const widgetStore = useWidgetStore();
const userStore = useUserStore();
const { $db } = useNuxtApp();

const widgetRef = computed(() => {
  if (!userStore.user || !props.file || !props.file.appProperties.firestoreId) {
    return undefined;
  }

  return doc(
    collection($db, 'users', userStore.user.uid, 'widgets'),
    props.file.appProperties.firestoreId,
  ).withConverter(firestoreDataConverter<WidgetMarkdown>());
});

const widget = useFirestore(widgetRef);

const widgetModel = ref<
Pick<WidgetMarkdown, 'content' | 'privateContent' | 'avatar'>
>({
  content: '',
  privateContent: '',
  avatar: null,
});

// populate the model
watchEffect(() => {
  if (!widget.value) {
    return;
  }

  widgetModel.value = {
    content: widget.value.content,
    privateContent: widget.value.privateContent,
    avatar: widget.value.avatar ? structuredClone(toRaw(widget.value.avatar)) : null,
  };
});

const isLoading = computed(() => (
  props.window.status === ModalWindowStatus.LOADING ||
  props.file?.loading ||
  (!!props.file?.appProperties.firestoreId && widget.value === undefined)
));

const {
  imageFileId,
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
} = usePreviewImage(toRef(() => widgetModel.value?.avatar), {
  strategy: DataRetrievalStrategies.RECENT,
});

const isImageDirty = () => {
  return !((!imageFileId.value && !widget.value?.avatar) ||
    (imageFileId.value === widget.value?.avatar?.id));
};

const checkDirty = () => {
  if (isLoading.value || imageLoading.value) {
    return;
  }

  if (!widget.value) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
    return;
  }

  if (!isObjectEquals(
    widgetModel.value,
    widget.value,
    (value, original, key) => key === 'avatar' ? !isImageDirty() : value === original,
  )) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
  } else {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  }
};

watch(widgetModel, useDebounceFn(checkDirty, 1000), {
  deep: true,
  immediate: true,
});

const onImageUpdate = (fileId?: string) => {
  imageFileId.value = fileId ?? '';
  checkDirty();
};

const updateAvatar = (payload: Partial<WidgetMarkdown>) => {
  if (imageFile.value) {
    payload.avatar = PreviewPropertiesFactory({
      id: imageFile.value.id,
      nativeWidth: imageFile.value.imageMediaMetadata.width,
      nativeHeight: imageFile.value.imageMediaMetadata.height,
    });
  } else {
    payload.avatar = null;
  }
};

const update = async (_: DriveWidget) => {
  const payload = structuredClone(toRaw(widgetModel.value));
  updateAvatar(payload);

  const updated = await widgetStore.updateWidget<WidgetMarkdown>(widget.value!.id, payload);

  if (!updated) {
    throw new Error('Failed to update widget');
  }
};

const create = async (file: DriveWidget) => {
  const payload: WidgetMarkdown = {
    id: '', // will be filled on creation
    owner: '', // will be filled on creation
    fileId: file.id,
    enabled: false,
    template: WidgetTemplates.MARKDOWN,
    rank: Date.now(),
    ...structuredClone(toRaw(widgetModel.value)),
  };

  updateAvatar(payload);

  const widget = await widgetStore.createWidget(payload);

  if (!widget) {
    throw new Error('Failed to create widget');
  }

  // update the file with the widget id
  const appProperties: WidgetProperties = {
    ...file.appProperties,
    firestoreId: widget.id,
  };

  const driveFileStore = useDriveFileStore();
  await driveFileStore.saveFile(
    file.id,
    appProperties,
    file.name,
  );
};

const submit = async () => {
  if (
    !props.file ||
    isLoading.value ||
    imageLoading.value ||
    (!widgetModel.value.content && !widgetModel.value.privateContent)
  ) {
    return;
  }

  checkDirty();
  if (props.window.status !== ModalWindowStatus.DIRTY) {
    return;
  }

  try {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);

    if (!props.file.appProperties.firestoreId || !widget.value) {
      await create(props.file);
    } else {
      await update(props.file);
    }

    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  } catch (e) {
    console.error(e);
    const notificationStore = useNotificationStore();
    notificationStore.error(extractErrorMessage(e));

    windowStore.setWindowStatus(props.window, ModalWindowStatus.ERROR);
  }
};
</script>

<template>
  <div class="window-container-widget-markdown__content">
    <va-inner-loading
      :loading="isLoading"
    >
      <va-form
        tag="form"
        class="vertical-form mb"
        @submit.prevent="submit"
      >
        <div class="horizontal-control">
          <DriveThumbnail
            :file="imageFile"
            :error="imageError"
            :file-is-loading="imageLoading"
            :upload-parent-id="file?.parents?.[0]"
            :allow-upload="!!file && !isLoading"
            width="120"
            height="120"
            fit="cover"
            removable
            @remove="onImageUpdate"
            @upload="onImageUpdate"
            @error="console.error"
          />
        </div>

        <va-textarea
          v-model="widgetModel.content"
          label="Content"
          required
          placeholder="Enter markdown here"
          resize
          :min-rows="5"
          :max-rows="25"
          :disabled="isLoading"
        />

        <va-textarea
          v-model="widgetModel.privateContent"
          label="Private Content"
          placeholder="This is only visible to the owner"
          resize
          :min-rows="5"
          :max-rows="25"
          :disabled="isLoading"
        />

        <va-divider />

        <div class="vertical-form__actions">
          <va-button
            preset="outlined"
            type="submit"
            :disabled="
              window.status === ModalWindowStatus.SYNCED
                || isLoading
                || imageLoading
                || (!widgetModel.content && !widgetModel.privateContent)"
          >
            Save
          </va-button>
        </div>
      </va-form>
    </va-inner-loading>
  </div>
</template>

<style scoped lang="scss">

</style>
