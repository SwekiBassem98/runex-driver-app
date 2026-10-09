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

- **Sons et vibrations** (`src/services/feedback.ts`, expo-audio + expo-haptics) : bip au
  scan, son de réussite, arpège pour « Livré » et « Ramassage clôturé », double son grave
  au refus. Joués même en mode silencieux (iOS), mélangés à la musique ou au GPS en cours.
  Les mêmes sons que la plateforme web (`assets/sounds`). Réglage dans Profil → Sons et
  vibrations (son, volume, vibration, essai).

- **Notifications** (`src/services/push.ts`, expo-notifications + Firebase Cloud Messaging) :
  nouvelle tournée, colis ajouté ou retiré, ramassage affecté… arrivent sur le téléphone
  avec le son « Alertes RUNEX », même application fermée ou écran verrouillé. Toucher
  la notification ouvre l'écran concerné. Application ouverte, l'accueil, la tournée et
  les ramassages se rechargent seuls (notification reçue, retour dans l'application).

- **Identité** : icône RUNEX (icône adaptative Android avec version monochrome pour les
  icônes à thème), écran de démarrage natif anthracite, puis ouverture animée
  (`src/components/BrandSplash.tsx`) : traînées rouges, « R » sur halo, « RUNEX » avec reflet,
  « ESPACE LIVREUR », barre de chargement, fondu vers la connexion. Respecte « Réduire les
  animations ». Images régénérées depuis l'icône source :
  `python3 scripts/generate-brand-assets.py assets/brand/icon-source.jpg`.

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

| Variable                 | Rôle                                                |
| ------------------------ | --------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`    | URL de l'API (obligatoire en production, en HTTPS)  |
| `EXPO_PUBLIC_USE_MOCKS`  | `true` : données de démonstration (dev uniquement)  |
| `EXPO_PUBLIC_ALLOW_HTTP` | `true` : accepte une API http dans un build de test |

Après un changement de variable : `npx expo start --clear`.

Comptes de test (base seedée) : `50123456` / `Liv123!` (Hamza), `LIV-SOU-002` / `Liv123!`.

### Dépannage sur téléphone

- **« Serveur RUNEX injoignable (http://…:4000/api/v1) »** : le téléphone et le Mac
  doivent être sur le même Wi-Fi, l'API démarrée ; au premier lancement, macOS peut
  demander d'autoriser les connexions entrantes pour Node — accepter. L'adresse visée
  est affichée sous le bouton « Se connecter » en développement.
- Après un changement de branche ou de variable : `npx expo start --clear`.

## Vérifications

```bash
npm run typecheck && npm run lint && npm run format:check
```

Test de bout en bout (build web contre l'API réelle seedée, navigateur Chromium) :

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1 EXPO_PUBLIC_ALLOW_HTTP=true npx expo export --clear --platform web --output-dir dist
# servir dist/ (ex. http://localhost:8090) et ajouter cette origine à CORS_ORIGIN de l'API
APP_URL=http://localhost:8090 API_URL=http://localhost:4000/api/v1 npm run e2e:web
```

Il couvre : sons joués à chaque étape, largeurs 320 / 360 / 430 px, connexion par téléphone, absence de requêtes en boucle sur chaque écran,
scan d'une étiquette de pièce → bonne fiche, livraison enregistrée, refus, ramassage
(scan, ajout, clôture), session conservée, profil réel.

## Générer l'APK du livreur (Android)

L'APK est compilé par EAS Build (service d'Expo, offre gratuite suffisante) : aucun
Android Studio n'est nécessaire.

1. **Adresse de l'API** — dans `eas.json`, remplacer
   `https://REMPLACER-PAR-L-URL-KOYEB.koyeb.app/api/v1` (profils `preview` et `production`)
   par l'URL publique de l'API, **en HTTPS**, terminée par `/api/v1`.
   Une version compilée avec l'adresse d'exemple, une adresse `http://` ou sans adresse
   affiche un message d'erreur au lancement au lieu de l'écran de connexion.
2. **Firebase** (notifications) : `google-services.json` doit être à la racine du projet
   (console Firebase → application Android `tn.runex.driver` → télécharger). Il est public
   et se committe. Sans lui, le build échoue. La clé du **compte de service** (autre
   fichier JSON) va uniquement dans les variables de l'API : voir
   `docs/DEPLOIEMENT-PRODUCTION.md` § 5.1 dans `runex-platforme`.
3. **Compte Expo** (gratuit) : `npx eas-cli@latest login`.
4. **Premier build** : `npx eas-cli@latest build --platform android --profile preview`.
   Au premier lancement, accepter la création du projet EAS et laisser EAS **générer et
   conserver la clé de signature** (keystore). Ne jamais la supprimer : toutes les mises à
   jour doivent être signées avec la même clé, sinon Android refuse de les installer
   par-dessus l'ancienne version.
5. À la fin du build, EAS donne un lien et un QR code : télécharger le fichier `.apk`.
6. **Installation sur le téléphone du livreur** : envoyer le fichier (WhatsApp, Drive, câble),
   l'ouvrir, autoriser « Installer des applications inconnues » pour l'application qui l'ouvre,
   puis Installer. Play Protect peut avertir pour une application hors Play Store :
   « Plus de détails » → « Installer quand même ».
7. Le livreur se connecte avec son téléphone, son matricule, son code livreur ou son email,
   et le mot de passe créé par l'administrateur (Administration → Livreurs sur le web).

### Notifications : vérifier sur le téléphone

- À la première connexion, Android demande « Autoriser RUNEX Driver à envoyer des
  notifications ? » → **Autoriser**. Refusé par erreur : Paramètres → Applications →
  RUNEX Driver → Notifications → activer.
- Paramètres → Applications → RUNEX Driver → Notifications → « Alertes RUNEX » : son activé.
- Xiaomi, Huawei, Oppo, Realme… : Batterie → RUNEX Driver → « Aucune restriction »,
  sinon les notifications peuvent arriver en retard application fermée.
- Expo Go ne reçoit pas les notifications poussées (SDK 53+) : tester avec l'APK.

### Mettre à jour l'application

- Incrémenter `android.versionCode` dans `app.json` (1 → 2 → 3…) et, si souhaité,
  `version` (1.0.0 → 1.0.1). Android refuse une mise à jour dont le `versionCode` n'augmente pas.
- Relancer `npx eas-cli@latest build --platform android --profile preview`, distribuer
  le nouvel APK : il s'installe par-dessus l'ancien, la session du livreur est conservée.
- Changement d'adresse de l'API : modifier `eas.json` et recompiler (l'adresse est figée
  dans l'APK au moment du build).

### Sécurité de la version livrée

- API en HTTPS obligatoire (sinon message d'erreur bloquant) ; `EXPO_PUBLIC_ALLOW_HTTP=true`
  n'est destiné qu'aux tests locaux.
- Données de démonstration (`EXPO_PUBLIC_USE_MOCKS`) et galerie `_dev/components`
  désactivées hors développement.
- Jetons dans le trousseau chiffré du téléphone (expo-secure-store), sauvegarde Android
  désactivée (`allowBackup: false`), permissions inutiles bloquées (micro, stockage,
  superposition). Seule la caméra est demandée, pour le scanner.
- Une coupure réseau ne déconnecte pas le livreur : seule une session refusée par l'API
  (expirée après 7 jours sans usage, révoquée, compte désactivé) ramène à la connexion.

Le profil `production` produit un `.aab` pour une future publication sur le Play Store.
