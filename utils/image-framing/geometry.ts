import type { CropRectangle } from '~/models/types';
import { isCropRectangle } from '~/models/CropRectangle';

export type Frame = CropRectangle;

export function validFrame(frame: Frame) {
  return isCropRectangle(frame);
}

/** Test the aspect ratio with the same outward millionth quantisation used by makeFrame. */
export function frameMatchesRatio(frame: Frame, width: number, height: number, ratio: number) {
  if (!validFrame(frame) || !Number.isFinite(width) || !Number.isFinite(height)
    || width <= 0 || height <= 0 || !Number.isFinite(ratio) || ratio < 1 / 512 || ratio > 512) {
    return false;
  }
  // Each independently rounded dimension can exceed its ideal size by less
  // than one millionth of the corresponding source dimension.
  const difference = frame.w * width - ratio * frame.h * height;
  return difference <= width && difference >= -ratio * height;
}

/** A cover crop in source pixels, then quantised to orientation-corrected millionths. */
export function makeFrame(width: number, height: number, ratio: number, zoom: number, centerX: number, centerY: number): Frame {
  const baseWidth = Math.min(width, height * ratio);
  const baseHeight = baseWidth / ratio;
  // Round outward so quantisation never removes source pixels at the zoom limit.
  const w = Math.max(1, Math.min(1_000_000, Math.ceil(baseWidth / zoom / width * 1_000_000)));
  const h = Math.max(1, Math.min(1_000_000, Math.ceil(baseHeight / zoom / height * 1_000_000)));
  const x = Math.max(0, Math.min(1_000_000 - w, Math.round(centerX * 1_000_000 - w / 2)));
  const y = Math.max(0, Math.min(1_000_000 - h, Math.round(centerY * 1_000_000 - h / 2)));
  return { x, y, w, h };
}

export function maxZoom(width: number, height: number, ratio: number) {
  const target = targetSize(ratio);
  const baseWidth = Math.min(width, height * ratio);
  const baseHeight = baseWidth / ratio;
  // A null limit means even the initial cover crop cannot supply the target.
  const limit = Math.min(8, baseWidth / target.width, baseHeight / target.height);
  return limit < 1 ? null : limit;
}

export function outputSize(width: number, height: number, frame: Frame, ratio: number) {
  const target = targetSize(ratio);
  const availableWidth = width * frame.w / 1_000_000;
  const availableHeight = height * frame.h / 1_000_000;
  return availableWidth >= target.width && availableHeight >= target.height ? target : null;
}

/** Integer output dimensions with a longest side of 512 pixels. */
export function targetSize(ratio: number) {
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio < 1 / 512 || ratio > 512)
    throw new Error('Unsupported frame ratio.');
  return ratio >= 1
    ? { width: 512, height: Math.max(1, Math.round(512 / ratio)) }
    : { width: Math.max(1, Math.round(512 * ratio)), height: 512 };
}
