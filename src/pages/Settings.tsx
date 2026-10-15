import { useState } from 'react';
import { useToast } from '../components/Toast';
import { FORMAT_LABELS, PERSPECTIVE_LABELS } from '../lib/engine';
import { useSettings } from '../lib/settings';
import { clearAll, saveSettings } from '../lib/storage';
import type { ImageFormat, Perspective } from '../lib/types';

export function Settings() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const saved = () => toast.success('Paramètres enregistrés');

  return (
    <div className="container page-enter">
      <div className="page-head">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-sub">Les valeurs par défaut appliquées à chaque nouveau projet.</p>
        </div>
      </div>
      <div className="settings">
        <div className="card card-pad stack">
          <div className="field">
            <label className="label" htmlFor="agency">
              Nom de l'agence <span className="opt">facultatif</span>
            </label>
            <input
              id="agency"
              className="input"
              value={settings.agencyName}
              placeholder="Ex. Studio Lumière Événements"
              onChange={(e) => update({ agencyName: e.target.value })}
              onBlur={saved}
            />
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="fmt">Format d'image par défaut</label>
              <select
                id="fmt"
                className="select"
                value={settings.defaultFormat}
                onChange={(e) => {
                  update({ defaultFormat: e.target.value as ImageFormat });
                  saved();
                }}
              >
                {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="persp">Point de vue par défaut</label>
              <select
                id="persp"
                className="select"
                value={settings.defaultPerspective}
                onChange={(e) => {
                  update({ defaultPerspective: e.target.value as Perspective });
                  saved();
                }}
              >
                {Object.entries(PERSPECTIVE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card card-pad stack-sm">
          <h2 className="section-title">Données</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Tes projets, tes photos et ton matériel sont stockés uniquement dans ce navigateur, sur cet ordinateur.
          </p>
          <div>
            {confirming ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small">Tout effacer définitivement ?</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    await clearAll();
                    await saveSettings(settings);
                    setConfirming(false);
                    toast.success('Projets et matériel effacés');
                  }}
                >
                  Oui, tout effacer
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                  Annuler
                </button>
              </div>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
                Effacer tous les projets et le matériel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
