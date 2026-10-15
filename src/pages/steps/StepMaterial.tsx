import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkPlus, Boxes, Check, ChevronDown, ImageIcon, ImagePlus, Package, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { DropZone, useDrop, useFilePicker } from '../../components/DropZone';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { analyze, FORMAT_LABELS, missingDetected, MOMENT_LABELS, PERSPECTIVE_LABELS, type DetectedItem } from '../../lib/engine';
import { getLibrary, saveLibrary } from '../../lib/storage';
import type { ImageFormat, Item, LibraryItem, Moment, Perspective, Project } from '../../lib/types';
import { usePhotoImport } from '../../lib/usePhotos';
import { formatDimsShort, nameFromFile, uid } from '../../lib/utils';
import { DimsInputs } from '../Library';
import type { Updater } from '../ProjectFlow';
import { itemFromPhoto, newItem } from './StepEvent';

const PLACEMENTS = ['Au fond de la salle', 'Au centre', 'De part et d’autre de la scène', 'À gauche', 'À droite', 'À l’entrée', 'Suspendu au plafond'];

function fromDetected(d: DetectedItem): Partial<Item> {
  return { name: d.label, placement: d.placement, quantity: d.quantity };
}

interface CardProps {
  item: Item;
  index: number;
  suggestions: DetectedItem[];
  onChange: (patch: Partial<Item>) => void;
  onRemove: () => void;
  onSaveToLibrary: () => void;
  autoFocus: boolean;
}

