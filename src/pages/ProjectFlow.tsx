import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FolderOpen, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '../components/Toast';
import { analyze, suggestName } from '../lib/engine';
import { getProject, saveProject } from '../lib/storage';
import type { Project, StepKey } from '../lib/types';
import { StepEvent } from './steps/StepEvent';
import { StepMaterial } from './steps/StepMaterial';
import { StepPrompt } from './steps/StepPrompt';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'evenement', label: 'Mon événement' },
  { key: 'materiel', label: 'Mon matériel' },
  { key: 'prompt', label: 'Mon prompt' },
];

export type Updater = (patch: Partial<Project> | ((p: Project) => Partial<Project>)) => void;

export function ProjectFlow() {
  const { id = '', step } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirty = useRef(false);
  const latest = useRef<Project | null>(null);

  useEffect(() => {
    let alive = true;
    getProject(id).then((p) => alive && setProject(p ?? null));
    return () => {
      alive = false;
    };
  }, [id]);

  // Sauvegarde automatique, avec un court délai pour regrouper les frappes.
  useEffect(() => {
    latest.current = project ?? null;
    if (!project || !dirty.current) return;
    setSaveState('saving');
    const t = setTimeout(async () => {
      await saveProject(project);
      dirty.current = false;
      setSaveState('saved');
    }, 300);
    return () => clearTimeout(t);
  }, [project]);

  // Ne rien perdre en quittant la page ou en changeant d'écran.
  useEffect(() => {
    const flush = () => {
      if (dirty.current && latest.current) saveProject(latest.current);
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      flush();
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  const update: Updater = useCallback((patch) => {
    setProject((p) => {
      if (!p) return p;
      const changes = typeof patch === 'function' ? patch(p) : patch;
      const next = { ...p, ...changes, updatedAt: Date.now() };
      if (next.nameIsAuto && changes.description !== undefined) {
        next.name = suggestName(analyze(next.description));
      }
      dirty.current = true;
      return next;
    });
  }, []);

  const current = STEPS.find((s) => s.key === step)?.key;

  useEffect(() => {
    if (project && current && (project.lastStep !== current || (current === 'prompt' && !project.generated))) {
      update({ lastStep: current, ...(current === 'prompt' ? { generated: true } : {}) });
    }
  }, [current, project, update]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [current]);

  if (project === undefined) return null;
  if (project === null) {
    return (
      <div className="container" style={{ paddingTop: 64 }}>
        <div className="empty">
          <FolderOpen className="empty-icon" />
          <h3>Ce projet est introuvable</h3>
          <p>Il a peut-être été supprimé. Tes autres projets t'attendent dans « Mes projets ».</p>
          <Link className="btn btn-primary" to="/projets">Voir mes projets</Link>
        </div>
      </div>
    );
  }
  if (!current) return <Navigate to={`/projet/${id}/${project.lastStep}`} replace />;

  const idx = STEPS.findIndex((s) => s.key === current);

  const canLeaveEvent = () => {
    if (project.description.trim() || project.venue) return true;
    toast.error('Décris ton événement ou ajoute une photo du lieu pour continuer.');
    return false;
  };

  const goTo = (target: StepKey) => {
    const targetIdx = STEPS.findIndex((s) => s.key === target);
    if (current === 'evenement' && targetIdx > 0 && !canLeaveEvent()) return;
    navigate(`/projet/${id}/${target}`);
  };

  return (
    <div className="container page-enter" key={current}>
      <div className="flow-head">
        <label htmlFor="project-name" className="sr-only">Nom du projet</label>
        <input
          id="project-name"
          className="flow-title"
          value={project.name}
          onChange={(e) => update({ name: e.target.value, nameIsAuto: false })}
          onBlur={() => !project.name.trim() && update({ name: 'Nouveau projet', nameIsAuto: true })}
        />
        <span className="save-state" aria-live="polite">
          {saveState === 'saving' ? (
            <>
              <Loader2 className="spin" /> Enregistrement…
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check /> Enregistré
            </>
          ) : null}
        </span>
      </div>

      <nav className="stepper" aria-label="Étapes du projet">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            className={`step ${i === idx ? 'current' : i < idx ? 'done' : ''}`}
            aria-current={i === idx ? 'step' : undefined}
            onClick={() => goTo(s.key)}
          >
            <span className="num">{i < idx ? <Check /> : i + 1}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </nav>

      {current === 'evenement' && <StepEvent project={project} update={update} />}
      {current === 'materiel' && <StepMaterial project={project} update={update} />}
      {current === 'prompt' && <StepPrompt project={project} update={update} onEdit={() => goTo('evenement')} />}

      <div className="flow-footer">
        <div className="flow-footer-inner">
          {idx > 0 ? (
            <button className="btn btn-ghost" onClick={() => goTo(STEPS[idx - 1].key)}>
              <ArrowLeft /> {STEPS[idx - 1].label}
            </button>
          ) : (
            <span />
          )}
          {current === 'evenement' && (
            <button className="btn btn-primary btn-lg" onClick={() => goTo('materiel')}>
              Continuer vers mon matériel <ArrowRight />
            </button>
          )}
          {current === 'materiel' && (
            <button className="btn btn-primary btn-lg" onClick={() => goTo('prompt')}>
              <Sparkles /> Générer mon prompt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
