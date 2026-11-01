<script setup lang="ts">
import type {
  DriveWidget,
  ModalWindow,
  WidgetCandelaPlayer,
  WidgetProperties,
} from '~/models/types';
import { useDebounceFn } from '@vueuse/core';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { collection, doc } from 'firebase/firestore';
import EditableDriveThumbnail from '~/components/EditableDriveThumbnail.vue';
import { ModalWindowStatus, WidgetTemplates } from '~/models/types';

const props = defineProps<{
  window: ModalWindow;
  file?: DriveWidget;
  blocked?: boolean;
}>();

type WidgetModel = Pick<WidgetCandelaPlayer, 'content' | 'privateContent' | 'player'>;

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
  ).withConverter(firestoreDataConverter<WidgetCandelaPlayer>());
});

const widget = useFirestore(widgetRef);

const widgetModel = ref<WidgetModel>({
  content: '',
  privateContent: '',
  player: {
    name: '',
    role: '',
    speciality: '',
    avatar: null,
    marks: {
      body: 0,
      mind: 0,
      bleed: 0,
    },
    scars: 0,
  },
});

watchEffect(() => {
  if (!widget.value) {
    return;
  }

  widgetModel.value = {
    content: widget.value.content,
    privateContent: widget.value.privateContent,
    player: structuredClone(toRaw(widget.value.player)),
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
} = usePreviewImage(toRef(() => widgetModel.value?.player?.avatar), {
  strategy: DataRetrievalStrategies.RECENT,
});

const isImageDirty = () => {
  return !((!imageFileId.value && !widget.value?.player?.avatar)
    || (imageFileId.value === widget.value?.player?.avatar?.id));
};

const checkDirty = () => {
  if (isDisabled.value || imageLoading.value) {
    if (props.blocked) {
      windowStore.setWindowStatus(props.window, ModalWindowStatus.SYNCED);
    }
    return;
  }

  if (!widget.value) {
    // technically new but set to dirty, so it can be saved
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

const updateAvatar = (payload: WidgetModel, imageId: string) => {
  if (!imageId) {
    payload.player.avatar = null;
    return;
  }
  const metadata = imageFile.value?.imageMediaMetadata;
  if (imageFile.value?.id === imageId && metadata?.width && metadata.height) {
    payload.player.avatar = PreviewPropertiesFactory({
      id: imageId,
      nativeWidth: metadata.width,
      nativeHeight: metadata.height,
    });
    return;
  }

  const existingAvatar = widget.value?.player?.avatar;
  if (existingAvatar?.id === imageId && existingAvatar.nativeWidth && existingAvatar.nativeHeight) {
    payload.player.avatar = structuredClone(toRaw(existingAvatar));
    return;
  }

  throw new Error('Image details are unavailable for the selected image.');
};

const create = async (file: DriveWidget, imageId: string) => {
  const payload: WidgetCandelaPlayer = {
    id: '', // will be filled on creation
    owner: '', // will be filled on creation
    fileId: file.id,
    enabled: false,
    template: WidgetTemplates.CANDELA_PLAYER,
    rank: Date.now(),
    ...structuredClone(toRaw(widgetModel.value)),
  };

  updateAvatar(payload, imageId);

  const created = await widgetStore.createWidget(payload);

  if (!created) {
    throw new Error('Failed to create widget');
  }

  // update the file with the widget id
  // TODO: probably want to save the image as well
  const appProperties: WidgetProperties = {
    ...file.appProperties,
    firestoreId: created.id,
  };

  const driveFileStore = useDriveFileStore();
  await driveFileStore.saveFile(
    file.id,
    appProperties,
    file.name,
  );
};

const update = async (imageId: string) => {
  // TODO: update the image in the file properties as well
  const payload = structuredClone(toRaw(widgetModel.value));

  updateAvatar(payload, imageId);

  const updated = await widgetStore.updateWidget<WidgetCandelaPlayer>(widget.value!.id, payload);

  if (!updated) {
    throw new Error('Failed to update widget');
  }
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
    || !widgetModel.value.player.name
  ) {
    return;
  }

  checkDirty();
  if (props.window.status === ModalWindowStatus.SYNCED) {
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
  <div class="window-container-candela-player__content">
    <va-inner-loading :loading="isLoading">
      <va-form
        tag="form"
        class="vertical-form window-form"
        @submit.prevent="submit"
      >
        <div class="horizontal-form">
          <EditableDriveThumbnail
            ref="editableThumbnail"
            :selected-id="imageFileId"
            :committed-id="widget?.player?.avatar?.id ?? ''"
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

          <div class="vertical-form">
            <va-input
              v-model="widgetModel.player.name"
              label="Name"
              min-length="1"
              :disabled="isDisabled"
              required
            />

            <va-input
              v-model="widgetModel.player.role"
              label="Role"
              :disabled="isDisabled"
            />

            <va-input
              v-model="widgetModel.player.speciality"
              label="Speciality"
              :disabled="isDisabled"
            />
          </div>
        </div>

        <va-divider />

        <div class="horizontal-form">
          <va-input
            v-model.number="widgetModel.player.marks.body"
            label="Body"
            type="number"
            class="input-sm"
            :disabled="isDisabled"
          />

          <va-input
            v-model.number="widgetModel.player.marks.mind"
            label="Mind"
            type="number"
            class="input-sm"
            :disabled="isDisabled"
          />

          <va-input
            v-model.number="widgetModel.player.marks.bleed"
            label="Bleed"
            type="number"
            class="input-sm"
            :disabled="isDisabled"
          />

          <va-input
            v-model.number="widgetModel.player.scars"
            label="Scars"
            type="number"
            class="input-sm"
            :disabled="isDisabled"
          />
        </div>

        <va-divider />

        <va-textarea
          v-model="widgetModel.content"
          label="Content"
          placeholder="Enter markdown here"
          autosize
          :min-rows="2"
          :max-rows="25"
          :disabled="isDisabled"
        />

        <va-textarea
          v-model="widgetModel.privateContent"
          label="Private Content"
          placeholder="This is only visible to the owner"
          autosize
          :min-rows="2"
          :max-rows="25"
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
                || !widgetModel.player.name"
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
