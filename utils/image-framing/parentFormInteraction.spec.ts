import type { Ref } from 'vue';
import type { CropProperties, DriveFile, DriveWidget, ModalWindow, PreviewProperties } from '~/models/types';
// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneVNode, computed, defineComponent, h, nextTick, onBeforeUnmount, reactive, ref, shallowReactive, shallowRef, toRaw, toRef, watch, watchEffect } from 'vue';
import EditableDriveThumbnail from '~/components/EditableDriveThumbnail.vue';
import WindowContainerWidgetCandelaPlayer from '~/components/WindowContainerWidgetCandelaPlayer.vue';
import WindowContainerWidgetMarkdown from '~/components/WindowContainerWidgetMarkdown.vue';
import WindowContainerWidgetNimbleGroup from '~/components/WindowContainerWidgetNimbleGroup.vue';
import WindowContainerWidgetNimbleGroupActor from '~/components/WindowContainerWidgetNimbleGroupActor.vue';
import { useDriveFile } from '~/composables/useDriveFile';
import { usePreviewImage } from '~/composables/usePreviewImage';
import { WidgetNimbleGroupActorPlayerFactory, WidgetNimbleGroupFactory } from '~/models/NimbleGroup';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';
import { AssetPropertiesKinds, DataRetrievalStrategies, isObject, ModalWindowStatus, TableModes, WidgetTemplates } from '~/models/types';
import { buildNimbleActorAvatar } from '~/utils/image-framing/nimbleActorForm';
import isObjectEquals from '~/utils/isObjectEquals';

const mocks = vi.hoisted(() => ({
  firestore: { value: null as unknown },
  firestoreCall: vi.fn(),
  uploadCropMedia: vi.fn(),
}));
vi.mock('@vueuse/firebase/useFirestore', () => ({
  useFirestore: (...args: unknown[]) => {
    mocks.firestoreCall(...args);
    return mocks.firestore.value;
  },
}));
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => ({ collectionArgs: args }),
  doc: (...args: unknown[]) => ({ docArgs: args, withConverter: (converter: unknown) => ({ docArgs: args, converter }) }),
}));
vi.mock('~/utils/driveOps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/driveOps')>();
  return { ...actual, uploadCropMedia: (...args: unknown[]) => mocks.uploadCropMedia(...args) };
});

const files = new Map<string, DriveFile>();
const pendingFileLoads = new Map<string, Promise<{ file?: DriveFile; error: unknown }>>();
const driveFileStore = {
  getFile: vi.fn(async (id: string, strategy?: string) => pendingFileLoads.get(`${id}:${strategy}`) ?? pendingFileLoads.get(id) ?? { file: files.get(id), error: null }),
  downloadMedia: vi.fn(),
  removeFile: vi.fn(),
  saveFile: vi.fn(),
};
const notifications = { error: vi.fn() };
const widgetStore = {
  addNimbleActor: vi.fn(),
  updateNimbleActor: vi.fn(),
  removeNimbleActor: vi.fn(),
  toggleNimbleActor: vi.fn(),
  reorderNimbleActors: vi.fn(),
  updateWidget: vi.fn(),
  createWidget: vi.fn(),
};
const windowStore = { setWindowStatus: vi.fn() };
let activeWidget: ReturnType<typeof ref<any>>;

function imageFile(id: string, width: number, height: number): DriveFile {
  return {
    id,
    name: `${id}.png`,
    mimeType: 'image/png',
    imageMediaMetadata: { width, height },
  } as DriveFile;
}

