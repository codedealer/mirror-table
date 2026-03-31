<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}>(), {
  placeholder: 'Enter markdown here',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'dirty': [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

const resize = () => {
  const el = textareaRef.value;
  if (!el) {
    return;
  }
  el.style.height = '0';
  el.style.height = `${el.scrollHeight}px`;
};

const onInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
  emit('dirty');
  nextTick(resize);
};

watch(() => props.modelValue, () => nextTick(resize));
onMounted(() => nextTick(resize));

const wrapSelection = (before: string, after: string) => {
  const el = textareaRef.value;
  if (!el || props.disabled) {
    return;
  }

  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = el.value.substring(start, end);
  const replacement = `${before}${selected}${after}`;

  const value = el.value.substring(0, start) + replacement + el.value.substring(end);
  emit('update:modelValue', value);
  emit('dirty');

  nextTick(() => {
    el.selectionStart = start + before.length;
    el.selectionEnd = end + before.length;
    el.focus();
    resize();
  });
};

const insertLinePrefix = (prefix: string) => {
  const el = textareaRef.value;
  if (!el || props.disabled) {
    return;
  }

  const start = el.selectionStart;
  const lineStart = el.value.lastIndexOf('\n', start - 1) + 1;
  const value = el.value.substring(0, lineStart) + prefix + el.value.substring(lineStart);
  emit('update:modelValue', value);
  emit('dirty');

  nextTick(() => {
    el.selectionStart = start + prefix.length;
    el.selectionEnd = start + prefix.length;
    el.focus();
    resize();
  });
};

const onKeydown = (e: KeyboardEvent) => {
  const mod = e.ctrlKey || e.metaKey;

  if (mod && !e.shiftKey && e.key === 'b') {
    e.preventDefault();
    wrapSelection('**', '**');
  } else if (mod && !e.shiftKey && e.key === 'i') {
    e.preventDefault();
    wrapSelection('*', '*');
  } else if (mod && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
    e.preventDefault();
    wrapSelection('~~', '~~');
  } else if (mod && !e.shiftKey && e.key === 'e') {
    e.preventDefault();
    wrapSelection('`', '`');
  } else if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    wrapSelection('  ', '');
  }
};

defineExpose({ textareaRef });
</script>

<template>
  <div class="markdown-editor">
    <label v-if="label" class="markdown-editor__label">{{ label }}</label>
    <div class="markdown-editor__toolbar">
      <button type="button" title="Bold (Ctrl+B)" :disabled="disabled" @click="wrapSelection('**', '**')">
        <va-icon name="format_bold" size="small" />
      </button>
      <button type="button" title="Italic (Ctrl+I)" :disabled="disabled" @click="wrapSelection('*', '*')">
        <va-icon name="format_italic" size="small" />
      </button>
      <button type="button" title="Strikethrough (Ctrl+Shift+X)" :disabled="disabled" @click="wrapSelection('~~', '~~')">
        <va-icon name="strikethrough_s" size="small" />
      </button>
      <button type="button" title="Code (Ctrl+E)" :disabled="disabled" @click="wrapSelection('`', '`')">
        <va-icon name="code" size="small" />
      </button>
      <span class="markdown-editor__toolbar-separator" />
      <button type="button" title="Heading" :disabled="disabled" @click="insertLinePrefix('## ')">
        <va-icon name="title" size="small" />
      </button>
      <button type="button" title="Bullet list" :disabled="disabled" @click="insertLinePrefix('- ')">
        <va-icon name="format_list_bulleted" size="small" />
      </button>
      <button type="button" title="Numbered list" :disabled="disabled" @click="insertLinePrefix('1. ')">
        <va-icon name="format_list_numbered" size="small" />
      </button>
      <button type="button" title="Blockquote" :disabled="disabled" @click="insertLinePrefix('> ')">
        <va-icon name="format_quote" size="small" />
      </button>
    </div>
    <va-scroll-container vertical class="markdown-editor__scroll">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="markdown-editor__textarea"
        @input="onInput"
        @keydown="onKeydown"
      />
    </va-scroll-container>
  </div>
</template>

<style scoped lang="scss">
.markdown-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.markdown-editor__label {
  font-size: 0.75rem;
  color: var(--va-input-wrapper-label-color, var(--va-secondary));
  margin-bottom: 0.25rem;
}

.markdown-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--va-background-border);
  border-bottom: none;
  border-radius: var(--va-form-element-border-radius, 4px) var(--va-form-element-border-radius, 4px) 0 0;
  background-color: var(--va-background-secondary);

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--va-text-primary);
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover:not(:disabled) {
      background-color: var(--va-background-element);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.markdown-editor__toolbar-separator {
  width: 1px;
  align-self: stretch;
  margin: 2px 4px;
  background-color: var(--va-background-border);
}

.markdown-editor__scroll {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--va-background-border);
  border-radius: 0 0 var(--va-form-element-border-radius, 4px) var(--va-form-element-border-radius, 4px);

  &:focus-within {
    border-color: var(--va-primary);
  }
}

.markdown-editor__textarea {
  --min-editor-height: 150px;
  min-height: var(--min-editor-height);
  width: 100%;
  padding: 0.5rem;
  border: none;
  background-color: var(--va-background-element);
  color: var(--va-text-primary);
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  overflow: hidden;
  box-sizing: border-box;

  &::placeholder {
    color: var(--va-input-wrapper-placeholder-color, var(--va-secondary));
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
