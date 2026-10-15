import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Info, PenLine } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { buildPrompt } from '../../lib/engine';
import { useSettings } from '../../lib/settings';
import type { Project } from '../../lib/types';
import { copyText, downloadText, slugify } from '../../lib/utils';
import type { Updater } from '../ProjectFlow';
import { RenderPanel } from './RenderPanel';

export function StepPrompt({ project, update, onEdit }: { project: Project; update: Updater; onEdit: () => void }) {
  const result = useMemo(() => buildPrompt(project), [project]);
  const toast = useToast();
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyText(result.text)) {
      setCopied(true);
      toast.success('Prompt copié. Colle-le dans ChatGPT Images.');
      setTimeout(() => setCopied(false), 2200);
    } else {
      toast.error('La copie a échoué. Sélectionne le texte puis Ctrl+C.');
    }
  };

  const download = () => {
    downloadText(`prompt-${slugify(project.name)}.txt`, result.text);
    toast.success('Prompt téléchargé');
  };

  return (
    <div className="prompt-layout">
      <div className="stack">
        <RenderPanel project={project} update={update} result={result} />
        <section className="card prompt-card" aria-label="Prompt généré">
          <div className="prompt-toolbar">
            <button className="btn btn-primary" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copié' : 'Copier le prompt'}
            </button>
            <button className="btn btn-secondary" onClick={download}>
              <Download /> Télécharger
            </button>
            <span className="spacer" />
            <button className="btn btn-ghost" onClick={onEdit}>
              <PenLine /> Modifier ma demande
            </button>
          </div>
          <div className="cue">
            {result.sections.map((s, i) => (
              <div className="cue-row" key={s.title}>
                <div className="cue-label">
                  <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </div>
                <div className="cue-body">{s.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside>
        {result.images.length > 0 && (
          <div className="card side-card">
            <h3>Joins ces images, dans cet ordre</h3>
            <div className="attach-list">
              {result.images.map((img) => (
                <div className="attach" key={img.photo.id}>
                  <span className="n">{img.index}</span>
                  <img src={img.photo.dataUrl} alt="" />
                  <span className="what">
                    <span>{img.label}</span>
                    <span className="small faint">
                      {img.role === 'lieu' ? 'Lieu à aménager' : img.role === 'materiel' ? 'Matériel' : 'Inspiration'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card side-card">
          <h3>Comment l'utiliser</h3>
          {settings.imageGenEnabled && settings.openrouterKey ? (
            <p className="small muted" style={{ margin: 0 }}>
              Clique sur « Générer le visuel » : le prompt et les images sont envoyés automatiquement, dans le bon ordre. Tu peux aussi
              copier le prompt pour l'utiliser dans ChatGPT Images.
            </p>
          ) : (
            <ol className="howto">
              <li>Ouvre ChatGPT et choisis la création d'images.</li>
              <li>{result.images.length ? 'Joins les images dans l’ordre indiqué.' : 'Aucune image à joindre.'}</li>
              <li>Colle le prompt et envoie.</li>
            </ol>
          )}
        </div>

        {result.assumptions.length > 0 && (
          <div className="card side-card">
            <h3>Points d'attention</h3>
            <ul className="notes">
              {result.assumptions.map((a, i) => (
                <li key={i} className={a.important ? 'important' : ''}>
                  {a.important ? <AlertTriangle /> : <Info />}
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
