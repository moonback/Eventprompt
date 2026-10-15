/**
 * Moteur de génération : transforme une description libre en prompt structuré
 * pour ChatGPT Images. Toute la complexité vit ici, jamais dans l'interface.
 */
import type { ImageFormat, Item, Moment, Perspective, Photo, Project } from './types';
import { formatDims, hasDims } from './utils';

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/** Minuscules sans accents, de même longueur que le texte NFC d'origine. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'");
}

export function normalizeLabel(s: string): string {
  return norm(s.normalize('NFC')).replace(/[^a-z0-9]+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Catalogues                                                          */
/* ------------------------------------------------------------------ */

interface CatalogEntry {
  key: string;
  label: string;
  pattern: string;
}

// L'ordre compte : les entrées précises passent avant les génériques.
const EQUIPMENT: CatalogEntry[] = [
  { key: 'ecran-led', label: 'Écran LED', pattern: "ecrans? (?:geants? )?led|murs? (?:d'|de )?(?:images|led)|led wall|ecrans? geants?" },
  { key: 'ecran', label: 'Écran de projection', pattern: 'ecrans?(?: de projection)?|videoprojecteurs?|projecteurs? video' },
  { key: 'mange-debout', label: 'Mange-debout', pattern: 'mange[- ]debouts?|tables? hautes?' },
  { key: 'tables-rondes', label: 'Tables rondes', pattern: 'tables? rondes?|tables? de banquet|tables? de reception' },
  { key: 'piste', label: 'Piste de danse', pattern: 'pistes? de danse|dance ?floor' },
  { key: 'regie-dj', label: 'Cabine DJ', pattern: 'cabines? dj|booth dj|regies? dj|platines?|dj' },
  { key: 'scene', label: 'Scène', pattern: 'scenes?|podiums?|estrades?' },
  { key: 'enceintes', label: 'Enceintes', pattern: 'enceintes?|baffles?|line arrays?|haut[- ]parleurs?|sonorisation' },
  { key: 'lumieres', label: 'Projecteurs et lyres', pattern: 'lyres?|projecteurs?|spots?|poursuites?|par led|barres? led|eclairages? sceniques?' },
  { key: 'truss', label: 'Structure truss', pattern: 'truss|structures? (?:alu|aluminium|metalliques?)|portiques?' },
  { key: 'photocall', label: 'Photocall', pattern: 'photocalls?|photobooths?|bornes? photos?|murs? photos?' },
  { key: 'arche', label: 'Arche', pattern: 'arches?(?: florales?)?' },
  { key: 'pupitre', label: 'Pupitre', pattern: 'pupitres?|lutrins?' },
  { key: 'bar', label: 'Bar', pattern: 'bars?|comptoirs?' },
  { key: 'buffet', label: 'Buffet', pattern: 'buffets?' },
  { key: 'lounge', label: 'Espace lounge', pattern: 'espaces? lounge|lounges?|canapes?|poufs?|chesterfields?' },
  { key: 'chaises', label: 'Chaises', pattern: 'chaises?|fauteuils?|sieges?' },
  { key: 'fleurs', label: 'Compositions florales', pattern: 'compositions? florales?|centres? de table|bouquets?' },
  { key: 'tentures', label: 'Tentures', pattern: 'tentures?|rideaux?|draperies?|voilages?|velums?' },
  { key: 'guirlandes', label: 'Guirlandes lumineuses', pattern: 'guirlandes?(?: lumineuses?)?|guinguettes?' },
  { key: 'signaletique', label: 'Signalétique', pattern: 'totems?|kakemonos?|roll[- ]?ups?|oriflammes?|signaletique' },
  { key: 'tapis', label: 'Tapis', pattern: 'tapis rouge|tapis|moquettes?' },
  { key: 'stand', label: 'Stand', pattern: 'stands?' },
  { key: 'ballons', label: 'Ballons', pattern: 'ballons?' },
  { key: 'fumee', label: 'Effet fumée', pattern: 'machines? a fumee|fumee lourde|brouillard' },
  { key: 'tables', label: 'Tables', pattern: 'tables?' },
];

