import { FACE_COUNT } from './dice';

/** Une entrée par face, dans l'ordre des valeurs : `null` retombe sur les points. */
export type PhotoFaces = readonly (string | null)[];

export const EMPTY_PHOTO_FACES: PhotoFaces = Array.from({ length: FACE_COUNT }, () => null);

export const PHOTO_FACE_VALUES: readonly number[] = Array.from(
  { length: FACE_COUNT },
  (_, index) => index + 1,
);

export function photoFaceFor(faces: PhotoFaces, value: number): string | null {
  return faces[value - 1] ?? null;
}

export function setPhotoFace(faces: PhotoFaces, value: number, photo: string | null): PhotoFaces {
  return faces.map((current, index) => (index === value - 1 ? photo : current));
}

/** Un import multiple complète les faces encore vides, dans l'ordre. */
export function fillEmptyPhotoFaces(faces: PhotoFaces, photos: readonly string[]): PhotoFaces {
  const queue = [...photos];
  return faces.map(current => (current === null ? (queue.shift() ?? null) : current));
}

export function photoFaceCount(faces: PhotoFaces): number {
  return faces.filter(photo => photo !== null).length;
}
