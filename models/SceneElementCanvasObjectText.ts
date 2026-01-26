import type Konva from 'konva';
import type { SceneElementCanvasObjectText } from '~/models/types';
import type { IdPlaceholder, WithIdPlaceholders } from '~/utils/replaceIdPlaceholder';

export const SceneElementCanvasObjectTextFactory = (
  id: string | IdPlaceholder,
  textConfig: Konva.TextConfig,
  dimensions: { width: number; height: number },
  position: { x: number; y: number },
  ownerId: string,
) => {
  const element: WithIdPlaceholders<SceneElementCanvasObjectText> = {
    _type: 'canvas-object',
    id,
    type: 'text',
    text: {
      ...textConfig,
      text: textConfig.text ?? '<Enter text>',
      fontSize: textConfig.fontSize ?? 20,
      fontFamily: textConfig.fontFamily ?? 'Arial',
      fill: textConfig.fill ?? '#000000',
      align: textConfig.align ?? 'center',
      backgroundColor: textConfig.backgroundColor ?? 'rgba(255, 255, 255, 0.8)',
    },
    container: {
      id,
      name: 'element-container' as const,
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    enabled: false,
    selectionGroup: SelectionGroups.HIDDEN,
    defaultRank: Date.now(),
    owner: ownerId,
  };

  return element;
};
