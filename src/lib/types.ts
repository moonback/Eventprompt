export interface Photo {
  id: string;
  dataUrl: string;
  name: string;
  width: number;
  height: number;
}

/** Dimensions en centimètres. Une valeur absente signifie « inconnue ». */
export interface Dimensions {
  width?: number;
  depth?: number;
  height?: number;
}

export interface Item {
  id: string;
  name: string;
  photo?: Photo;
  dims: Dimensions;
  placement: string;
  /** null = quantité laissée à l'appréciation de l'IA */
  quantity: number | null;
  notes: string;
  libraryId?: string;
}

export type ImageFormat = '16:9' | '3:2' | '1:1' | '4:5' | '9:16';
export type Perspective = 'photo' | 'fond' | 'face' | 'hauteur' | 'ensemble';
export type Moment = 'auto' | 'jour' | 'soiree';
export type StepKey = 'evenement' | 'materiel' | 'prompt';

export interface Project {
  id: string;
  name: string;
  nameIsAuto: boolean;
  createdAt: number;
  updatedAt: number;
  description: string;
  ambiance: string;
  venue?: Photo;
  inspirations: Photo[];
  items: Item[];
  format: ImageFormat;
  perspective: Perspective;
  moment: Moment;
  keepArchitecture: boolean;
  extraConstraints: string;
  lastStep: StepKey;
  /** Le prompt a déjà été généré au moins une fois. */
  generated?: boolean;
}

export interface LibraryItem {
  id: string;
  name: string;
  photo?: Photo;
  dims: Dimensions;
  notes: string;
  updatedAt: number;
}

export interface Settings {
  agencyName: string;
  defaultFormat: ImageFormat;
  defaultPerspective: Perspective;
}
