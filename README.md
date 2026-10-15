# Régie

Application pour agence événementielle : décris un événement, ajoute la photo du lieu et celles du matériel, et Régie génère un prompt prêt à coller dans ChatGPT Images.

## Lancer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173.

## Organisation

- `src/lib/engine.ts` : moteur de génération (analyse de la description, détection du matériel et des emplacements, hypothèses, prompt structuré).
- `src/pages/steps/` : les trois étapes (Mon événement, Mon matériel, Mon prompt).
- `src/lib/openrouter.ts` : génération du visuel via OpenRouter (Nano Banana 2 par défaut), activable dans Paramètres.
- `src/lib/storage.ts` : sauvegarde locale dans IndexedDB (projets, photos, matériel, paramètres).
