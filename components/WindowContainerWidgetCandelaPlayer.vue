<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { collection, doc } from '@firebase/firestore';
import { useFirestore } from '@vueuse/firebase/useFirestore';
import { ModalWindowStatus, WidgetTemplates } from '~/models/types';
import type {
  DriveWidget,
  ModalWindow,
  WidgetCandelaPlayer, WidgetProperties,
} from '~/models/types';

const props = defineProps<{
  window: ModalWindow
  file?: DriveWidget
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
  props.window.status === ModalWindowStatus.LOADING ||
  props.file?.loading ||
  (!!props.file?.appProperties.firestoreId && widget.value === undefined)
));

const {
  imageFileId,
  file: imageFile,
  isLoading: imageLoading,
  error: imageError,
} = usePreviewImage(toRef(() => widgetModel.value?.player?.avatar), {
  strategy: DataRetrievalStrategies.RECENT,
});

const isImageDirty = () => {
  return !((!imageFileId.value && !widget.value?.player?.avatar) ||
    (imageFileId.value === widget.value?.player?.avatar?.id));
};

const checkDirty = () => {
  if (isLoading.value || imageLoading.value) {
    return;
  }

  if (!widget.value) {
    // technically new but set to dirty, so it can be saved
    windowStore.setWindowStatus(props.window, ModalWindowStatus.DIRTY);
    return;
  }

  if (
    !isObjectEquals(
      widgetModel.value,
      widget.value,
      (value, original, key) => key === 'avatar' ? !isImageDirty() : value === original,
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

const onImageUpdate = (fileId?: string) => {
  imageFileId.value = fileId ?? '';
  checkDirty();
};

const updateAvatar = (payload: WidgetModel) => {
  if (imageFile.value) {
    payload.player.avatar = PreviewPropertiesFactory({
      id: imageFile.value.id,
      nativeWidth: imageFile.value.imageMediaMetadata.width,
      nativeHeight: imageFile.value.imageMediaMetadata.height,
    });
  } else {
    payload.player.avatar = null;
  }
};

const create = async (file: DriveWidget) => {
  const payload: WidgetCandelaPlayer = {
    id: '', // will be filled on creation
    owner: '', // will be filled on creation
    fileId: file.id,
    enabled: false,
    template: WidgetTemplates.CANDELA_PLAYER,
    rank: Date.now(),
    ...structuredClone(toRaw(widgetModel.value)),
  };

  updateAvatar(payload);

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

const update = async (_: DriveWidget) => {
  // TODO: update the image in the file properties as well
  const payload = structuredClone(toRaw(widgetModel.value));

  updateAvatar(payload);

  const updated = await widgetStore.updateWidget<WidgetCandelaPlayer>(widget.value!.id, payload);

  if (!updated) {
    throw new Error('Failed to update widget');
  }
};

const submit = async () => {
  if (
    !props.file ||
    isLoading.value ||
    imageLoading.value ||
    !widgetModel.value.player.name
  ) {
    return;
  }

  checkDirty();
  if (props.window.status === ModalWindowStatus.SYNCED) {
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
  <div class="window-container-candela-player__content">
    <va-inner-loading :loading="isLoading">
      <va-form
        tag="form"
        class="vertical-form window-form"
        @submit.prevent="submit"
      >
        <div class="horizontal-form">
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

          <div class="vertical-form">
            <va-input
              v-model="widgetModel.player.name"
              label="Name"
              min-length="1"
              :disabled="isLoading"
              required
            />

            <va-input
              v-model="widgetModel.player.role"
              label="Role"
              :disabled="isLoading"
            />

            <va-input
              v-model="widgetModel.player.speciality"
              label="Speciality"
              :disabled="isLoading"
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
            :disabled="isLoading"
          />

          <va-input
            v-model.number="widgetModel.player.marks.mind"
            label="Mind"
            type="number"
            class="input-sm"
            :disabled="isLoading"
          />

          <va-input
            v-model.number="widgetModel.player.marks.bleed"
            label="Bleed"
            type="number"
            class="input-sm"
            :disabled="isLoading"
          />

          <va-input
            v-model.number="widgetModel.player.scars"
            label="Scars"
            type="number"
            class="input-sm"
            :disabled="isLoading"
          />
        </div>

        <va-divider />

        <va-textarea
          v-model="widgetModel.content"
          label="Content"
          required
          placeholder="Enter markdown here"
          autosize
          :min-rows="2"
          :max-rows="25"
          :disabled="isLoading"
        />

        <va-textarea
          v-model="widgetModel.privateContent"
          label="Private Content"
          placeholder="This is only visible to the owner"
          autosize
          :min-rows="2"
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
