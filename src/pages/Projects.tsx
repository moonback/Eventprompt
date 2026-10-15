import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { useToast } from '../components/Toast';
import { newProject, useSettings } from '../lib/settings';
import { deleteProject, listProjects, saveProject } from '../lib/storage';
import type { Project } from '../lib/types';
import { uid } from '../lib/utils';

export function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();

  const refresh = () => listProjects().then(setProjects);
  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    const p = newProject(settings);
    await saveProject(p);
    navigate(`/projet/${p.id}/evenement`);
  };

  const duplicate = async (p: Project) => {
    const now = Date.now();
    const copy: Project = { ...structuredClone(p), id: uid(), name: `${p.name} (copie)`, nameIsAuto: false, createdAt: now, updatedAt: now };
    await saveProject(copy);
    await refresh();
    toast.success('Projet dupliqué');
  };

  const remove = async (p: Project) => {
    await deleteProject(p.id);
    await refresh();
    toast.success('Projet supprimé', {
      label: 'Annuler',
      run: async () => {
        await saveProject(p);
        refresh();
      },
    });
  };

  return (
    <div className="container page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mes projets</h1>
          <p className="page-sub">Chaque projet est enregistré automatiquement sur cet ordinateur.</p>
        </div>
        <button className="btn btn-primary" onClick={create}>
          <Plus /> Nouveau projet
        </button>
      </div>
      {projects && projects.length === 0 && (
        <div className="empty">
          <FolderOpen className="empty-icon" />
          <h3>Aucun projet pour l'instant</h3>
          <p>Crée ton premier projet : une description et une photo du lieu suffisent pour commencer.</p>
          <button className="btn btn-primary" onClick={create}>
            <Plus /> Créer mon premier projet
          </button>
        </div>
      )}
      {projects && projects.length > 0 && (
        <div className="grid-projects" style={{ paddingBottom: 80 }}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDuplicate={() => duplicate(p)} onDelete={() => remove(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
