import { useState } from 'react';
import { ChevronDown, ImageIcon, Lightbulb, Package, Plus, X } from 'lucide-react';
import { DropZone, PhotoFrame, useFilePicker } from '../../components/DropZone';
import { useToast } from '../../components/Toast';
import { enrichFromDescription } from '../../lib/engine';
import type { Item, Photo, Project } from '../../lib/types';
import { usePhotoImport } from '../../lib/usePhotos';
import { nameFromFile, uid } from '../../lib/utils';
import { EXAMPLE } from '../Home';
import type { Updater } from '../ProjectFlow';

const AMBIANCES = ['Chic et raffinée', 'Festive', 'Corporate sobre', 'Romantique', 'Champêtre', 'Futuriste'];

export function newItem(partial: Partial<Item> = {}): Item {
  return { id: uid(), name: '', dims: {}, placement: '', quantity: null, notes: '', ...partial };
}

/** Crée un élément depuis une photo, prérempli si la description parle de ce matériel. */
export function itemFromPhoto(photo: Photo, fileName: string, description: string): Item {
  const name = nameFromFile(fileName);
  return newItem({ photo, name, ...(enrichFromDescription(name, description) ?? {}) });
}

export function StepEvent({ project, update }: { project: Project; update: Updater }) {
  const importPhotos = usePhotoImport();
  const toast = useToast();
  const [showInspi, setShowInspi] = useState(project.inspirations.length > 0);

  const setVenue = async (files: File[]) => {
    const [res] = await importPhotos(files.slice(0, 1));
    if (res) {
      update({ venue: res.photo });
      toast.success('Photo du lieu ajoutée');
    }
  };

  const addEquipment = async (files: File[]) => {
    const res = await importPhotos(files);
    if (!res.length) return;
    update((p) => ({ items: [...p.items, ...res.map(({ photo, file }) => itemFromPhoto(photo, file.name, p.description))] }));
    toast.success(res.length > 1 ? `${res.length} photos de matériel ajoutées` : 'Photo de matériel ajoutée');
  };

  const removeEquipment = (item: Item) => {
    const before = project.items;
    update({ items: before.filter((i) => i.id !== item.id) });
    toast.success('Photo retirée', { label: 'Annuler', run: () => update({ items: before }) });
  };

  const addInspirations = async (files: File[]) => {
    const res = await importPhotos(files);
    if (res.length) update((p) => ({ inspirations: [...p.inspirations, ...res.map((r) => r.photo)] }));
  };

  const equipmentPicker = useFilePicker(addEquipment, true);
  const inspiPicker = useFilePicker(addInspirations, true);
  const photoItems = project.items.filter((i) => i.photo);

  const toggleAmbiance = (a: string) => {
    const parts = project.ambiance.split(',').map((s) => s.trim()).filter(Boolean);
    const has = parts.some((p) => p.toLowerCase() === a.toLowerCase());
    const next = has ? parts.filter((p) => p.toLowerCase() !== a.toLowerCase()) : [...parts, a];
    update({ ambiance: next.join(', ') });
  };

  return (
    <div className="flow-grid">
      <div className="stack">
        <section className="card card-pad stack-sm">
          <div className="block-head" style={{ marginBottom: 4 }}>
            <label className="section-title" htmlFor="desc">Décris ton événement</label>
            {!project.description && (
              <button className="link-btn" onClick={() => update({ description: EXAMPLE })}>
                Voir un exemple
              </button>
            )}
          </div>
          <textarea
            id="desc"
            className="textarea big-textarea"
            value={project.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Ex. Je prépare un gala d'entreprise. Je veux une scène au fond de la salle, un écran LED centré, deux enceintes sur les côtés…"
            autoFocus={!project.description}
          />
          <p className="hint" style={{ margin: 0, display: 'flex', gap: 8 }}>
            <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            Écris comme tu parlerais à ton équipe : quel matériel, où le placer, ce qu'il faut garder du lieu.
          </p>
        </section>

        <section className="card card-pad stack-sm">
          <label className="section-title" htmlFor="amb">
            Ambiance souhaitée <span className="faint" style={{ fontWeight: 400 }}>· facultatif</span>
          </label>
          <input
            id="amb"
            className="input"
            value={project.ambiance}
            onChange={(e) => update({ ambiance: e.target.value })}
            placeholder="Ex. chic et feutrée, lumières bleues et dorées"
          />
          <div className="chips">
            {AMBIANCES.map((a) => (
              <button
                key={a}
                className={`chip ${project.ambiance.toLowerCase().includes(a.toLowerCase()) ? 'on' : ''}`}
                onClick={() => toggleAmbiance(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="stack">
        <section className="card card-pad">
          <div className="block-head">
            <div>
              <h2 className="section-title">Photo du lieu</h2>
              <p>La salle à aménager, prise depuis le point de vue souhaité.</p>
            </div>
          </div>
          {project.venue ? (
            <PhotoFrame photo={project.venue} alt="Photo du lieu" onReplace={setVenue} onRemove={() => update({ venue: undefined })} />
          ) : (
            <DropZone variant="tall" icon={<ImageIcon />} title="Ajouter la photo du lieu" hint="Glisse une image ici ou parcours tes fichiers" onFiles={setVenue} />
          )}
        </section>

        <section className="card card-pad">
          <div className="block-head">
            <div>
              <h2 className="section-title">Photos du matériel</h2>
              <p>Une photo par élément. Tu les nommeras à l'étape suivante.</p>
            </div>
          </div>
          {photoItems.length === 0 ? (
            <DropZone variant="compact" multiple icon={<Package />} title="Ajouter les photos du matériel" hint="Plusieurs images à la fois" onFiles={addEquipment} />
          ) : (
            <div className="thumbs">
              {equipmentPicker.input}
              {photoItems.map((it) => (
                <div className="thumb" key={it.id} title={it.name || it.photo!.name}>
                  <img src={it.photo!.dataUrl} alt={it.name || 'Matériel'} />
                  <button className="thumb-x" onClick={() => removeEquipment(it)} aria-label="Retirer cette photo">
                    <X />
                  </button>
                </div>
              ))}
              <button className="thumb-add" onClick={equipmentPicker.open} aria-label="Ajouter des photos de matériel">
                <Plus size={20} />
              </button>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <button className={`disclosure ${showInspi ? 'open' : ''}`} onClick={() => setShowInspi(!showInspi)} aria-expanded={showInspi}>
            Images d'inspiration
            <span className="faint" style={{ fontWeight: 400 }}>· facultatif</span>
            {project.inspirations.length > 0 && <span className="faint" style={{ fontWeight: 400 }}>({project.inspirations.length})</span>}
            <ChevronDown className="chev" style={{ marginLeft: 'auto' }} />
          </button>
          {showInspi && (
            <div style={{ marginTop: 14 }} className="stack-sm">
              <p className="hint" style={{ margin: 0 }}>Utilisées pour l'ambiance et les couleurs uniquement, jamais copiées.</p>
              {project.inspirations.length === 0 ? (
                <DropZone variant="compact" multiple icon={<ImageIcon />} title="Ajouter des inspirations" hint="Moodboard, événement de référence…" onFiles={addInspirations} />
              ) : (
                <div className="thumbs">
                  {inspiPicker.input}
                  {project.inspirations.map((p) => (
                    <div className="thumb" key={p.id}>
                      <img src={p.dataUrl} alt="Inspiration" />
                      <button className="thumb-x" onClick={() => update({ inspirations: project.inspirations.filter((x) => x.id !== p.id) })} aria-label="Retirer cette inspiration">
                        <X />
                      </button>
                    </div>
                  ))}
                  <button className="thumb-add" onClick={inspiPicker.open} aria-label="Ajouter des inspirations">
                    <Plus size={20} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
