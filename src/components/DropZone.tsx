import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { RefreshCw, Trash2, Upload } from 'lucide-react';
import type { Photo } from '../lib/types';

/** Ouvre le sélecteur de fichiers et renvoie les fichiers choisis. */
export function useFilePicker(onFiles: (files: File[]) => void, multiple = false) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple={multiple}
      hidden
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length) onFiles(files);
      }}
    />
  );
  return { open: () => ref.current?.click(), input };
}

export function useDrop(onFiles: (files: File[]) => void) {
  const [drag, setDrag] = useState(false);
  const depth = useRef(0);
  return {
    drag,
    handlers: {
      onDragEnter: (e: DragEvent) => {
        e.preventDefault();
        depth.current++;
        setDrag(true);
      },
      onDragOver: (e: DragEvent) => e.preventDefault(),
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDrag(false);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        depth.current = 0;
        setDrag(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      },
    },
  };
}

interface DropZoneProps {
  icon: ReactNode;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  variant?: 'tall' | 'compact' | 'default';
  browseLabel?: string;
}

export function DropZone({ icon, title, hint, onFiles, multiple, variant = 'default', browseLabel = 'Parcourir' }: DropZoneProps) {
  const picker = useFilePicker(onFiles, multiple);
  const { drag, handlers } = useDrop(onFiles);
  return (
    <div
      className={`dropzone ${variant !== 'default' ? variant : ''} ${drag ? 'drag' : ''}`}
      {...handlers}
      onClick={picker.open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          picker.open();
        }
      }}
      aria-label={`${title}. ${hint}`}
    >
      {picker.input}
      <div className="dz-icon">{icon}</div>
      <div>
        <div className="dz-title">{drag ? 'Dépose ici' : title}</div>
        <div className="dz-hint">{hint}</div>
      </div>
      <span className={`btn btn-secondary btn-sm dz-browse`} aria-hidden="true">
        <Upload /> {browseLabel}
      </span>
    </div>
  );
}

export function PhotoFrame({ photo, onReplace, onRemove, alt }: { photo: Photo; onReplace: (f: File[]) => void; onRemove: () => void; alt: string }) {
  const picker = useFilePicker(onReplace);
  const { drag, handlers } = useDrop(onReplace);
  return (
    <div className="photo-frame" {...handlers} style={drag ? { outline: '2px solid var(--accent)' } : undefined}>
      {picker.input}
      <img src={photo.dataUrl} alt={alt} />
      <div className="photo-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={picker.open}>
          <RefreshCw /> Remplacer
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRemove}>
          <Trash2 /> Supprimer
        </button>
      </div>
    </div>
  );
}
