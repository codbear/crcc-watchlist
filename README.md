# Liste des streamers event caritatif CRCC

## 1) Installer

```bash
npm install
```

## 2) Configurer Twitch

1. Copiez `.env.example` vers `.env`
2. Renseignez :
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`

Ces valeurs proviennent de votre application Twitch Developer.

## 3) Ajouter vos pseudos

Modifiez la liste `STREAMERS` dans `public/app.js`.

## 4) Lancer

```bash
npm start
```

Puis ouvrez `http://localhost:3000`.

## Fonctionnement

- Section **Streamers en live**: cartes avec aperçu, titre, jeu, spectateurs.
- Section **Streamers hors live**: liste simple des chaînes offline.