const DriveThumbnailStub = defineComponent({
  name: 'DriveThumbnail',
  props: { file: Object, error: String, fileIsLoading: Boolean },
  emits: ['upload', 'remove'],
  setup(props, { emit }) {
    return () => h('div', {
      'data-testid': 'drive-thumbnail',
      'data-displayed-id': (props.file as DriveFile | undefined)?.id ?? '',
      'data-loading': String(props.fileIsLoading),
    }, [
      h('button', { 'type': 'button', 'data-testid': 'stage-image', 'onClick': () => emit('upload', 'staged-image') }, 'Stage image'),
      h('button', { 'type': 'button', 'data-testid': 'remove-image', 'onClick': () => emit('remove') }, 'Remove image'),
    ]);
  },
});
const VaButtonStub = defineComponent({
  name: 'VaButton',
  inheritAttrs: false,
  props: { disabled: Boolean, type: String },
  setup(props, { attrs, slots }) {
    return () => h('button', { ...attrs, type: props.type ?? 'button', disabled: props.disabled }, slots.default?.());
  },
});
const VaPopoverStub = defineComponent({
  name: 'VaPopover',
  props: { message: String, ariaLabel: String, role: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-tooltip': props.message }, slots.default?.().map(child => cloneVNode(child, {
      'aria-label': props.ariaLabel,
      'role': props.role,
    })));
  },
});
const VaFormStub = defineComponent({
  name: 'VaForm',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('form', attrs, slots.default?.());
  },
});
const VaInputStub = defineComponent({
  name: 'VaInput',
  inheritAttrs: false,
  props: { modelValue: [String, Number], label: String, type: String },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('label', [props.label, h('input', {
      ...attrs,
      'type': props.type ?? 'text',
      'aria-label': props.label,
      'value': props.modelValue,
      'onInput': (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
    })]);
  },
});
const VaSelectStub = defineComponent({
  name: 'VaSelect',
  inheritAttrs: false,
  props: { modelValue: String, label: String, options: Array },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('label', [props.label, h('select', {
      ...attrs,
      'aria-label': props.label,
      'value': props.modelValue,
      'onChange': (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value),
    })]);
  },
});
const VaTextareaStub = defineComponent({
  name: 'VaTextarea',
  inheritAttrs: false,
  props: { modelValue: String, label: String },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('label', [props.label, h('textarea', {
      ...attrs,
      'aria-label': props.label,
      'value': props.modelValue,
      'onInput': (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
    })]);
  },
});
const VaModalStub = defineComponent({
  name: 'VaModal',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    return () => h('div', { 'data-testid': 'actor-modal', 'data-open': String(props.modelValue) }, [
      ...(props.modelValue ? slots.default?.() ?? [] : []),
      h('button', { 'type': 'button', 'data-testid': 'dismiss-modal', 'onClick': () => emit('update:modelValue', false) }, 'Dismiss'),
    ]);
  },
});
const PassthroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.());
  },
});
const MarkdownEditorStub = defineComponent({
  props: { modelValue: String, label: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('textarea', {
      'aria-label': props.label,
      'value': props.modelValue,
      'onInput': (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
    });
  },
});
const componentStubs = {
  DriveThumbnail: DriveThumbnailStub,
  VaButton: VaButtonStub,
  VaPopover: VaPopoverStub,
  VaForm: VaFormStub,
  VaInput: VaInputStub,
  VaSelect: VaSelectStub,
  VaTextarea: VaTextareaStub,
  VaModal: VaModalStub,
  VaInnerLoading: PassthroughStub,
  VaList: PassthroughStub,
  VaListItem: PassthroughStub,
  VaListItemSection: PassthroughStub,
  VaListItemLabel: PassthroughStub,
  VaDivider: PassthroughStub,
  MarkdownEditor: MarkdownEditorStub,
  WindowContainerWidgetNimbleGroupActor,
};

function driveHook(idRef: Ref<string>) {
  const file = ref<DriveFile>();
  const error = ref<unknown>(null);
  const isLoading = ref(false);
  watch(idRef, async (id) => {
    file.value = undefined;
    error.value = null;
    isLoading.value = !!id;
    if (!id)
      return;
    const result = await driveFileStore.getFile(id);
    file.value = result.file;
    error.value = result.error;
    isLoading.value = false;
  }, { immediate: true, flush: 'sync' });
  return { file, error, isLoading: computed(() => isLoading.value) };
}

function installNuxtGlobals() {
  Object.assign(globalThis, {
    computed,
    onBeforeUnmount,
    reactive,
    ref,
    shallowReactive,
    shallowRef,
    toRaw,
    toRef,
    watch,
    watchEffect,
    usePreviewImage,
    PreviewPropertiesFactory,
    useUserStore: () => ({ user: { uid: 'user-id' }, profile: { settings: { driveFolderId: 'drive-folder' } } }),
    useDriveFileStore: () => driveFileStore,
    useDriveFile: driveHook,
    usePicker: () => ({ buildPicker: vi.fn() }),
    useWidgetStore: () => widgetStore,
    useWindowStore: () => windowStore,
    useTableStore: () => ({ mode: TableModes.OWN }),
    useNotificationStore: () => notifications,
    useNuxtApp: () => ({ $db: {} }),
    firestoreDataConverter: (value: unknown) => value,
    extractErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
    DataRetrievalStrategies,
    AssetPropertiesKinds,
    TableModes,
    WidgetTemplates,
    ModalWindowStatus,
    isObject,
    isObjectEquals,
  });
}

function mountOptions(extra = {}) {
  return {
    global: { components: componentStubs, stubs: { ImageFramingEditor: true } },
    ...extra,
  };
}

function fileFixture(id = 'widget-file') {
  return {
    id,
    name: `${id}.json`,
    parents: ['drive-folder'],
    appProperties: { firestoreId: 'widget-id' },
    loading: false,
    trashed: false,
  } as unknown as DriveWidget;
}
function windowFixture() {
  return { status: ModalWindowStatus.SYNCED, content: { data: null } } as ModalWindow;
}
function preview(id: string, width = 400, height = 300): PreviewProperties {
  return PreviewPropertiesFactory({ id, nativeWidth: width, nativeHeight: height });
}

beforeEach(() => {
  files.clear();
  pendingFileLoads.clear();
  files.set('saved-image', imageFile('saved-image', 800, 600));
  files.set('staged-image', imageFile('staged-image', 1200, 900));
  driveFileStore.getFile.mockClear();
  driveFileStore.downloadMedia.mockClear();
  mocks.uploadCropMedia.mockReset();
  driveFileStore.removeFile.mockClear();
  notifications.error.mockReset();
  windowStore.setWindowStatus.mockReset();
  windowStore.setWindowStatus.mockImplementation((window: ModalWindow, status: ModalWindow['status']) => {
    window.status = status;
  });
  Object.values(widgetStore).forEach((operation) => {
    if (typeof operation === 'function')
      operation.mockReset();
  });
  installNuxtGlobals();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('real editable-thumbnail parent interactions', () => {
  it('shows thumbnail loading after a crop Apply until the staged crop metadata resolves', async () => {
    const checksum = 'f3cf72fc0f0659f121e3fb02f0bc6504';
    const frame = { x: 0, y: 0, w: 1_000_000, h: 1_000_000 };
    const original = {
      ...imageFile('saved-image', 1200, 900),
      md5Checksum: checksum,
      capabilities: { canDownload: true },
      size: '3',
    } as DriveFile;
    files.set('saved-image', original);
    driveFileStore.downloadMedia.mockResolvedValue({ id: 'saved-image', md5Checksum: checksum, mimeType: 'image/png', data: 'png' } as any);
    const pendingMetadata = deferred<{ file?: DriveFile; error: unknown }>();
    pendingFileLoads.set('review-crop:lazy', pendingMetadata.promise);
    mocks.uploadCropMedia.mockImplementationOnce(async (_image: File, _folder: string, crop: CropProperties) => {
      files.set('review-crop', {
        ...imageFile('review-crop', 512, 512),
        md5Checksum: 'b'.repeat(32),
        properties: { mtc: '1' },
        cropProvenance: { status: 'usable', properties: crop },
      } as DriveFile);
      return { id: 'review-crop' };
    });
    const editorStub = defineComponent({
      props: { source: Blob, initialFrame: Object, ratio: Number },
      emits: ['cancel', 'apply'],
      setup(_, { emit }) {
        return () => h('button', {
          'type': 'button',
          'data-testid': 'apply-crop',
          'onClick': () => emit('apply', new Blob(['crop'], { type: 'image/png' }), frame),
        }, 'Apply crop');
      },
    });
    const wrapper = mount(EditableDriveThumbnail, {
      global: { components: { ...componentStubs, ImageFramingEditor: editorStub } },
      props: { selectedId: 'saved-image', committedId: 'saved-image', width: 96, height: 96 },
    });
    await flushPromises();
    await wrapper.get('[aria-label="Edit image"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="apply-crop"]').exists()).toBe(true);

    await wrapper.get('[data-testid="apply-crop"]').trigger('click');
    await flushPromises();
    expect(wrapper.vm.stagedId).toBe('review-crop');
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-loading')).toBe('true');
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('');

    pendingMetadata.resolve({ file: files.get('review-crop'), error: null });
    await flushPromises();
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-loading')).toBe('false');
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('review-crop');
    wrapper.unmount();
  });

  it('keeps initially distinct selection staged, applies parent selected updates, and synchronizes authoritative committed updates and resets', async () => {
    const wrapper = mount(EditableDriveThumbnail, mountOptions({
      props: { selectedId: 'staged-image', committedId: 'saved-image', width: 96, height: 96 },
    }));
    await flushPromises();

    expect(wrapper.vm.stagedId).toBe('staged-image');
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('staged-image');
    expect(wrapper.props('committedId')).toBe('saved-image');

    // Cancel/reset is the public observation of the session's committed value;
    // the input prop alone cannot prove that the session retained it.
    wrapper.vm.cancelParent();
    expect(wrapper.vm.stagedId).toBe('saved-image');

    await wrapper.setProps({ selectedId: 'new-parent-draft' });
    expect(wrapper.vm.stagedId).toBe('new-parent-draft');
    expect(wrapper.props('committedId')).toBe('saved-image');
    wrapper.vm.cancelParent();
    expect(wrapper.vm.stagedId).toBe('saved-image');

    await wrapper.setProps({ selectedId: 'new-parent-draft' });
    await wrapper.setProps({ committedId: 'authoritative-commit' });
    expect(wrapper.vm.stagedId).toBe('authoritative-commit');
    expect(wrapper.emitted('select')).toContainEqual(['authoritative-commit']);

    await wrapper.setProps({ selectedId: 'later-draft' });
    expect(wrapper.vm.stagedId).toBe('later-draft');
    wrapper.vm.cancelParent();
    expect(wrapper.vm.stagedId).toBe('authoritative-commit');

    await wrapper.setProps({ selectedId: '', committedId: '' });
    expect(wrapper.vm.stagedId).toBe('');
    wrapper.vm.cancelParent();
    expect(wrapper.vm.stagedId).toBe('');
  });
});

it('persists the session callback ID and matching metadata when the parent model still has another ID', async () => {
  const wrapper = mount(EditableDriveThumbnail, mountOptions({
    props: { selectedId: 'saved-image', committedId: 'saved-image', width: 96, height: 96 },
  }));
  await flushPromises();
  const parentModelId = wrapper.props('selectedId');

  await wrapper.get('[data-testid="stage-image"]').trigger('click');
  await flushPromises();
  expect(wrapper.vm.stagedId).toBe('staged-image');
  expect(wrapper.props('selectedId')).toBe(parentModelId);

  let persisted: { id: string; avatar: PreviewProperties | null } | undefined;
  const saved = await wrapper.vm.saveParent(async (callbackId: string) => {
    persisted = {
      id: callbackId,
      avatar: buildNimbleActorAvatar(callbackId, files.get(callbackId), preview('saved-image')),
    };
  });

  expect(saved).toBe(true);
  expect(persisted).toEqual({
    id: 'staged-image',
    avatar: preview('staged-image', 1200, 900),
  });
  expect(wrapper.vm.stagedId).toBe('staged-image');
  wrapper.vm.cancelParent();
  expect(wrapper.vm.stagedId).toBe('staged-image');
});

describe.each([
  { form: 'Markdown', create: (widget: any) => ({ ...widget, content: 'body', privateContent: '', avatar: preview('saved-image') }) },
  { form: 'Candela', create: (widget: any) => ({ ...widget, content: '', privateContent: '', player: { name: 'Player', role: '', speciality: '', avatar: preview('saved-image'), marks: { body: 0, mind: 0, bleed: 0 }, scars: 0 } }) },
])('$form parent reset synchronization', ({ form, create }) => {
  it('clears staged selection for an empty reset and restores a non-empty committed reset', async () => {
    activeWidget = ref(create({ id: 'widget-id', owner: 'user-id', fileId: 'widget-file', enabled: false, template: form === 'Markdown' ? WidgetTemplates.MARKDOWN : WidgetTemplates.CANDELA_PLAYER, rank: 0 }));
    mocks.firestore.value = activeWidget;
    const props = { window: windowFixture(), file: fileFixture() };
    const wrapper = mount(form === 'Markdown' ? WindowContainerWidgetMarkdown : WindowContainerWidgetCandelaPlayer, mountOptions({ props }));
    await flushPromises();
    const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
    expect(thumbnail.vm.stagedId).toBe('saved-image');
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('saved-image');

    await wrapper.get('[data-testid="stage-image"]').trigger('click');
    await flushPromises();
    expect(thumbnail.vm.stagedId).toBe('staged-image');

    if (form === 'Markdown') {
      activeWidget.value.avatar = null;
    } else {
      activeWidget.value.player.avatar = null;
    }
    await nextTick();
    await flushPromises();
    expect(thumbnail.vm.stagedId).toBe('');
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('');

    if (form === 'Markdown') {
      activeWidget.value.avatar = preview('saved-image');
    } else {
      activeWidget.value.player.avatar = preview('saved-image');
    }
    await nextTick();
    await flushPromises();
    expect(thumbnail.vm.stagedId).toBe('saved-image');
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('saved-image');
  });

  it('saves non-image edits with the stored image properties when its Drive metadata is unavailable', async () => {
    files.delete('saved-image');
    pendingFileLoads.set('saved-image', Promise.resolve({ file: undefined, error: new Error('Image metadata unavailable') }));
    activeWidget = ref(create({ id: 'widget-id', owner: 'user-id', fileId: 'widget-file', enabled: false, template: form === 'Markdown' ? WidgetTemplates.MARKDOWN : WidgetTemplates.CANDELA_PLAYER, rank: 0 }));
    mocks.firestore.value = activeWidget;
    const savedPayloads: any[] = [];
    const window = windowFixture();
    widgetStore.updateWidget.mockImplementation(async (_id: string, payload: any) => {
      savedPayloads.push(structuredClone(payload));
      return true;
    });
    const wrapper = mount(form === 'Markdown' ? WindowContainerWidgetMarkdown : WindowContainerWidgetCandelaPlayer, mountOptions({
      props: { window, file: fileFixture() },
    }));
    await flushPromises();

    if (form === 'Markdown') {
      await wrapper.get('[aria-label="Content"]').setValue('Updated content');
    } else {
      await wrapper.get('[aria-label="Name"]').setValue('Updated player');
    }
    await new Promise(resolve => setTimeout(resolve, 1100));
    await flushPromises();
    expect(window.status).toBe(ModalWindowStatus.DIRTY);

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(widgetStore.updateWidget).toHaveBeenCalledTimes(1);
    const savedAvatar = form === 'Markdown' ? savedPayloads[0].avatar : savedPayloads[0].player.avatar;
    expect(savedAvatar).toEqual(preview('saved-image'));
    if (form === 'Markdown') {
      expect(savedPayloads[0].content).toBe('Updated content');
    } else {
      expect(savedPayloads[0].player.name).toBe('Updated player');
    }
  });

  it('rejects a newly selected image when its metadata is unavailable', async () => {
    files.delete('staged-image');
    pendingFileLoads.set('staged-image', Promise.resolve({ file: undefined, error: new Error('Image metadata unavailable') }));
    activeWidget = ref(create({ id: 'widget-id', owner: 'user-id', fileId: 'widget-file', enabled: false, template: form === 'Markdown' ? WidgetTemplates.MARKDOWN : WidgetTemplates.CANDELA_PLAYER, rank: 0 }));
    mocks.firestore.value = activeWidget;
    const window = windowFixture();
    const wrapper = mount(form === 'Markdown' ? WindowContainerWidgetMarkdown : WindowContainerWidgetCandelaPlayer, mountOptions({
      props: { window, file: fileFixture() },
    }));
    await flushPromises();

    await wrapper.get('[data-testid="stage-image"]').trigger('click');
    await flushPromises();
    if (form === 'Markdown') {
      await wrapper.get('[aria-label="Content"]').setValue('Updated content');
    } else {
      await wrapper.get('[aria-label="Name"]').setValue('Updated player');
    }
    await new Promise(resolve => setTimeout(resolve, 1100));
    await flushPromises();
    expect(window.status).toBe(ModalWindowStatus.DIRTY);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(widgetStore.updateWidget).not.toHaveBeenCalled();
    expect(notifications.error).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
    const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
    expect(thumbnail.vm.stagedId).toBe('staged-image');
    expect(thumbnail.props('committedId')).toBe('saved-image');
  });

  it.each([
    { timing: 'after B loads', failure: 'returned' },
    { timing: 'after B loads', failure: 'thrown' },
    { timing: 'while B loads', failure: 'returned' },
    { timing: 'while B loads', failure: 'thrown' },
  ])('ignores a stale A $failure failure $timing and saves B with its dimensions', async ({ timing, failure }) => {
    activeWidget = ref(create({ id: 'widget-id', owner: 'user-id', fileId: 'widget-file', enabled: false, template: form === 'Markdown' ? WidgetTemplates.MARKDOWN : WidgetTemplates.CANDELA_PLAYER, rank: 0 }));
    mocks.firestore.value = activeWidget;
    const oldRequest = deferred<{ file?: DriveFile; error: unknown }>();
    const currentRequest = deferred<{ file?: DriveFile; error: unknown }>();
    const registry = ref<Record<string, DriveFile>>({});
    const ready = ref(true);
    const imageB = imageFile('race-b', 1234, 567);
    const realHookStore = {
      ...driveFileStore,
      files: registry,
      getFile: vi.fn(async (id: string) => {
        const result = id === 'race-a'
          ? await oldRequest.promise
          : id === 'race-b'
            ? await currentRequest.promise
            : { file: files.get(id), error: null };
        if (result.file)
          registry.value[id] = result.file;
        return result;
      }),
    };
    Object.assign(globalThis, {
      useDriveFile,
      useDriveStore: () => ({ isReady: ready }),
      useDriveFileStore: () => realHookStore,
      storeToRefs: (store: { isReady?: Ref<boolean>; files?: Ref<Record<string, DriveFile>> }) => store,
    });
    const savedPayloads: any[] = [];
    widgetStore.updateWidget.mockImplementation(async (_id: string, payload: any) => {
      savedPayloads.push(structuredClone(payload));
      return true;
    });
    const window = windowFixture();
    const wrapper = mount(form === 'Markdown' ? WindowContainerWidgetMarkdown : WindowContainerWidgetCandelaPlayer, mountOptions({
      props: { window, file: fileFixture() },
    }));
    await flushPromises();
    const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
    const display = wrapper.getComponent(DriveThumbnailStub);
    display.vm.$emit('upload', 'race-a');
    await nextTick();
    display.vm.$emit('upload', 'race-b');
    await nextTick();
    expect(thumbnail.vm.stagedId).toBe('race-b');
    expect(realHookStore.getFile).toHaveBeenCalledWith('race-a', DataRetrievalStrategies.RECENT);
    expect(realHookStore.getFile).toHaveBeenCalledWith('race-b', DataRetrievalStrategies.RECENT);

    if (timing === 'after B loads') {
      currentRequest.resolve({ file: imageB, error: null });
      await flushPromises();
      expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('race-b');
    }
    if (failure === 'returned')
      oldRequest.resolve({ error: new Error('Old image unavailable') });
    else
      oldRequest.reject(new Error('Old request threw'));
    await flushPromises();

    if (timing === 'while B loads') {
      // Dirty status alone must not allow a stale A error to make B ready.
      window.status = ModalWindowStatus.DIRTY;
      await nextTick();
      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
      await wrapper.get('form').trigger('submit');
      expect(widgetStore.updateWidget).not.toHaveBeenCalled();
      currentRequest.resolve({ file: imageB, error: null });
      await flushPromises();
    }
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(widgetStore.updateWidget).toHaveBeenCalledOnce();
    const avatar = form === 'Markdown' ? savedPayloads[0].avatar : savedPayloads[0].player.avatar;
    expect(avatar).toMatchObject({ id: 'race-b', nativeWidth: 1234, nativeHeight: 567 });
    expect(thumbnail.emitted('committed')).toContainEqual(['race-b']);
    expect(notifications.error).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each([
    { action: 'replace', stagedId: 'staged-image', button: 'stage-image' },
    { action: 'remove', stagedId: '', button: 'remove-image' },
  ])('marks an existing image $action dirty and saves the staged ID', async ({ button, stagedId }) => {
    activeWidget = ref(create({ id: 'widget-id', owner: 'user-id', fileId: 'widget-file', enabled: false, template: form === 'Markdown' ? WidgetTemplates.MARKDOWN : WidgetTemplates.CANDELA_PLAYER, rank: 0 }));
    mocks.firestore.value = activeWidget;
    const stagedMetadata = button === 'stage-image' ? deferred<{ file?: DriveFile; error: unknown }>() : undefined;
    if (stagedMetadata)
      pendingFileLoads.set('staged-image', stagedMetadata.promise);
    const savedPayloads: any[] = [];
    widgetStore.updateWidget.mockImplementation(async (_id: string, payload: any) => {
      savedPayloads.push(structuredClone(payload));
      return true;
    });
    const window = windowFixture();
    const wrapper = mount(form === 'Markdown' ? WindowContainerWidgetMarkdown : WindowContainerWidgetCandelaPlayer, mountOptions({
      props: { window, file: fileFixture() },
    }));
    await flushPromises();

    await wrapper.get(`[data-testid="${button}"]`).trigger('click');
    await flushPromises();
    const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
    expect(thumbnail.vm.stagedId).toBe(stagedId);
    const saveButton = wrapper.get('button[type="submit"]');
    if (stagedMetadata) {
      expect(saveButton.attributes('disabled')).toBeDefined();
      expect(window.status).toBe(ModalWindowStatus.SYNCED);
      stagedMetadata.resolve({ file: files.get('staged-image'), error: null });
      await flushPromises();
    }
    expect(window.status).toBe(ModalWindowStatus.DIRTY);
    expect(saveButton.attributes('disabled')).toBeUndefined();

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(widgetStore.updateWidget).toHaveBeenCalledTimes(1);
    if (form === 'Markdown') {
      expect(savedPayloads[0].avatar?.id ?? null).toBe(stagedId || null);
    } else {
      expect(savedPayloads[0].player.avatar?.id ?? null).toBe(stagedId || null);
    }
  });
});

describe.each([
  { operation: 'add', actorId: undefined },
  { operation: 'update', actorId: 'existing-actor' },
])('nimble parent form $operation persistence', ({ operation, actorId }) => {
  it.each([false, true])('keeps staged state and editor lifecycle for store result %s', async (persisted) => {
    const existing = WidgetNimbleGroupActorPlayerFactory('existing-actor');
    existing.name = 'Existing actor';
    existing.avatar = preview('saved-image');
    activeWidget = ref({
      ...WidgetNimbleGroupFactory('widget-file'),
      id: 'widget-id',
      owner: 'user-id',
      actors: actorId ? [existing] : [],
    });
    mocks.firestore.value = activeWidget;

    const delayed = deferred<boolean>();
    const pendingMetadata = deferred<{ file?: DriveFile; error: unknown }>();
    pendingFileLoads.set('staged-image', pendingMetadata.promise);
    const result = persisted ? Promise.resolve(true) : delayed.promise;
    const savedActors: Array<{ id?: string; avatar?: PreviewProperties | null }> = [];
    widgetStore.addNimbleActor.mockImplementation(async (_widgetId: string, actor: any) => {
      savedActors.push(actor);
      if (persisted)
        activeWidget.value.actors.push(actor);
      return result;
    });
    widgetStore.updateNimbleActor.mockImplementation(async (_widgetId: string, _actorId: string, actor: any) => {
      savedActors.push(actor);
      if (persisted) {
        const index = activeWidget.value.actors.findIndex((item: any) => item.id === actorId);
        activeWidget.value.actors[index] = actor;
      }
      return result;
    });

    const wrapper = mount(WindowContainerWidgetNimbleGroup, mountOptions({ props: { window: windowFixture(), file: fileFixture() } }));
    await flushPromises();
    if (actorId)
      await wrapper.get('[aria-label="Edit Existing actor"]').trigger('click');
    else
      await wrapper.get('button.mb').trigger('click');
    await flushPromises();

    await wrapper.get('[aria-label="Name"]').setValue('Updated actor');
    await wrapper.get('[data-testid="stage-image"]').trigger('click');
    await flushPromises();
    const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
    expect(thumbnail.vm.stagedId).toBe('staged-image');

    const modal = wrapper.get('[data-testid="actor-modal"]');
    expect(modal.attributes('data-open')).toBe('true');
    const submitButton = wrapper.getComponent(WindowContainerWidgetNimbleGroupActor).findAll('button').find(button => button.text() === (actorId ? 'Update entry' : 'Add entry'))!;
    expect(submitButton.attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(operation === 'add' ? widgetStore.addNimbleActor : widgetStore.updateNimbleActor).not.toHaveBeenCalled();

    pendingMetadata.resolve({ file: files.get('staged-image'), error: null });
    await flushPromises();
    expect(submitButton.attributes('disabled')).toBeUndefined();
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('staged-image');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const calledStore = operation === 'add' ? widgetStore.addNimbleActor : widgetStore.updateNimbleActor;
    expect(calledStore).toHaveBeenCalledTimes(1);
    expect(calledStore.mock.calls[0][0]).toBe('widget-id');
    expect(savedActors[0]?.avatar).toMatchObject({ id: 'staged-image', nativeWidth: 1200, nativeHeight: 900 });
    if (actorId)
      expect(widgetStore.updateNimbleActor.mock.calls[0][1]).toBe(actorId);

    if (!persisted) {
      const actorForm = wrapper.getComponent(WindowContainerWidgetNimbleGroupActor);
      const cancel = actorForm.findAll('button').find(button => button.text() === 'Cancel');
      expect(cancel).toBeDefined();
      expect(cancel!.attributes('disabled')).toBeDefined();
      await wrapper.get('[data-testid="dismiss-modal"]').trigger('click');
      expect(wrapper.get('[data-testid="actor-modal"]').attributes('data-open')).toBe('true');

      delayed.resolve(false);
      await flushPromises();
      expect(wrapper.get('[data-testid="actor-modal"]').attributes('data-open')).toBe('true');
      const stillOpenThumbnail = wrapper.getComponent(EditableDriveThumbnail);
      expect(stillOpenThumbnail.vm.stagedId).toBe('staged-image');
      expect(stillOpenThumbnail.props('committedId')).toBe(actorId ? 'saved-image' : '');
      expect(stillOpenThumbnail.emitted('committed')).toBeUndefined();
      // A public cancel/reset after rejection must restore the prior commit,
      // proving the staged image was not accidentally committed by the session.
      stillOpenThumbnail.vm.cancelParent();
      expect(stillOpenThumbnail.vm.stagedId).toBe(actorId ? 'saved-image' : '');
      expect(notifications.error).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
    } else {
      await flushPromises();
      expect(wrapper.get('[data-testid="actor-modal"]').attributes('data-open')).toBe('false');
      expect(savedActors[0]?.avatar?.id).toBe('staged-image');
    }
  });
});

it.each(['stage', 'remove'] as const)('restores persisted Nimble avatar dimensions after %s and reset when metadata lookup fails', async (action) => {
  const existing = WidgetNimbleGroupActorPlayerFactory('existing-actor');
  existing.name = 'Existing actor';
  existing.avatar = preview('saved-image', 432, 321);
  activeWidget = ref({
    ...WidgetNimbleGroupFactory('widget-file'),
    id: 'widget-id',
    owner: 'user-id',
    actors: [existing],
  });
  mocks.firestore.value = activeWidget;
  widgetStore.updateNimbleActor.mockResolvedValue(true);

  const wrapper = mount(WindowContainerWidgetNimbleGroupActor, mountOptions({
    props: { widgetId: 'widget-id', actorId: 'existing-actor', canEdit: true },
  }));
  await flushPromises();
  await wrapper.get('[aria-label="Name"]').setValue('Updated actor');
  await wrapper.get(`[data-testid="${action === 'stage' ? 'stage-image' : 'remove-image'}"]`).trigger('click');
  await flushPromises();
  const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
  expect(thumbnail.vm.stagedId).toBe(action === 'stage' ? 'staged-image' : '');
  if (action === 'stage')
    expect(wrapper.get('[data-testid="drive-thumbnail"]').attributes('data-displayed-id')).toBe('staged-image');

  pendingFileLoads.set('saved-image', Promise.resolve({ file: undefined, error: new Error('Image metadata unavailable') }));
  driveFileStore.getFile.mockClear();
  thumbnail.vm.cancelParent();
  await flushPromises();
  expect(thumbnail.vm.stagedId).toBe('saved-image');
  expect(thumbnail.props('selectedId')).toBe('saved-image');
  expect(driveFileStore.getFile).toHaveBeenCalledWith('saved-image');

  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(widgetStore.updateNimbleActor).toHaveBeenCalledOnce();
  expect(widgetStore.updateNimbleActor).toHaveBeenCalledWith('widget-id', 'existing-actor', expect.objectContaining({
    name: 'Updated actor',
    avatar: expect.objectContaining({ id: 'saved-image', nativeWidth: 432, nativeHeight: 321 }),
  }));
  expect(thumbnail.emitted('committed')).toContainEqual(['saved-image']);
  expect(wrapper.emitted('close')).toEqual([[]]);
  expect(notifications.error).not.toHaveBeenCalled();
});

it('does not use the persisted Nimble avatar for a different selected ID with unavailable metadata', async () => {
  const existing = WidgetNimbleGroupActorPlayerFactory('existing-actor');
  existing.name = 'Existing actor';
  existing.avatar = preview('saved-image', 432, 321);
  activeWidget = ref({
    ...WidgetNimbleGroupFactory('widget-file'),
    id: 'widget-id',
    owner: 'user-id',
    actors: [existing],
  });
  mocks.firestore.value = activeWidget;
  pendingFileLoads.set('staged-image', Promise.resolve({ file: undefined, error: new Error('Image metadata unavailable') }));

  const wrapper = mount(WindowContainerWidgetNimbleGroupActor, mountOptions({
    props: { widgetId: 'widget-id', actorId: 'existing-actor', canEdit: true },
  }));
  await flushPromises();
  await wrapper.get('[data-testid="stage-image"]').trigger('click');
  await flushPromises();
  const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
  expect(thumbnail.vm.stagedId).toBe('staged-image');

  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(widgetStore.updateNimbleActor).not.toHaveBeenCalled();
  expect(thumbnail.emitted('committed')).toBeUndefined();
  expect(thumbnail.vm.stagedId).toBe('staged-image');
  expect(wrapper.emitted('close')).toBeUndefined();
  expect(notifications.error).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
});

it('persists the thumbnail callback ID in the production Nimble form and commits it before the editor closes', async () => {
  activeWidget = ref({
    ...WidgetNimbleGroupFactory('widget-file'),
    id: 'widget-id',
    owner: 'user-id',
    actors: [],
  });
  mocks.firestore.value = activeWidget;

  let storedActor: any;
  widgetStore.addNimbleActor.mockImplementation(async (_widgetId: string, actor: any) => {
    storedActor = actor;
    return true;
  });

  const wrapper = mount(WindowContainerWidgetNimbleGroupActor, mountOptions({ props: { widgetId: 'widget-id', canEdit: true } }));
  await flushPromises();
  await wrapper.get('[aria-label="Name"]').setValue('Production parent save');
  await wrapper.get('[data-testid="stage-image"]').trigger('click');
  await flushPromises();

  const thumbnail = wrapper.getComponent(EditableDriveThumbnail);
  expect(thumbnail.vm.stagedId).toBe('staged-image');

  // When the real form starts persistence, model the parent changing its own
  // selected value while the session's already-captured save ID remains fixed.
  const stopSelectionChange = watch(() => thumbnail.vm.pending, (pending) => {
    if (pending)
      thumbnail.vm.$emit('select', 'parent-model-image');
  }, { flush: 'sync' });
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  stopSelectionChange();

  expect(widgetStore.addNimbleActor).toHaveBeenCalledTimes(1);
  expect(thumbnail.props('selectedId')).toBe('parent-model-image');
  expect(storedActor).toMatchObject({
    avatar: { id: 'staged-image', nativeWidth: 1200, nativeHeight: 900 },
  });
  expect(thumbnail.emitted('committed')).toContainEqual(['staged-image']);
  expect(wrapper.emitted('close')).toEqual([[]]);

  // The committed event and reset both expose the persisted session value
  // before the parent reacts to close by unmounting this production editor.
  thumbnail.vm.cancelParent();
  expect(thumbnail.vm.stagedId).toBe('staged-image');
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
