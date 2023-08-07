import type { PickerViewTemplate } from '~/models/types';
import PickerBuilder = google.picker.PickerBuilder;
import ViewId = google.picker.ViewId;
import DocsView = google.picker.DocsView;

const notImplementedTemplate = (_: PickerBuilder) => {
  throw new Error('Not implemented');
};

const imageTemplate = (builder: google.picker.PickerBuilder) => {
  return builder.addView(new DocsView(ViewId.DOCS_IMAGES)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false),
  );
};

const TemplateMap: Record<
  PickerViewTemplate, (builder: PickerBuilder) => PickerBuilder
> = {
  all: notImplementedTemplate,
  images: imageTemplate,
  media: notImplementedTemplate,
};

export const usePickerViewTemplate = (builder: PickerBuilder, template: PickerViewTemplate) => {
  return TemplateMap[template](builder);
};
