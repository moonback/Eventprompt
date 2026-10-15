import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { analyze, suggestName } from '../lib/engine';
import { newProject, useSettings } from '../lib/settings';
import { listProjects, saveProject } from '../lib/storage';
import type { Project } from '../lib/types';

export const EXAMPLE =
  "Je prépare un gala d'entreprise. Je veux une scène moderne au fond de la salle, un grand écran LED centré, deux enceintes sur les côtés et des mange-debout autour de la piste de danse. Conserve l'architecture du lieu.";

export function Home() {
  const [text, setText] = useState('');
  const [recent, setRecent] = useState<Project[] | null>(null);
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    listProjects().then((p) => setRecent(p.slice(0, 3)));
  }, []);

  const create = async () => {
    const p = newProject(settings, text.trim());
    if (p.description) p.name = suggestName(analyze(p.description));
    await saveProject(p);
    navigate(`/projet/${p.id}/evenement`);
  };

  return (
    <div className="page-enter">
      <section className="hero">
        <div className="container hero-inner">
          <h1>
            Donnez vie à vos <em>scénographies</em>
          </h1>
          <p className="lead">
            Décris ton événement, ajoute tes photos : Régie rédige le prompt prêt à coller dans ChatGPT Images.
          </p>
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <label htmlFor="home-desc" className="sr-only">
              Décris ton événement
            </label>
            <textarea
              id="home-desc"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Décris ton événement : le type de soirée, le matériel à installer et où le placer…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) create();
              }}
              autoFocus
            />
            <div className="composer-bar">
              <button type="button" className="link-btn" onClick={() => setText(EXAMPLE)}>
                <Sparkles size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Essayer avec un exemple
              </button>
              <button type="submit" className="btn btn-primary btn-lg">
                Créer mon projet <ArrowRight />
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="recent">
        <div className="container">
          {recent && recent.length > 0 && (
            <>
              <div className="recent-head">
                <h2 className="section-title">Projets récents</h2>
                <Link to="/projets" className="btn btn-ghost btn-sm">
                  Tous mes projets <ArrowRight />
                </Link>
              </div>
              <div className="grid-projects">
                {recent.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
