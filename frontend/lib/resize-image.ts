'use client';

/**
 * Downscale an image File to a data URL whose longest edge is <= `max`, encoded
 * as JPEG. Runs in the browser on a canvas — no server dependency (sharp etc.).
 *
 * The size is a deliberate balance: large enough that small poster text (prices,
 * promo codes, fine print) stays legible for the vision OCR pass, small enough
 * that the upload and the model's image-token budget stay reasonable.
 */
export async function fileToResizedDataUrl(file: File, max = 1400, quality = 0.92): Promise<string> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(1, max / longest);

  // Already small enough and not an oversized file → keep as-is.
  if (scale === 1 && file.size < 1_200_000) return original;

  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('Lecture du fichier impossible'));
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}
