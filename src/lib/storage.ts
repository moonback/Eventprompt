import { createStore, del, get, getMany, keys, set, clear } from 'idb-keyval';
import type { LibraryItem, Project, Settings } from './types';

// IndexedDB plutôt que localStorage : les photos dépassent vite les 5 Mo du localStorage.
const store = createStore('regie-db', 'kv');
const PROJECT_PREFIX = 'project:';

export const DEFAULT_SETTINGS: Settings = {
  agencyName: '',
  defaultFormat: '16:9',
  defaultPerspective: 'photo',
  imageGenEnabled: false,
  openrouterKey: '',
  imageModel: 'google/gemini-3.1-flash-image',
  imageResolution: '2K',
};

export async function listProjects(): Promise<Project[]> {
  const all = (await keys(store)).filter(
    (k): k is string => typeof k === 'string' && k.startsWith(PROJECT_PREFIX),
  );
  const projects = (await getMany<Project>(all, store)).filter(Boolean);
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Promise<Project | undefined> {
  return get<Project>(PROJECT_PREFIX + id, store);
}

export function saveProject(project: Project): Promise<void> {
  return set(PROJECT_PREFIX + project.id, project, store);
}

export function deleteProject(id: string): Promise<void> {
  return del(PROJECT_PREFIX + id, store);
}

export async function getLibrary(): Promise<LibraryItem[]> {
  const items = (await get<LibraryItem[]>('library', store)) ?? [];
  return items.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function saveLibrary(items: LibraryItem[]): Promise<void> {
  return set('library', items, store);
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await get<Settings>('settings', store)) ?? {}) };
}

export function saveSettings(settings: Settings): Promise<void> {
  return set('settings', settings, store);
}

export function clearAll(): Promise<void> {
  return clear(store);
}
