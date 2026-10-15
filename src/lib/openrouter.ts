/**
 * Client OpenRouter pour générer le visuel à partir du prompt.
 * Appel direct depuis le navigateur : OpenRouter autorise les requêtes CORS.
 */
import type { ImageFormat, ImageResolution } from './types';

const API = 'https://openrouter.ai/api/v1';

export const IMAGE_MODELS: { id: string; label: string; maxRefs: number }[] = [
  { id: 'google/gemini-3.1-flash-image', label: 'Nano Banana 2 (recommandé)', maxRefs: 14 },
  { id: 'google/gemini-nano-banana-2.1', label: 'Nano Banana 2.1', maxRefs: 14 },
  { id: 'google/gemini-3-pro-image', label: 'Nano Banana Pro', maxRefs: 14 },
];

export const RESOLUTION_LABELS: Record<ImageResolution, string> = {
  '1K': '1K · plus rapide',
  '2K': '2K · recommandé',
  '4K': '4K · haute définition',
};

export const modelLabel = (id: string) => IMAGE_MODELS.find((m) => m.id === id)?.label.replace(' (recommandé)', '') ?? id;

export class GenerationError extends Error {}

function headers(key: string) {
  return {
    Authorization: `Bearer ${key.trim()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Regie',
  };
}

async function readError(res: Response): Promise<GenerationError> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message ?? '';
  } catch {
    /* corps illisible : on garde le message générique */
  }
  const messages: Record<number, string> = {
    401: 'Clé OpenRouter refusée. Vérifie-la dans Paramètres.',
    402: 'Crédits OpenRouter insuffisants. Recharge ton compte sur openrouter.ai.',
    403: 'Demande refusée par le modèle. Reformule la description ou change les images.',
    404: "Ce modèle n'est plus disponible. Choisis-en un autre dans Paramètres.",
    413: 'Les images envoyées sont trop lourdes. Retire une image ou utilise des photos plus légères.',
    429: 'Trop de demandes à la suite. Réessaie dans quelques instants.',
  };
  const base =
    messages[res.status] ??
    (res.status >= 500 ? 'Le service de génération est surchargé. Réessaie dans une minute.' : `La génération a échoué (erreur ${res.status}).`);
  return new GenerationError(detail && res.status !== 401 ? `${base} Détail : ${detail}` : base);
}

export interface KeyInfo {
  label: string;
  remaining: number | null;
}

/** Vérifie la clé et renvoie le crédit restant quand il est plafonné. */
export async function checkKey(key: string): Promise<KeyInfo> {
  let res: Response;
  try {
    res = await fetch(`${API}/key`, { headers: headers(key) });
  } catch {
    throw new GenerationError('Connexion impossible à OpenRouter. Vérifie ta connexion internet.');
  }
  if (!res.ok) throw await readError(res);
  const { data } = await res.json();
  const remaining = typeof data?.limit_remaining === 'number' ? data.limit_remaining : null;
  return { label: data?.label ?? 'Clé OpenRouter', remaining };
}

export interface GenerateParams {
  key: string;
  model: string;
  prompt: string;
  references: string[];
  format: ImageFormat;
  resolution: ImageResolution;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  dataUrl: string;
  cost?: number;
}

export async function generateImage(p: GenerateParams): Promise<GeneratedImage> {
  const body: Record<string, unknown> = {
    model: p.model,
    prompt: p.prompt,
    aspect_ratio: p.format,
    resolution: p.resolution,
  };
  if (p.references.length) {
    body.input_references = p.references.map((url) => ({ type: 'image_url', image_url: { url } }));
  }

  let res: Response;
  try {
    res = await fetch(`${API}/images`, { method: 'POST', headers: headers(p.key), body: JSON.stringify(body), signal: p.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new GenerationError('Connexion impossible à OpenRouter. Vérifie ta connexion internet.');
  }
  if (!res.ok) throw await readError(res);

  const json = await res.json();
  const img = json?.data?.[0];
  if (!img?.b64_json) {
    throw new GenerationError("Le modèle n'a renvoyé aucune image. Réessaie ou simplifie la demande.");
  }
  return {
    dataUrl: `data:${img.media_type ?? 'image/png'};base64,${img.b64_json}`,
    cost: typeof json?.usage?.cost === 'number' ? json.usage.cost : undefined,
  };
}
