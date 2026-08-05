import { EMPTY_PHOTO_FACES, type PhotoFaces } from '../domain/photoFaces';
import { PHOTO_DATA_URL_PREFIX } from '../photos/photoFile';
import { readJson, writeJson } from './localStore';

/**
 * Clé distincte des autres préférences : les photos sont de loin l'entrée la
 * plus lourde, et un quota dépassé ne doit pas emporter le reste des réglages.
 */
const STORAGE_KEY = 'dice-roller.photo-faces';

export function loadPhotoFaces(): PhotoFaces {
  const stored = readJson(STORAGE_KEY);
  if (!Array.isArray(stored)) return EMPTY_PHOTO_FACES;
  return EMPTY_PHOTO_FACES.map((_, index) => parsePhoto(stored[index]));
}

export function savePhotoFaces(faces: PhotoFaces): void {
  writeJson(STORAGE_KEY, faces);
}

function parsePhoto(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith(PHOTO_DATA_URL_PREFIX) ? value : null;
}
