import type { DriveFile, PreviewProperties, WidgetNimbleGroupActor } from '~/models/types';
import { PreviewPropertiesFactory } from '~/models/PreviewProprerties';

/** Resolve metadata only from the image ID the crop session is persisting. */
export function buildNimbleActorAvatar(
  imageId: string,
  imageFile: DriveFile | undefined,
  previousAvatar: PreviewProperties | null,
): PreviewProperties | null {
  if (!imageId)
    return null;

  const metadata = imageFile?.id === imageId ? imageFile.imageMediaMetadata : undefined;
  if (metadata?.width && metadata.height) {
    return PreviewPropertiesFactory({
      id: imageId,
      nativeWidth: metadata.width,
      nativeHeight: metadata.height,
    });
  }
  if (previousAvatar?.id === imageId)
    return previousAvatar;

  throw new Error('Image details are unavailable for the selected image.');
}

/**
 * Run the actor-form save through the thumbnail's parent-persistence seam.
 * A store's false result is intentionally converted to a rejected persistence
 * attempt, so the crop session cannot commit and the editor cannot close.
 */
export async function saveNimbleActorForm(options: {
  saveParent: (persist: (imageId: string) => Promise<void>) => Promise<boolean>;
  buildActor: (imageId: string) => WidgetNimbleGroupActor;
  getWidgetId: () => string | undefined;
  actorId?: string;
  store: {
    addNimbleActor: (widgetId: string, actor: WidgetNimbleGroupActor) => Promise<boolean>;
    updateNimbleActor: (widgetId: string, actorId: string, actor: Partial<WidgetNimbleGroupActor>) => Promise<boolean>;
  };
  close: () => void;
}): Promise<boolean> {
  const saved = await options.saveParent(async (imageId) => {
    const widgetId = options.getWidgetId();
    if (!widgetId)
      throw new Error('The widget is not available.');
    const actor = options.buildActor(imageId);
    const persisted = options.actorId
      ? await options.store.updateNimbleActor(widgetId, options.actorId, actor)
      : await options.store.addNimbleActor(widgetId, actor);
    if (!persisted)
      throw new Error('The actor store did not confirm persistence.');
  });

  if (saved)
    options.close();
  return saved;
}
