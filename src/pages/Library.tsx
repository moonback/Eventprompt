import { useEffect, useState } from 'react';
import { Boxes, ImageIcon, PenLine, Plus, Trash2 } from 'lucide-react';
import { DropZone, PhotoFrame } from '../components/DropZone';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { getLibrary, saveLibrary } from '../lib/storage';
import type { Dimensions, LibraryItem } from '../lib/types';
import { usePhotoImport } from '../lib/usePhotos';
import { formatDimsShort, nameFromFile, uid } from '../lib/utils';

export function DimsInputs({ dims, onChange }: { dims: Dimensions; onChange: (d: Dimensions) => void }) {
  const field = (key: keyof Dimensions, label: string) => (
    <input
      className="input"
      type="number"
      min={0}
      inputMode="decimal"
      placeholder={label}
      aria-label={`${label === 'L' ? 'Largeur' : label === 'P' ? 'Profondeur' : 'Hauteur'} en centimètres`}
      value={dims[key] ?? ''}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange({ ...dims, [key]: Number.isFinite(v) && v > 0 ? v : undefined });
      }}
    />
  );
  return (
    <span className="dims">
      {field('width', 'L')}
      <span className="x">×</span>
      {field('depth', 'P')}
      <span className="x">×</span>
      {field('height', 'H')}
      <span className="x">cm</span>
    </span>
  );
}

function ItemForm({ initial, onSave, onClose }: { initial: LibraryItem; onSave: (i: LibraryItem) => void; onClose: () => void }) {
  const [item, setItem] = useState(initial);
  const importPhotos = usePhotoImport();
  const setPhoto = async (files: File[]) => {
    const [res] = await importPhotos(files.slice(0, 1));
    if (res) setItem((i) => ({ ...i, photo: res.photo, name: i.name || nameFromFile(res.file.name) }));
  };
  return (
    <Modal
      title={initial.name ? 'Modifier le matériel' : 'Ajouter du matériel'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={!item.name.trim()} onClick={() => onSave({ ...item, name: item.name.trim(), updatedAt: Date.now() })}>
            Enregistrer
          </button>
        </>
      }
    >
      {item.photo ? (
        <PhotoFrame photo={item.photo} alt={item.name} onReplace={setPhoto} onRemove={() => setItem({ ...item, photo: undefined })} />
      ) : (
        <DropZone icon={<ImageIcon />} title="Photo du matériel" hint="Glisse une image ou clique pour parcourir" onFiles={setPhoto} />
      )}
      <div className="field">
        <label className="label" htmlFor="lib-name">Nom</label>
        <input id="lib-name" className="input" value={item.name} placeholder="Ex. Écran LED 5 × 3 m" onChange={(e) => setItem({ ...item, name: e.target.value })} autoFocus />
      </div>
      <div className="field">
        <span className="label">
          Dimensions <span className="opt">si connues</span>
        </span>
        <DimsInputs dims={item.dims} onChange={(dims) => setItem({ ...item, dims })} />
        <span className="hint">Laisse vide plutôt que d'estimer : Régie n'invente jamais de dimensions.</span>
      </div>
      <div className="field">
        <label className="label" htmlFor="lib-notes">
          Précisions <span className="opt">facultatif</span>
        </label>
        <input id="lib-notes" className="input" value={item.notes} placeholder="Ex. habillage noir mat, pieds chromés" onChange={(e) => setItem({ ...item, notes: e.target.value })} />
      </div>
    </Modal>
  );
}

export const emptyLibraryItem = (): LibraryItem => ({ id: uid(), name: '', dims: {}, notes: '', updatedAt: Date.now() });

export function Library() {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const toast = useToast();

  useEffect(() => {
    getLibrary().then(setItems);
  }, []);

  const persist = async (next: LibraryItem[]) => {
    setItems(next);
    await saveLibrary(next);
  };

  const save = async (item: LibraryItem) => {
    const list = items ?? [];
    const exists = list.some((i) => i.id === item.id);
    await persist(exists ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item]);
    setEditing(null);
    toast.success(exists ? 'Matériel mis à jour' : 'Matériel ajouté');
  };

  const remove = async (item: LibraryItem) => {
    const before = items ?? [];
    await persist(before.filter((i) => i.id !== item.id));
    toast.success('Matériel supprimé', { label: 'Annuler', run: () => persist(before) });
  };

  return (
    <div className="container page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mon matériel</h1>
          <p className="page-sub">Enregistre ton matériel une fois, réutilise-le dans tous tes projets.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(emptyLibraryItem())}>
          <Plus /> Ajouter du matériel
        </button>
      </div>

      {items && items.length === 0 && (
        <div className="empty">
          <Boxes className="empty-icon" />
          <h3>Ta bibliothèque est vide</h3>
          <p>Ajoute ton écran LED, tes enceintes ou ta scène avec leur photo et leurs dimensions réelles. Ils seront disponibles en un clic dans tes projets.</p>
          <button className="btn btn-primary" onClick={() => setEditing(emptyLibraryItem())}>
            <Plus /> Ajouter mon premier matériel
          </button>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="lib-grid">
          {items.map((it) => (
            <div key={it.id} className="card lib-card project-card">
              <button className="project-thumb" style={{ border: 0, padding: 0 }} onClick={() => setEditing(it)} aria-label={`Modifier ${it.name}`}>
                {it.photo ? <img src={it.photo.dataUrl} alt="" /> : <div className="placeholder"><ImageIcon /></div>}
              </button>
              <div className="body">
                <div style={{ minWidth: 0 }}>
                  <div className="project-name">{it.name}</div>
                  <div className="small faint">{formatDimsShort(it.dims) || 'Dimensions non renseignées'}</div>
                </div>
                <div className="item-tools">
                  <button className="icon-btn" onClick={() => setEditing(it)} aria-label={`Modifier ${it.name}`}>
                    <PenLine />
                  </button>
                  <button className="icon-btn danger" onClick={() => remove(it)} aria-label={`Supprimer ${it.name}`}>
                    <Trash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ItemForm initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}
