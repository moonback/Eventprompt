import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { FORMAT_LABELS, PERSPECTIVE_LABELS } from '../lib/engine';
import { checkKey, GenerationError, IMAGE_MODELS, RESOLUTION_LABELS } from '../lib/openrouter';
import { useSettings } from '../lib/settings';
import { clearAll, saveSettings } from '../lib/storage';
import type { ImageFormat, ImageResolution, Perspective } from '../lib/types';

function ImageGenSettings() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [showKey, setShowKey] = useState(false);
  const [check, setCheck] = useState<{ state: 'idle' | 'checking' | 'ok' | 'error'; text?: string }>({ state: 'idle' });

  const verify = async () => {
    setCheck({ state: 'checking' });
    try {
      const info = await checkKey(settings.openrouterKey);
      setCheck({
        state: 'ok',
        text: info.remaining !== null ? `Clé valide · crédit restant : ${info.remaining.toFixed(2)} $` : 'Clé valide',
      });
    } catch (e) {
      setCheck({ state: 'error', text: e instanceof GenerationError ? e.message : 'Vérification impossible.' });
    }
  };

  return (
    <div className="card card-pad stack">
      <div className="toggle-row" style={{ padding: 0 }}>
        <div>
          <h2 className="section-title">Générer les images avec OpenRouter</h2>
          <p className="hint" style={{ margin: '4px 0 0' }}>
            Après le prompt, crée directement le visuel avec Nano Banana 2, sans passer par ChatGPT.
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.imageGenEnabled}
            onChange={(e) => {
              update({ imageGenEnabled: e.target.checked });
              toast.success(e.target.checked ? 'Génération d’images activée' : 'Génération d’images désactivée');
            }}
            aria-label="Générer les images avec OpenRouter"
          />
          <span className="track" />
        </label>
      </div>

      {settings.imageGenEnabled && (
        <>
          <div className="field">
            <label className="label" htmlFor="or-key">Clé API OpenRouter</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="or-key"
                className="input"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={settings.openrouterKey}
                placeholder="sk-or-v1-…"
                onChange={(e) => {
                  update({ openrouterKey: e.target.value.trim() });
                  setCheck({ state: 'idle' });
                }}
              />
              <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}>
                {showKey ? <EyeOff /> : <Eye />}
              </button>
              <button type="button" className="btn btn-secondary" disabled={!settings.openrouterKey || check.state === 'checking'} onClick={verify}>
                {check.state === 'checking' ? <Loader2 className="spin" /> : null}
                Vérifier la clé
              </button>
            </div>
            {check.state === 'ok' && <span className="small" style={{ color: 'var(--success)' }}>{check.text}</span>}
            {check.state === 'error' && <span className="small" style={{ color: 'var(--danger)' }}>{check.text}</span>}
            <span className="hint">
              Crée une clé sur{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="link-btn">openrouter.ai/keys</a>. Elle reste
              enregistrée dans ce navigateur uniquement. Chaque image est facturée sur ton compte OpenRouter.
            </span>
          </div>
          <div className="row2">
            <div className="field">
              <label className="label" htmlFor="or-model">Modèle</label>
              <select id="or-model" className="select" value={settings.imageModel} onChange={(e) => update({ imageModel: e.target.value })}>
                {IMAGE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="or-res">Résolution</label>
              <select id="or-res" className="select" value={settings.imageResolution} onChange={(e) => update({ imageResolution: e.target.value as ImageResolution })}>
                {Object.entries(RESOLUTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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

        <ImageGenSettings />

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