const POSITION =
  /\b(?:tout autour|autour|au fond|en fond|au centre|au milieu|centre(?:e|es|s)?|sur les cotes|sur le cote|de chaque cote|des deux cotes|de part et d'autre|a gauche|a droite|a l'entree|pres de|proche de|a cote|devant|derriere|au[- ]dessus|suspendu(?:e|es|s)?|au plafond|le long|contre|en face|sur (?:la )?scene|dans l'angle|dans (?:un|les) coins?|en arriere[- ]plan|au premier plan|en hauteur|au sol|a l'exterieur|en bordure|face a|aligne(?:e|es|s)?|disperse(?:e|es|s)?|reparti(?:e|es|s)?)\b/g;

const NUMBERS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8,
  neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30,
};

const EVENTS: [string, string][] = [
  ["gala d'entreprise|soiree de gala", "Gala d'entreprise"],
  ['diner de gala|gala', 'Gala'],
  ['mariage|reception de mariage', 'Mariage'],
  ['seminaire', 'Séminaire'],
  ['convention', 'Convention'],
  ['conference|keynote|pleniere', 'Conférence'],
  ['lancement(?: de produit)?', 'Lancement de produit'],
  ['salon professionnel|salon', 'Salon professionnel'],
  ['remise de prix|ceremonie de remise|awards|trophees', 'Remise de prix'],
  ['assemblee generale', 'Assemblée générale'],
  ['team building', 'Team building'],
  ['anniversaire', 'Anniversaire'],
  ['concert', 'Concert'],
  ['festival', 'Festival'],
  ['defile', 'Défilé'],
  ['vernissage|exposition', 'Exposition'],
  ['cocktail|afterwork', 'Cocktail'],
  ['bapteme', 'Baptême'],
  ["soiree d'entreprise|soiree", 'Soirée'],
  ['diner|dejeuner', 'Repas'],
];

interface Mood {
  key: string;
  label: string;
  pattern: string;
  light: string;
}

const MOODS: Mood[] = [
  {
    key: 'chic',
    label: 'chic et raffinée',
    pattern: 'chic|elegant(?:e|es|s)?|elegance|luxe|luxueu(?:x|se)|prestig(?:e|ieux|ieuse)|raffine(?:e)?|haut de gamme|glamour|gala',
    light: "lumière chaude et tamisée (2700–3000 K), éclairage d'architecture ambré, faisceaux fins et maîtrisés, reflets dorés discrets",
  },
  {
    key: 'festif',
    label: 'festive et énergique',
    pattern: 'festi(?:f|ve|vite)|dansant(?:e)?|fete|club|energique|dynamique|clubbing|party',
    light: 'éclairage scénique dynamique, faisceaux colorés de lyres, légère brume pour révéler les faisceaux, contrastes marqués',
  },
  {
    key: 'corporate',
    label: 'professionnelle et sobre',
    pattern: 'corporate|professionnel(?:le)?|sobre|institutionnel(?:le)?|seminaire|conference|convention|assemblee|pleniere',
    light: 'éclairage homogène et neutre (environ 4000 K), scène nettement éclairée de face, ambiance sobre et lisible',
  },
  {
    key: 'romantique',
    label: 'douce et romantique',
    pattern: 'romantique|mariage|intime|feutre(?:e)?|cosy|chaleureu(?:x|se)',
    light: 'lumière chaude et douce (2700 K), bougies, guirlandes lumineuses, halos dorés',
  },
  {
    key: 'nature',
    label: 'naturelle et champêtre',
    pattern: 'nature(?:l|lle)?|champetre|boheme|vegetal(?:e)?|jardin|exterieur|guinguette',
    light: 'lumière naturelle douce, tons chauds, matières naturelles (bois, lin, verdure)',
  },
  {
    key: 'futuriste',
    label: 'moderne et technologique',
    pattern: 'futuriste|tech|technologique|innovation|innovant(?:e)?|digital(?:e)?|high[- ]tech|immersi(?:f|ve)',
    light: 'teintes froides bleu et violet, LED linéaires, contrastes nets, surfaces réfléchissantes',
  },
];

const DEFAULT_MOOD_BY_EVENT: Record<string, string> = {
  "Gala d'entreprise": 'chic',
  Gala: 'chic',
  Mariage: 'romantique',
  Séminaire: 'corporate',
  Convention: 'corporate',
  Conférence: 'corporate',
  'Assemblée générale': 'corporate',
  'Lancement de produit': 'futuriste',
  'Salon professionnel': 'corporate',
  Concert: 'festif',
  Festival: 'festif',
  Soirée: 'festif',
  Anniversaire: 'festif',
};

