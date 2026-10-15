import { Link } from 'react-router-dom';
import { CopyPlus, ImageIcon, Trash2 } from 'lucide-react';
import type { Project } from '../lib/types';
import { relativeDate } from '../lib/utils';

interface Props {
  project: Project;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, onDuplicate, onDelete }: Props) {
  const ready = Boolean(project.generated);
  return (
    <div className="project-card">
      <Link to={`/projet/${project.id}/${project.lastStep}`} aria-label={`Ouvrir ${project.name}`}>
        <div className="project-thumb">
          {project.venue ? (
            <img src={project.venue.dataUrl} alt="" loading="lazy" />
          ) : (
            <div className="placeholder">
              <ImageIcon />
            </div>
          )}
        </div>
        <div className="project-body">
          <div className="project-name">{project.name}</div>
          <div className="project-meta">
            <span>{relativeDate(project.updatedAt)}</span>
            <span className={`badge ${ready ? 'ready' : ''}`}>
              <span className="dot" />
              {ready ? 'Prompt prêt' : 'En cours'}
            </span>
          </div>
        </div>
      </Link>
      {(onDuplicate || onDelete) && (
        <div className="project-actions">
          {onDuplicate && (
            <button className="icon-btn" onClick={onDuplicate} title="Dupliquer" aria-label={`Dupliquer ${project.name}`}>
              <CopyPlus />
            </button>
          )}
          {onDelete && (
            <button className="icon-btn danger" onClick={onDelete} title="Supprimer" aria-label={`Supprimer ${project.name}`}>
              <Trash2 />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
