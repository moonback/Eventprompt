import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Download, ImageIcon, KeyRound, Sparkles, Trash2, X } from 'lucide-react';
import { useToast } from '../../components/Toast';
import type { PromptResult } from '../../lib/engine';
import { FORMAT_LABELS } from '../../lib/engine';
import { GenerationError, generateImage, IMAGE_MODELS, modelLabel } from '../../lib/openrouter';
import { useSettings } from '../../lib/settings';
import type { Project, Render } from '../../lib/types';
import { slugify, uid } from '../../lib/utils';
import type { Updater } from '../ProjectFlow';

interface Props {
  project: Project;
  update: Updater;
  result: PromptResult;
}

export function RenderPanel({ project, update, result }: Props) {
  const { settings } = useSettings();
  const toast = useToast();
  const renders = project.renders ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(renders[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const abort = useRef<AbortController | null>(null);

  // Annule la génération si l'on quitte l'écran.
  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  if (!settings.imageGenEnabled) return null;

  const maxRefs = IMAGE_MODELS.find((m) => m.id === settings.imageModel)?.maxRefs ?? 14;
  const refs = result.images.map((i) => i.photo.dataUrl);
  const tooMany = refs.length > maxRefs;
  const selected = renders.find((r) => r.id === selectedId) ?? renders[0];
  const ratio = project.format.replace(':', ' / ');

  const generate = async () => {
    setError('');
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const img = await generateImage({
        key: settings.openrouterKey,
        model: settings.imageModel,
        prompt: result.text,
        references: refs.slice(0, maxRefs),
        format: project.format,
        resolution: settings.imageResolution,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const render: Render = { id: uid(), dataUrl: img.dataUrl, createdAt: Date.now(), model: settings.imageModel, cost: img.cost };
      update((p) => ({ renders: [render, ...(p.renders ?? [])] }));
      setSelectedId(render.id);
      toast.success('Visuel généré');
    } catch (e) {
      if ((e as Error).name === 'AbortError' || ctrl.signal.aborted) return;
      setError(e instanceof GenerationError ? e.message : 'La génération a échoué. Réessaie dans un instant.');
    } finally {
      if (abort.current === ctrl) {
        setBusy(false);
        abort.current = null;
      }
    }
  };

  const cancel = () => {
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
  };

  const download = (r: Render) => {
    const ext = r.dataUrl.slice(5, r.dataUrl.indexOf(';')).split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
    const a = document.createElement('a');
    a.href = r.dataUrl;
    a.download = `visuel-${slugify(project.name)}-${renders.length - renders.indexOf(r)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const remove = (r: Render) => {
    const before = project.renders ?? [];
    update({ renders: before.filter((x) => x.id !== r.id) });
    setSelectedId(null);
    toast.success('Visuel supprimé', { label: 'Annuler', run: () => update({ renders: before }) });
  };

  if (!settings.openrouterKey) {
    return (
      <section className="card render-card">
        <div className="render-head">
          <div>
            <h2 className="section-title">Visuel</h2>
            <p className="hint" style={{ margin: '2px 0 0' }}>Génération avec {modelLabel(settings.imageModel)}</p>
          </div>
        </div>
        <div className="render-empty">
          <KeyRound />
          <p>Ajoute ta clé OpenRouter pour générer le visuel directement ici.</p>
          <Link to="/parametres" className="btn btn-secondary btn-sm">Ouvrir les paramètres</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card render-card" aria-label="Visuel généré">
      <div className="render-head">
        <div>
          <h2 className="section-title">Visuel</h2>
          <p className="hint" style={{ margin: '2px 0 0' }}>
            {modelLabel(settings.imageModel)} · {FORMAT_LABELS[project.format]} · {settings.imageResolution}
            {refs.length > 0 && ` · ${Math.min(refs.length, maxRefs)} image${refs.length > 1 ? 's' : ''} de référence`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          <Sparkles /> {renders.length ? 'Générer une nouvelle version' : 'Générer le visuel'}
        </button>
      </div>

      {tooMany && (
        <div className="callout" style={{ margin: '0 20px 16px' }}>
          <AlertTriangle />
          <span>Ce modèle accepte {maxRefs} images au maximum : seules les {maxRefs} premières seront envoyées.</span>
        </div>
      )}

      {error && (
        <div className="callout error" style={{ margin: '0 20px 16px' }} role="alert">
          <AlertTriangle />
          <span>{error}</span>
        </div>
      )}

      <div className="render-stage" style={{ aspectRatio: ratio }}>
        {busy ? (
          <div className="render-loading">
            <div className="render-shimmer" />
            <div className="render-loading-text">
              <span>Génération en cours… {elapsed} s</span>
              <span className="hint">Compte en général 20 à 60 secondes.</span>
              <button className="btn btn-ghost btn-sm" onClick={cancel}>
                <X /> Annuler
              </button>
            </div>
          </div>
        ) : selected ? (
          <img src={selected.dataUrl} alt={`Visuel généré pour ${project.name}`} />
        ) : (
          <div className="render-placeholder">
            <ImageIcon />
            <span>Le visuel apparaîtra ici.</span>
          </div>
        )}
      </div>

      {selected && !busy && (
        <div className="render-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => download(selected)}>
            <Download /> Télécharger l'image
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => remove(selected)}>
            <Trash2 /> Supprimer
          </button>
          <span className="hint" style={{ marginLeft: 'auto' }}>
            {modelLabel(selected.model)}
            {typeof selected.cost === 'number' && ` · ${selected.cost.toFixed(3)} $`}
          </span>
        </div>
      )}

      {renders.length > 1 && (
        <div className="render-history" aria-label="Versions précédentes">
          {renders.map((r, i) => (
            <button
              key={r.id}
              className={`render-thumb ${r.id === selected?.id ? 'on' : ''}`}
              onClick={() => setSelectedId(r.id)}
              aria-label={`Version ${renders.length - i}`}
              aria-pressed={r.id === selected?.id}
            >
              <img src={r.dataUrl} alt="" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
