import type { BuildPickerOptions, PickerViewTemplate } from '~/models/types';

const notImplementedTemplate = (_: google.picker.PickerBuilder) => {
  throw new Error('Not implemented');
};

const imageTemplate = (
  builder: google.picker.PickerBuilder,
  options: Required<BuildPickerOptions>,
) => {
  return builder.addView(new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false)
    .setParent(options.parentId),
  );
};

const allTemplate = (
  builder: google.picker.PickerBuilder,
  options: Required<BuildPickerOptions>,
) => {
  return builder.addView(new google.picker.DocsView(google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setParent(options.parentId),
  );
};

const TemplateMap: Record<
  PickerViewTemplate, (
    builder: google.picker.PickerBuilder,
    options: Required<BuildPickerOptions>
  ) => google.picker.PickerBuilder
> = {
  all: allTemplate,
  images: imageTemplate,
  media: notImplementedTemplate,
};

export const usePickerViewTemplate = (builder: google.picker.PickerBuilder, options: Required<BuildPickerOptions>) => {
  return TemplateMap[options.template](builder, options);
};