function ItemCard({ item, index, suggestions, onChange, onRemove, onSaveToLibrary, autoFocus }: CardProps) {
  const importPhotos = usePhotoImport();
  const setPhoto = async (files: File[]) => {
    const [res] = await importPhotos(files.slice(0, 1));
    if (res) onChange({ photo: res.photo, name: item.name || nameFromFile(res.file.name) });
  };
  const picker = useFilePicker(setPhoto);
  const { drag, handlers } = useDrop(setPhoto);
  const [showNotes, setShowNotes] = useState(Boolean(item.notes));
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  const addPlacement = (p: string) => {
    const cur = item.placement.trim().replace(/[.,]$/, '');
    onChange({ placement: cur ? `${cur}, ${p.charAt(0).toLowerCase()}${p.slice(1)}` : p });
  };

  return (
    <article className="item-card" aria-label={item.name || `Élément ${index + 1}`}>
      {picker.input}
      {item.photo ? (
        <div className={`item-photo has ${drag ? 'drag' : ''}`} {...handlers}>
          <img src={item.photo.dataUrl} alt={item.name || 'Matériel'} />
        </div>
      ) : (
        <button type="button" className={`item-photo ${drag ? 'drag' : ''}`} onClick={picker.open} {...handlers}>
          <ImagePlus />
          Ajouter une photo
        </button>
      )}

      <div className="item-body">
        <div className="item-top">
          <label className="sr-only" htmlFor={`name-${item.id}`}>Nom du matériel</label>
          <input
            ref={nameRef}
            id={`name-${item.id}`}
            className="item-name"
            value={item.name}
            placeholder="Nomme ce matériel"
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <div className="item-tools">
            <button className="icon-btn" onClick={picker.open} title={item.photo ? 'Remplacer la photo' : 'Ajouter une photo'} aria-label={item.photo ? 'Remplacer la photo' : 'Ajouter une photo'}>
              {item.photo ? <RefreshCw /> : <ImagePlus />}
            </button>
            <button className="icon-btn" onClick={onSaveToLibrary} title="Enregistrer dans Mon matériel" aria-label="Enregistrer dans Mon matériel" disabled={!item.name.trim()}>
              <BookmarkPlus />
            </button>
            <button className="icon-btn danger" onClick={onRemove} title="Supprimer" aria-label="Supprimer cet élément">
              <Trash2 />
            </button>
          </div>
        </div>

        {!item.name.trim() && suggestions.length > 0 && (
          <div className="identify">
            <span>C'est :</span>
            {suggestions.map((s) => (
              <button key={s.key} className="chip" onClick={() => onChange(fromDetected(s))}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor={`pl-${item.id}`}>Emplacement souhaité</label>
          <textarea
            id={`pl-${item.id}`}
            className="textarea"
            style={{ minHeight: 64 }}
            rows={2}
            value={item.placement}
            placeholder="Ex. au fond de la salle, centré face au public"
            onChange={(e) => onChange({ placement: e.target.value })}
          />
          <div className="chips">
            {PLACEMENTS.map((p) => (
              <button key={p} className="chip" onClick={() => addPlacement(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="item-meta">
          <label className="qty">
            Quantité
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Auto"
              value={item.quantity ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onChange({ quantity: Number.isFinite(v) && v > 0 ? v : null });
              }}
            />
          </label>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Dimensions <span className="faint">si connues</span>
            <DimsInputs dims={item.dims} onChange={(dims) => onChange({ dims })} />
          </span>
          {!showNotes && (
            <button className="link-btn" onClick={() => setShowNotes(true)}>
              + Ajouter une précision
            </button>
          )}
        </div>
        {showNotes && (
          <input
            className="input"
            value={item.notes}
            placeholder="Ex. habillage noir mat, logo du client sur la façade"
            onChange={(e) => onChange({ notes: e.target.value })}
            aria-label="Précisions sur ce matériel"
            autoFocus={!item.notes}
          />
        )}
      </div>
    </article>
  );
}

function LibraryPicker({ onPick, onClose }: { onPick: (items: LibraryItem[]) => void; onClose: () => void }) {
  const [lib, setLib] = useState<LibraryItem[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    getLibrary().then(setLib);
  }, []);
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  return (
    <Modal
      title="Ajouter depuis Mon matériel"
      onClose={onClose}
      footer={
        lib && lib.length > 0 ? (
          <>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" disabled={!sel.size} onClick={() => onPick(lib.filter((l) => sel.has(l.id)))}>
              {sel.size > 1 ? `Ajouter ${sel.size} éléments` : 'Ajouter'}
            </button>
          </>
        ) : undefined
      }
    >
      {lib && lib.length === 0 && (
        <div className="empty" style={{ padding: 28 }}>
          <Boxes className="empty-icon" />
          <h3>Aucun matériel enregistré</h3>
          <p>Enregistre ton matériel avec ses dimensions réelles pour le réutiliser ici en un clic.</p>
          <Link to="/materiel" className="btn btn-secondary btn-sm">Ouvrir Mon matériel</Link>
        </div>
      )}
      {lib && lib.length > 0 && (
        <div className="pick-list">
          {lib.map((l) => (
            <button key={l.id} className={`pick ${sel.has(l.id) ? 'on' : ''}`} onClick={() => toggle(l.id)} aria-pressed={sel.has(l.id)}>
              {l.photo ? <img src={l.photo.dataUrl} alt="" /> : <span className="ph"><ImageIcon /></span>}
              <span className="txt">
                <span>{l.name}</span>
                <span className="small faint">{formatDimsShort(l.dims) || 'Dimensions non renseignées'}</span>
              </span>
              <span className="check">{sel.has(l.id) && <Check />}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function StepMaterial({ project, update }: { project: Project; update: Updater }) {
  const toast = useToast();
  const importPhotos = usePhotoImport();
  const [picking, setPicking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const analysis = useMemo(() => analyze(project.description, project.ambiance), [project.description, project.ambiance]);
  const missing = useMemo(() => missingDetected(analysis, project.items), [analysis, project.items]);

  const changeItem = (id: string, patch: Partial<Item>) =>
    update((p) => ({ items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const removeItem = (item: Item) => {
    const before = project.items;
    update({ items: before.filter((i) => i.id !== item.id) });
    toast.success(`${item.name || 'Élément'} supprimé`, { label: 'Annuler', run: () => update({ items: before }) });
  };

  const addBlank = () => {
    const it = newItem();
    update((p) => ({ items: [...p.items, it] }));
    setFocusId(it.id);
  };

  const addDetected = () => {
    update((p) => ({ items: [...p.items, ...missing.map((d) => newItem(fromDetected(d)))] }));
    toast.success(missing.length > 1 ? `${missing.length} éléments ajoutés` : 'Élément ajouté');
  };

  const addPhotos = async (files: File[]) => {
    const res = await importPhotos(files);
    if (res.length) update((p) => ({ items: [...p.items, ...res.map(({ photo, file }) => itemFromPhoto(photo, file.name, p.description))] }));
  };

  const addFromLibrary = (libs: LibraryItem[]) => {
    update((p) => ({
      items: [
        ...p.items,
        ...libs.map((l) => {
          const d = missing.find((m) => l.name.toLowerCase().includes(m.label.toLowerCase().split(' ')[0]));
          return newItem({ name: l.name, photo: l.photo, dims: { ...l.dims }, notes: l.notes, libraryId: l.id, placement: d?.placement ?? '', quantity: d?.quantity ?? null });
        }),
      ],
    }));
    setPicking(false);
    toast.success(libs.length > 1 ? `${libs.length} éléments ajoutés` : 'Élément ajouté');
  };

  const saveToLibrary = async (item: Item) => {
    const lib = await getLibrary();
    const entry: LibraryItem = { id: item.libraryId ?? uid(), name: item.name.trim(), photo: item.photo, dims: item.dims, notes: item.notes, updatedAt: Date.now() };
    const exists = lib.some((l) => l.id === entry.id);
    await saveLibrary(exists ? lib.map((l) => (l.id === entry.id ? entry : l)) : [...lib, entry]);
    if (!item.libraryId) changeItem(item.id, { libraryId: entry.id });
    toast.success(exists ? 'Mis à jour dans Mon matériel' : 'Enregistré dans Mon matériel');
  };

  return (
    <div>
      {missing.length > 0 && (
        <div className="suggest">
          <Sparkles className="lead-icon" />
          <div className="suggest-text">
            <strong>Repéré dans ta description :</strong> {missing.map((m) => (m.quantity && m.quantity > 1 ? `${m.label} ×${m.quantity}` : m.label)).join(', ')}.
            {project.items.some((i) => !i.name.trim()) && <span className="muted"> Tu peux aussi les associer à tes photos ci-dessous.</span>}
          </div>
          <button className="btn btn-primary btn-sm" onClick={addDetected}>
            <Plus /> {missing.length > 1 ? `Ajouter ces ${missing.length} éléments` : 'Ajouter cet élément'}
          </button>
        </div>
      )}

      {project.items.length === 0 && missing.length === 0 ? (
        <div className="empty">
          <Package className="empty-icon" />
          <h3>Aucun matériel pour l'instant</h3>
          <p>Ajoute les éléments à installer : une photo et un emplacement suffisent. Les dimensions sont facultatives.</p>
          <div className="add-row" style={{ justifyContent: 'center', marginTop: 0 }}>
            <button className="btn btn-primary" onClick={addBlank}><Plus /> Ajouter du matériel</button>
            <button className="btn btn-secondary" onClick={() => setPicking(true)}><Boxes /> Depuis Mon matériel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="items">
            {project.items.map((it, i) => (
              <ItemCard
                key={it.id}
                item={it}
                index={i}
                suggestions={missing}
                autoFocus={focusId === it.id}
                onChange={(patch) => changeItem(it.id, patch)}
                onRemove={() => removeItem(it)}
                onSaveToLibrary={() => saveToLibrary(it)}
              />
            ))}
          </div>
          <div className="add-row">
            <button className="btn btn-secondary" onClick={addBlank}><Plus /> Ajouter du matériel</button>
            <button className="btn btn-secondary" onClick={() => setPicking(true)}><Boxes /> Depuis Mon matériel</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <DropZone variant="compact" multiple icon={<ImagePlus />} title="Déposer d'autres photos de matériel" hint="Chaque photo crée un nouvel élément" onFiles={addPhotos} />
          </div>
        </>
      )}

      <section className="card advanced">
        <button className={`disclosure ${showAdvanced ? 'open' : ''}`} onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced}>
          Options avancées
          <span className="faint" style={{ fontWeight: 400 }}>
            · {FORMAT_LABELS[project.format]}, {PERSPECTIVE_LABELS[project.perspective].toLowerCase()}
          </span>
          <ChevronDown className="chev" style={{ marginLeft: 'auto' }} />
        </button>
        {showAdvanced && (
          <>
            <div className="advanced-grid">
              <div className="field">
                <label className="label" htmlFor="adv-fmt">Format de l'image</label>
                <select id="adv-fmt" className="select" value={project.format} onChange={(e) => update({ format: e.target.value as ImageFormat })}>
                  {Object.entries(FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="adv-persp">Point de vue</label>
                <select id="adv-persp" className="select" value={project.perspective} onChange={(e) => update({ perspective: e.target.value as Perspective })}>
                  {Object.entries(PERSPECTIVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="adv-moment">Moment</label>
                <select id="adv-moment" className="select" value={project.moment} onChange={(e) => update({ moment: e.target.value as Moment })}>
                  {Object.entries(MOMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="toggle-row">
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Conserver l'architecture du lieu</div>
                <div className="hint">Murs, plafond, sol et ouvertures restent identiques à la photo.</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={project.keepArchitecture} onChange={(e) => update({ keepArchitecture: e.target.checked })} aria-label="Conserver l'architecture du lieu" />
                <span className="track" />
              </label>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="label" htmlFor="adv-extra">
                Autres consignes <span className="opt">facultatif</span>
              </label>
              <input id="adv-extra" className="input" value={project.extraConstraints} placeholder="Ex. ne pas montrer les issues de secours" onChange={(e) => update({ extraConstraints: e.target.value })} />
            </div>
          </>
        )}
      </section>

      {picking && <LibraryPicker onPick={addFromLibrary} onClose={() => setPicking(false)} />}
    </div>
  );
}
