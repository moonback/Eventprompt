import { useCallback } from 'react';
import { useToast } from '../components/Toast';
import type { Photo } from './types';
import { fileToPhoto, PhotoError } from './utils';

/** Convertit des fichiers en photos et affiche une erreur claire pour ceux qui échouent. */
export function usePhotoImport() {
  const toast = useToast();
  return useCallback(
    async (files: File[]): Promise<{ photo: Photo; file: File }[]> => {
      const out: { photo: Photo; file: File }[] = [];
      for (const file of files) {
        try {
          out.push({ photo: await fileToPhoto(file), file });
        } catch (e) {
          toast.error(e instanceof PhotoError ? e.message : `Impossible d'importer « ${file.name} ».`);
        }
      }
      return out;
    },
    [toast],
  );
}