const COLORS: [string, string][] = [
  ['bleu(?:e|es|s)?|bleu nuit|marine', 'bleu'],
  ['violet(?:te|tes|s)?|mauve|lavande', 'violet'],
  ['rouge(?:s)?|bordeaux', 'rouge'],
  ['dore(?:e|es|s)?|or et|cuivre(?:e)?', 'doré'],
  ['argente(?:e|es|s)?|argent', 'argenté'],
  ['blanc(?:he|hes|s)?', 'blanc'],
  ['noir(?:e|es|s)?', 'noir'],
  ['rose(?:s)?|fuchsia', 'rose'],
  ['vert(?:e|es|s)?|emeraude', 'vert'],
  ['orange(?:s)?', 'orange'],
  ['jaune(?:s)?', 'jaune'],
  ['turquoise', 'turquoise'],
];

/* ------------------------------------------------------------------ */
/* Analyse de la description                                           */
/* ------------------------------------------------------------------ */

export interface DetectedItem {
  key: string;
  label: string;
  quantity: number | null;
  placement: string;
}

export interface Analysis {
  eventLabel: string | null;
  items: DetectedItem[];
  mood: Mood;
  moodFromUser: boolean;
  colors: string[];
  moment: 'jour' | 'soiree';
  momentFromText: boolean;
  wantsKeepArchitecture: boolean;
}

function clauses(n: string): [number, number][] {
  const sep = /[.;!?\n,:()]|\s(?:et|puis|ainsi que|avec)\s(?=(?:des|un|une|le|la|les|l'|deux|trois|quatre|cinq|six|huit|dix|douze|\d))/g;
  const out: [number, number][] = [];
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = sep.exec(n))) {
    if (m.index > start) out.push([start, m.index]);
    start = m.index + m[0].length;
  }
  if (start < n.length) out.push([start, n.length]);
  return out;
}

