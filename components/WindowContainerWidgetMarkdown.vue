<script setup lang="ts">
import type { DriveWidget, ModalWindow, WidgetMarkdown, WidgetProperties } from '~/models/types';
import { useDebounceFn } from '@vueuse/core';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, doc } from 'firebase/firestore';
import EditableDriveThumbnail from '~/components/EditableDriveThumbnail.vue';
import { ModalWindowStatus } from '~/models/types';

const props = defineProps<{
  window: ModalWindow;
  file?: DriveWidget;
  blocked?: boolean;
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
  props.window.status === ModalWindowStatus.LOADING
  || props.file?.loading
  || (!!props.file?.appProperties.firestoreId && widget.value === undefined)
));

const isDisabled = computed(() => isLoading.value || !!props.blocked);

const {
  imageFileId,
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
} = usePreviewImage(toRef(() => widgetModel.value?.avatar), {
  strategy: DataRetrievalStrategies.RECENT,
});

const isImageDirty = () => {
  return !((!imageFileId.value && !widget.value?.avatar)
    || (imageFileId.value === widget.value?.avatar?.id));
};

const checkDirty = () => {
  if (isDisabled.value || imageLoading.value) {
    if (props.blocked) {
      windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
    }
    return;
  }

  if (!widget.value) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
    return;
  }

  if (
    isImageDirty()
    || !isObjectEquals(
      widgetModel.value,
      widget.value,
      (value, original) => value === original,
    )
  ) {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
  } else {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
  }
};

watch(widgetModel, useDebounceFn(checkDirty, 1000), {
  deep: true,
  immediate: true,
});
watch([imageFileId, imageLoading], () => {
  if (!imageLoading.value)
    checkDirty();
});

const onImageUpdate = (fileId?: string) => {
  // EditableDriveThumbnail can publish an authoritative reconciliation while
  // the parent form is loading. Keep its model in sync even though dirty-state
  // evaluation and user edits are disabled until loading finishes.
  imageFileId.value = fileId ?? '';
  checkDirty();
};

// Block saving only while the staged selection's metadata is still loading;
// a failed load keeps the previous behaviour instead of wedging the form.
const imageReady = computed(() => !imageFileId.value || !!imageFile.value || !!imageError.value);
const editableThumbnail = ref<InstanceType<typeof EditableDriveThumbnail>>();
const thumbnailPending = computed(() => !!editableThumbnail.value?.pending);
const thumbnailError = ref('');
const onThumbnailError = (message: string) => {
  thumbnailError.value = message;
  console.error(message);
};

const updateAvatar = (payload: Partial<WidgetMarkdown>, imageId: string) => {
  if (!imageId) {
    payload.avatar = null;
    return;
  }
  const metadata = imageFile.value?.imageMediaMetadata;
  if (imageFile.value?.id === imageId && metadata?.width && metadata.height) {
    payload.avatar = PreviewPropertiesFactory({
      id: imageId,
      nativeWidth: metadata.width,
      nativeHeight: metadata.height,
    });
    return;
  }

  const existingAvatar = widget.value?.avatar;
  if (existingAvatar?.id === imageId && existingAvatar.nativeWidth && existingAvatar.nativeHeight) {
    payload.avatar = structuredClone(toRaw(existingAvatar));
    return;
  }

  throw new Error('Image details are unavailable for the selected image.');
};

const update = async (imageId: string) => {
  const payload = structuredClone(toRaw(widgetModel.value));
  updateAvatar(payload, imageId);

  const updated = await widgetStore.updateWidget<WidgetMarkdown>(widget.value!.id, payload);

  if (!updated) {
    throw new Error('Failed to update widget');
  }
};

const create = async (file: DriveWidget, imageId: string) => {
  const payload: WidgetMarkdown = {
    id: '', // will be filled on creation
    owner: '', // will be filled on creation
    fileId: file.id,
    enabled: false,
    template: WidgetTemplates.MARKDOWN,
    rank: Date.now(),
    ...structuredClone(toRaw(widgetModel.value)),
  };

  updateAvatar(payload, imageId);

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

const saveImageSelection = () => editableThumbnail.value?.saveParent(async (imageId) => {
  if (!props.file)
    throw new Error('The widget file is not available.');

  if (!props.file.appProperties.firestoreId || !widget.value) {
    await create(props.file, imageId);
  } else {
    await update(imageId);
  }
});

const submit = async () => {
  if (
    !props.file
    || isDisabled.value
    || imageLoading.value
    || !imageReady.value
    || thumbnailPending.value
    || (!widgetModel.value.content && !widgetModel.value.privateContent)
  ) {
    return;
  }

  checkDirty();
  if (props.window.status !== ModalWindowStatus.DIRTY) {
    return;
  }

  try {
    windowStore.setWindowStatus(props.window, ModalWindowStatus.LOADING);

    const saved = await saveImageSelection();
    if (!saved) {
      throw new Error(thumbnailError.value || 'Failed to save the image selection.');
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
        class="vertical-form window-form"
        @submit.prevent="submit"
      >
        <div class="horizontal-control">
          <EditableDriveThumbnail
            ref="editableThumbnail"
            :selected-id="imageFileId"
            :committed-id="widget?.avatar?.id ?? ''"
            :record-key="file?.id"
            :upload-parent-id="file?.parents?.[0]"
            width="120"
            height="120"
            fit="cover"
            :editable="!!file && !isDisabled"
            :removable="!!file && !isDisabled"
            @select="onImageUpdate"
            @error="onThumbnailError"
          />
        </div>

        <MarkdownEditor
          v-model="widgetModel.content"
          label="Content"
          placeholder="Enter markdown here"
          :disabled="isDisabled"
        />

        <MarkdownEditor
          v-model="widgetModel.privateContent"
          label="Private Content"
          placeholder="This is only visible to the owner"
          :disabled="isDisabled"
        />

        <va-divider />

        <div class="vertical-form__actions">
          <va-button
            preset="outlined"
            type="submit"
            :disabled="
              window.status === ModalWindowStatus.SYNCED
                || isDisabled
                || imageLoading
                || !imageReady
                || thumbnailPending
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
