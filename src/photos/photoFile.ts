/**
 * Une photo de téléphone pèse plusieurs mégaoctets pour une face de dé qui fera
 * quelques centaines de pixels : chaque image est recadrée au carré et réduite
 * avant d'être gardée. Cela borne la mémoire GPU en 3D et rend le stockage local
 * possible. Le rendu d'un `<img>` applique l'orientation EXIF, que `drawImage`
 * reprend : la photo ne sort pas couchée.
 */
/**
 * 256 px suffit largement : un dé mesure au plus ~120 px à l'écran, soit 240 px
 * sur un écran retina. Chaque dé porte son propre jeu de textures en 3D, donc la
 * taille se paie dix fois avec dix dés — d'où la retenue.
 */
const PHOTO_FACE_SIZE = 256;
const PHOTO_QUALITY = 0.82;

export const PHOTO_DATA_URL_PREFIX = 'data:image/';

export async function toSquarePhoto(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_FACE_SIZE;
    canvas.height = PHOTO_FACE_SIZE;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D indisponible');

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      PHOTO_FACE_SIZE,
      PHOTO_FACE_SIZE,
    );
    return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image illisible'));
    image.src = url;
  });
}