function cleanPlacement(s: string): string {
  const t = s.replace(/\s+/g, ' ').replace(/^[\s,;:-]+|[\s,;:.-]+$/g, '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

export function analyze(description: string, ambiance = ''): Analysis {
  const orig = description.normalize('NFC');
  const n = norm(orig);
  const amb = norm(ambiance.normalize('NFC'));
  const all = `${n} ${amb}`;

  // 1. Repérage du matériel, sans chevauchement.
  type Match = { entry: CatalogEntry; start: number; end: number; placement: string; pStart: number; pEnd: number; quantity: number | null };
  const taken: [number, number][] = [];
  const matches: Match[] = [];
  for (const entry of EQUIPMENT) {
    const re = new RegExp(`\\b(?:${entry.pattern})\\b`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(n))) {
      const s = m.index;
      const e = s + m[0].length;
      if (taken.some(([a, b]) => s < b && e > a)) continue;
      taken.push([s, e]);
      matches.push({ entry, start: s, end: e, placement: '', pStart: -1, pEnd: -1, quantity: null });
    }
  }

  // 2. Pour chaque élément : quantité et emplacement dans sa proposition.
  const cls = clauses(n);
  for (const mt of matches) {
    const [cs, ce] = cls.find(([a, b]) => mt.start >= a && mt.start < b) ?? [0, n.length];
    const before = n.slice(cs, mt.start);
    const q = before.match(/(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente)\s+(?:[a-z'-]+\s+)?$/);
    if (q) mt.quantity = /^\d+$/.test(q[1]) ? parseInt(q[1], 10) : NUMBERS[q[1]] ?? null;

    POSITION.lastIndex = 0;
    const after = n.slice(mt.end, ce);
    const pa = POSITION.exec(after);
    if (pa) {
      mt.pStart = mt.end + pa.index;
      mt.pEnd = ce;
    } else {
      POSITION.lastIndex = 0;
      const pb = POSITION.exec(before);
      if (pb) {
        mt.pStart = cs + pb.index;
        mt.pEnd = mt.start;
      }
    }
    if (mt.pStart >= 0) mt.placement = cleanPlacement(orig.slice(mt.pStart, mt.pEnd));
  }

  // 3. Un élément cité dans l'emplacement d'un autre (« autour de la piste ») est un repère, pas un ajout.
  const isReference = (mt: Match) => matches.some((o) => o !== mt && o.pStart >= 0 && mt.start >= o.pStart && mt.end <= o.pEnd);
  const seen = new Set<string>();
  const items: DetectedItem[] = [];
  for (const mt of matches.sort((a, b) => a.start - b.start)) {
    if (seen.has(mt.entry.key) || isReference(mt)) continue;
    seen.add(mt.entry.key);
    items.push({ key: mt.entry.key, label: mt.entry.label, quantity: mt.quantity, placement: mt.placement });
  }

  // 4. Type d'événement.
  let eventLabel: string | null = null;
  for (const [p, label] of EVENTS) {
    if (new RegExp(`\\b(?:${p})\\b`).test(n)) {
      eventLabel = label;
      break;
    }
  }

  // 5. Ambiance : le champ dédié prime sur la description.
  const findMood = (txt: string) => MOODS.find((m) => new RegExp(`\\b(?:${m.pattern})\\b`).test(txt));
  const userMood = amb ? findMood(amb) : undefined;
  const textMood = findMood(n);
  const fallback = MOODS.find((m) => m.key === (eventLabel ? DEFAULT_MOOD_BY_EVENT[eventLabel] : undefined));
  const mood: Mood = userMood ?? textMood ?? fallback ?? {
    key: 'neutre',
    label: 'élégante et chaleureuse',
    pattern: '',
    light: "lumière chaude et maîtrisée, mise en valeur des éléments principaux, éclairage d'ambiance discret",
  };

  const colors = COLORS.filter(([p]) => new RegExp(`\\b(?:${p})\\b`).test(all)).map(([, c]) => c);
  if (/\b(?:couleurs? de (?:la|notre) marque|charte graphique|couleurs? du client)\b/.test(all)) colors.push('couleurs de la marque du client');

  const isNight = /\b(?:soir|soiree|nuit|nocturne|diner|gala|dansant|night)\b/.test(all);
  const isDay = /\b(?:journee|matin|matinee|midi|brunch|dejeuner|jour|lumiere du jour|en plein jour)\b/.test(all);

  return {
    eventLabel,
    items,
    mood,
    moodFromUser: Boolean(userMood || textMood),
    colors: [...new Set(colors)],
    moment: isDay && !isNight ? 'jour' : isNight ? 'soiree' : 'soiree',
    momentFromText: isDay || isNight,
    wantsKeepArchitecture: /\b(?:conserv|gard|respect|preserv|maintien)\w*\b.{0,40}\b(?:architecture|lieu|salle|structure|murs|decor)\b|\bsans (?:modifier|toucher|changer)\b/.test(n),
  };
}

/** Éléments détectés dans la description qui ne figurent pas encore dans le projet. */
export function missingDetected(analysis: Analysis, items: Item[]): DetectedItem[] {
  const names = items.map((i) => normalizeLabel(i.name)).filter(Boolean);
  return analysis.items.filter((d) => {
    const label = normalizeLabel(d.label);
    const first = label.split(' ')[0];
    return !names.some((nm) => nm === label || nm.includes(first) || label.includes(nm));
  });
}

/** Complète un élément nommé (ex. depuis un nom de fichier) avec ce que la description dit de lui. */
export function enrichFromDescription(name: string, description: string): Pick<Item, 'placement' | 'quantity'> | null {
  if (!name.trim()) return null;
  const nm = normalizeLabel(name);
  const d = analyze(description).items.find((x) => {
    const label = normalizeLabel(x.label);
    return nm === label || nm.includes(label) || nm.startsWith(label.split(' ')[0]);
  });
  return d ? { placement: d.placement, quantity: d.quantity } : null;
}

export function suggestName(analysis: Analysis): string {
  return analysis.eventLabel ?? 'Nouveau projet';
}

/* ------------------------------------------------------------------ */
/* Construction du prompt                                              */
/* ------------------------------------------------------------------ */

export interface PromptSection {
  title: string;
  body: string;
}

export interface AttachedImage {
  index: number;
  role: 'lieu' | 'materiel' | 'inspiration';
  label: string;
  photo: Photo;
}

export interface Assumption {
  text: string;
  important: boolean;
}

export interface PromptResult {
  sections: PromptSection[];
  text: string;
  images: AttachedImage[];
  assumptions: Assumption[];
}

export const FORMAT_LABELS: Record<ImageFormat, string> = {
  '16:9': 'Paysage 16:9',
  '3:2': 'Paysage 3:2',
  '1:1': 'Carré 1:1',
  '4:5': 'Portrait 4:5',
  '9:16': 'Vertical 9:16',
};

const FORMAT_PROMPT: Record<ImageFormat, string> = {
  '16:9': 'format paysage 16:9',
  '3:2': 'format paysage 3:2',
  '1:1': 'format carré 1:1',
  '4:5': 'format portrait 4:5',
  '9:16': 'format vertical 9:16',
};

export const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  photo: 'Identique à la photo du lieu',
  fond: 'Depuis le fond de la salle',
  face: 'Face à la scène',
  hauteur: 'Vue en hauteur',
  ensemble: "Vue d'ensemble grand angle",
};

export const MOMENT_LABELS: Record<Moment, string> = {
  auto: 'Selon la description',
  jour: 'En journée',
  soiree: 'En soirée',
};

const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Quantité non précisée sur un nom au pluriel ou invariable : laissée à l'appréciation de l'IA. */
function isAdaptiveQuantity(item: Item): boolean {
  return item.quantity === null && /(?:[sx]|mange[- ]debout)$/i.test(item.name.trim());
}

function itemTitle(item: Item, idx: number): string {
  const name = item.name.trim() || `Élément ${idx + 1}`;
  return item.quantity && item.quantity > 1 ? `${name} × ${item.quantity}` : name;
}

export function buildPrompt(project: Project): PromptResult {
  const a = analyze(project.description, project.ambiance);
  const assumptions: Assumption[] = [];
  const sections: PromptSection[] = [];
  const items = project.items;
  const hasVenue = Boolean(project.venue);
  const event = a.eventLabel ? lower(a.eventLabel) : 'événement';

  // Ordre des images jointes : le lieu, puis le matériel, puis les inspirations.
  const images: AttachedImage[] = [];
  let n = 1;
  if (project.venue) images.push({ index: n++, role: 'lieu', label: 'Photo du lieu', photo: project.venue });
  const itemImage = new Map<string, number>();
  items.forEach((it, i) => {
    if (it.photo) {
      itemImage.set(it.id, n);
      images.push({ index: n++, role: 'materiel', label: it.name.trim() || `Élément ${i + 1}`, photo: it.photo });
    }
  });
  const firstInspiration = n;
  project.inspirations.forEach((p, i) =>
    images.push({ index: n++, role: 'inspiration', label: `Inspiration ${i + 1}`, photo: p }),
  );

  // OBJECTIF
  sections.push({
    title: 'Objectif',
    body: hasVenue
      ? `Crée une image photoréaliste de la scénographie d'un ${event}, réalisée à partir de la photo du lieu fournie (image 1). Le rendu doit ressembler à une vraie photographie de l'événement installé, prise sur place.`
      : `Crée une image photoréaliste de la scénographie d'un ${event} dans une salle de réception crédible. Le rendu doit ressembler à une vraie photographie de l'événement installé.`,
  });

  // DEMANDE
  if (project.description.trim()) {
    sections.push({ title: 'Demande du client', body: `« ${project.description.trim().replace(/\s+/g, ' ')} »` });
  }

  // IMAGES JOINTES
  if (images.length) {
    const lines = images.map((img) => {
      if (img.role === 'lieu') return `– Image ${img.index} : le lieu à aménager. C'est la base de l'image finale.`;
      if (img.role === 'materiel') return `– Image ${img.index} : ${img.label}, matériel réel à intégrer et à reproduire fidèlement.`;
      return `– Image ${img.index} : inspiration d'ambiance uniquement, à ne pas copier.`;
    });
    sections.push({ title: 'Images jointes', body: lines.join('\n') });
  }

  // LIEU
  if (hasVenue) {
    const keep = project.keepArchitecture;
    sections.push({
      title: keep ? 'Lieu à conserver' : 'Lieu',
      body: keep
        ? [
            "Conserve à l'identique l'architecture visible sur l'image 1 : murs, plafond, sol, colonnes, ouvertures, fenêtres, portes et éléments fixes.",
            'Garde les matériaux, les couleurs du bâti, les proportions de la salle et la position des éléments existants.',
            "N'ajoute ni ne supprime aucun élément architectural. Seul le matériel listé ci-dessous est ajouté.",
          ].join('\n')
        : [
            "Utilise l'image 1 comme base pour le volume et l'agencement de la salle.",
            "La décoration et les revêtements peuvent être adaptés à l'ambiance demandée, mais le volume, les ouvertures et les proportions restent cohérents avec la photo.",
          ].join('\n'),
    });
  } else {
    sections.push({
      title: 'Lieu',
      body: `Aucune photo du lieu n'est fournie. Imagine une salle de réception réaliste et adaptée à un ${event}, aux proportions crédibles, sans élément superflu.`,
    });
    assumptions.push({ text: "Sans photo du lieu, l'IA imaginera elle-même la salle. Ajoute une photo pour un résultat fidèle.", important: true });
  }

  // MATÉRIEL
  if (items.length) {
    const lines = items.map((it, i) => {
      const parts: string[] = [`${i + 1}. ${itemTitle(it, i)}`];
      const img = itemImage.get(it.id);
      parts.push(
        img
          ? `   Référence : image ${img}. Reproduis exactement ce modèle : forme, couleurs, matériaux et finitions. Ne le remplace pas par un modèle générique.`
          : `   Aucune photo : représente un modèle professionnel standard, sobre et réaliste.`,
      );
      if (hasDims(it.dims)) {
        parts.push(`   Dimensions réelles : ${formatDims(it.dims)}. Respecte strictement ces dimensions et l'échelle par rapport au lieu.`);
      } else {
        parts.push(
          img
            ? `   Dimensions non communiquées : déduis les proportions de l'image ${img} et garde une échelle réaliste par rapport à la salle.`
            : `   Dimensions non communiquées : garde une taille courante et réaliste pour ce type de matériel.`,
        );
      }
      if (it.quantity && it.quantity > 1) parts.push(`   Quantité : exactement ${it.quantity}.`);
      else if (isAdaptiveQuantity(it)) parts.push("   Quantité : adaptée à l'espace disponible.");
      else parts.push('   Quantité : un seul exemplaire.');
      parts.push(
        it.placement.trim()
          ? `   Emplacement : ${lower(it.placement.trim().replace(/\.$/, ''))}.`
          : "   Emplacement : le plus logique pour l'usage de cet élément.",
      );
      if (it.notes.trim()) parts.push(`   Précisions : ${it.notes.trim()}`);
      return parts.join('\n');
    });
    sections.push({ title: 'Matériel à intégrer', body: lines.join('\n\n') });

    items.forEach((it, i) => {
      const name = it.name.trim() || `l'élément ${i + 1}`;
      if (!hasDims(it.dims)) {
        assumptions.push({
          text: it.photo
            ? `${name} : dimensions inconnues. L'échelle sera déduite de sa photo, aucune taille n'est inventée.`
            : `${name} : ni photo ni dimensions. L'IA utilisera un modèle standard.`,
          important: !it.photo,
        });
      }
      if (!it.placement.trim()) {
        assumptions.push({ text: `${name} : emplacement non précisé. L'IA choisira la position la plus logique.`, important: true });
      }
      if (isAdaptiveQuantity(it)) {
        assumptions.push({ text: `${name} : quantité non précisée. Elle sera adaptée à l'espace.`, important: false });
      }
    });
  } else {
    assumptions.push({ text: "Aucun matériel n'est listé. Le prompt s'appuie uniquement sur ta description.", important: true });
  }

  // POSITIONNEMENT
  sections.push({
    title: 'Positionnement et échelle',
    body: [
      "Place chaque élément exactement à l'emplacement indiqué, posé de façon réaliste (au sol, sur la scène ou suspendu selon l'emplacement), avec des ombres de contact justes.",
      'Respecte les proportions entre les éléments et par rapport à une personne de 1,75 m.',
      'Garde des circulations dégagées et une implantation réaliste pour un événement réel (accès, sécurité, câblage discret).',
      "N'ajoute aucun autre matériel que celui demandé, en dehors du mobilier déjà présent dans le lieu.",
    ].join('\n'),
  });

  // PERSPECTIVE
  const persp: Record<Perspective, string> = {
    photo: hasVenue
      ? "Conserve exactement le point de vue, la hauteur de caméra, l'angle et la focale de l'image 1."
      : "Point de vue à hauteur d'œil (1,60 m), depuis le fond de la salle, en direction de l'espace principal.",
    fond: "Point de vue à hauteur d'œil (1,60 m), depuis le fond de la salle, orienté vers la scène ou l'espace principal.",
    face: "Point de vue frontal, centré face à la scène, à hauteur d'œil, avec une composition symétrique.",
    hauteur: "Vue légèrement plongeante, prise en hauteur (environ 4 m) depuis l'arrière de la salle, pour montrer toute l'implantation.",
    ensemble: "Vue d'ensemble au grand angle (24 mm environ), sans déformation excessive, avec les lignes verticales bien droites.",
  };
  sections.push({
    title: 'Perspective et cadrage',
    body: `${persp[project.perspective]}\nImage en ${FORMAT_PROMPT[project.format]}. Lignes verticales droites, horizon de niveau, composition équilibrée.`,
  });

  // ÉCLAIRAGE
  const moment: 'jour' | 'soiree' = project.moment === 'auto' ? a.moment : project.moment;
  const light: string[] = [`Ambiance ${a.mood.label}.`, `Éclairage : ${a.mood.light}.`];
  if (a.colors.length) light.push(`Dominantes de couleur : ${a.colors.join(', ')}.`);
  if (project.ambiance.trim()) light.push(`Ambiance souhaitée par le client : ${project.ambiance.trim().replace(/\.$/, '')}.`);
  light.push(
    moment === 'soiree'
      ? 'Moment : en soirée, lumière principalement artificielle. Les fenêtres éventuelles montrent un extérieur nocturne.'
      : 'Moment : en journée, avec la lumière naturelle des ouvertures, complétée par un éclairage scénique discret.',
  );
  light.push("L'éclairage doit rester cohérent avec les sources visibles et mettre en valeur le matériel installé.");
  sections.push({ title: 'Éclairage et ambiance', body: light.join('\n') });

  if (!a.moodFromUser && !project.ambiance.trim()) {
    assumptions.push({
      text: `Ambiance non précisée : ambiance ${a.mood.label} retenue d'après le type d'événement.`,
      important: false,
    });
  }
  if (project.moment === 'auto' && !a.momentFromText) {
    assumptions.push({ text: 'Moment non précisé : rendu en soirée, le plus courant pour un événement.', important: false });
  }

  // RENDU
  sections.push({
    title: 'Rendu photoréaliste',
    body: [
      "Photographie d'architecture événementielle professionnelle, réaliste, haute définition.",
      'Matériaux crédibles (métal, tissu, bois, surfaces LED), reflets et ombres physiquement justes, profondeur de champ naturelle.',
      "Écran LED ou de projection : contenu neutre et lumineux, sans texte lisible ni logo inventé.",
      "Salle prête à accueillir les invités, sans personnes ou avec quelques silhouettes floues uniquement si elles aident à percevoir l'échelle.",
    ].join('\n'),
  });

  // INSPIRATIONS
  if (project.inspirations.length) {
    const range =
      project.inspirations.length === 1 ? `l'image ${firstInspiration}` : `les images ${firstInspiration} à ${n - 1}`;
    sections.push({
      title: 'Inspirations',
      body: `Inspire-toi de ${range} uniquement pour l'ambiance, les couleurs et le style lumineux. N'en reprends ni le lieu, ni le matériel, ni la composition.`,
    });
  }

  // À ÉVITER
  const avoid = [
    "Ne modifie pas l'architecture du lieu" + (hasVenue && project.keepArchitecture ? '.' : ' au-delà de ce qui est demandé.'),
    "N'invente pas de matériel supplémentaire et ne change pas le nombre d'éléments demandés.",
    'Pas de texte, de logo, de filigrane ni de marque inventés.',
    "Pas de rendu type 3D, illustration ou image de synthèse visible. Pas de déformation ni d'élément flottant.",
  ];
  if (project.extraConstraints.trim()) avoid.push(project.extraConstraints.trim());
  sections.push({ title: 'À éviter', body: avoid.map((s) => `– ${s}`).join('\n') });

  const text = sections.map((s) => `${s.title.toUpperCase()}\n${s.body}`).join('\n\n');
  return { sections, text, images, assumptions };
}
