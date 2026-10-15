import type { Dimensions, Photo } from './types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_SIDE = 1600;

export class PhotoError extends Error {}

/** Charge, redimensionne et compresse une image pour un stockage léger. */
export async function fileToPhoto(file: File): Promise<Photo> {
  if (!file.type.startsWith('image/')) {
    throw new PhotoError(`« ${file.name} » n'est pas une image. Formats acceptés : JPG, PNG, WebP, HEIC.`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new PhotoError(`« ${file.name} » dépasse 25 Mo. Choisis une image plus légère.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new PhotoError(`Impossible de lire « ${file.name} ». Essaie avec un fichier JPG ou PNG.`));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PhotoError('Ton navigateur ne permet pas de traiter cette image.');
    ctx.drawImage(img, 0, 0, width, height);
    return {
      id: uid(),
      dataUrl: canvas.toDataURL('image/jpeg', 0.86),
      name: file.name,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Transforme un nom de fichier en nom de matériel lisible, ou '' s'il n'apporte rien. */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').trim();
  if (!base || /^(img|dsc[nf]?|pxl|photo|image|screenshot|capture|whatsapp)(?:[\s\d]|$)/i.test(base) || /^\d+[\s\d]*$/.test(base)) {
    return '';
  }
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function formatLength(cm: number): string {
  if (cm >= 100) {
    const m = cm / 100;
    return `${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, '').replace('.', ',')} m`;
  }
  return `${String(cm).replace('.', ',')} cm`;
}

export function hasDims(d: Dimensions): boolean {
  return Boolean(d.width || d.depth || d.height);
}

export function formatDims(d: Dimensions): string {
  const parts: string[] = [];
  if (d.width) parts.push(`largeur ${formatLength(d.width)}`);
  if (d.depth) parts.push(`profondeur ${formatLength(d.depth)}`);
  if (d.height) parts.push(`hauteur ${formatLength(d.height)}`);
  return parts.join(', ');
}

export function formatDimsShort(d: Dimensions): string {
  const v = [d.width, d.depth, d.height];
  if (!v.some(Boolean)) return '';
  return v.map((x) => (x ? String(x) : '—')).join(' × ') + ' cm';
}

export function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Hier';
  if (d < 7) return `Il y a ${d} jours`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli pour les contextes où l'API Clipboard est indisponible.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

export function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'projet'
  );
}
