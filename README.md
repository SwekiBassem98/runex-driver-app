# RUNEX Driver

Application mobile du livreur RUNEX (Expo SDK 57, Expo Router, React Native).
Elle travaille sur l'API RUNEX réelle ; un mode démonstration reste disponible.

## Ce que fait l'application

- **Connexion** par téléphone, matricule du véhicule, code livreur ou email.
  La session est gardée dans le trousseau du téléphone (expo-secure-store) et
  renouvelée automatiquement (jeton de 15 min + jeton de rafraîchissement).
- **Tournée du jour** (`GET /runsheets/driver/active`), compteurs de l'accueil, retours.
- **Scanner** : QR code ou code-barres du bon de livraison, ou saisie manuelle.
  Le code est envoyé tel quel à `POST /scan`, qui renvoie le colis et ce que le
  livreur peut en faire :
  - colis de sa tournée → fiche du colis, avec la pièce lue (« Pièce 2 / 3 ») ;
  - colis à collecter chez l'expéditeur d'un de ses ramassages → « Ajouter au ramassage » ;
  - refus clairs : étiquette illisible, colis inconnu, colis non affecté, pièce invalide.
- **Fiche colis** : livré, livraison partielle (pièces + montant encaissé), report, retour.
- **Ramassages** (`GET /ramassages/driver/active`) : colis comptés au scan, « Marquer comme récupéré ».
- **Profil** : identité, agence et matricule réels (`GET /drivers/me`). Les zones restent une
  préférence locale tant que la plateforme ne les gère pas.

Contrat de l'API : `docs/MOBILE-SCAN.md` dans le dépôt `runex-platforme`.

## Lancer en développement

```bash
npm install
npx expo start           # puis Expo Go sur le téléphone (même Wi-Fi que l'ordinateur)
```

L'API RUNEX doit tourner sur l'ordinateur (`npm run dev` dans `runex-platforme`, port 4000,
elle écoute sur toutes les interfaces). Sans `EXPO_PUBLIC_API_URL`, l'application vise
automatiquement `http://<IP de l'ordinateur>:4000/api/v1` (l'adresse qui sert Metro) ;
sur l'émulateur Android, `http://10.0.2.2:4000/api/v1`.

Variables (voir `.env.example`, à copier en `.env.local`) :

| Variable                | Rôle                                               |
| ----------------------- | -------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`   | URL de l'API (obligatoire en production, en HTTPS) |
| `EXPO_PUBLIC_USE_MOCKS` | `true` : données de démonstration, sans API        |

Après un changement de variable : `npx expo start --clear`.

Comptes de test (base seedée) : `50123456` / `Liv123!` (Hamza), `LIV-SOU-002` / `Liv123!`.

## Vérifications

```bash
npm run typecheck && npm run lint && npm run format:check
```

Test de bout en bout (build web contre l'API réelle seedée, navigateur Chromium) :

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1 npx expo export --clear --platform web --output-dir dist
# servir dist/ (ex. http://localhost:8090) et ajouter cette origine à CORS_ORIGIN de l'API
APP_URL=http://localhost:8090 API_URL=http://localhost:4000/api/v1 npm run e2e:web
```

Il couvre : connexion par téléphone, absence de requêtes en boucle sur chaque écran,
scan d'une étiquette de pièce → bonne fiche, livraison enregistrée, refus, ramassage
(scan, ajout, clôture), session conservée, profil réel.

## Build

Le scanner utilise la caméra (`expo-camera`, permission déclarée dans `app.json`).
Builds via EAS (`npx eas-cli@latest build`). En production, l'API doit être servie en HTTPS.
