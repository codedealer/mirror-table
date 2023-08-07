import type { PickerViewTemplate } from '~/models/types';

const notImplementedTemplate = (_: google.picker.PickerBuilder) => {
  throw new Error('Not implemented');
};

const imageTemplate = (builder: google.picker.PickerBuilder) => {
  return builder.addView(new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false),
  );
};

const TemplateMap: Record<
  PickerViewTemplate, (builder: google.picker.PickerBuilder) => google.picker.PickerBuilder
> = {
  all: notImplementedTemplate,
  images: imageTemplate,
  media: notImplementedTemplate,
};

export const usePickerViewTemplate = (builder: google.picker.PickerBuilder, template: PickerViewTemplate) => {
  return TemplateMap[template](builder);
};
