#!/usr/bin/env node
/**
 * E2E — l'application livreur (build web) contre l'API RUNEX réelle.
 *
 * Parcours : connexion par téléphone → tournée → scan (saisie manuelle du code
 * imprimé sur le bon, étiquette de pièce « …-2 ») → fiche du bon colis avec la
 * pièce lue → « Marquer comme livré » ; ramassage : scan d'un colis chez
 * l'expéditeur → « Ajouter au ramassage » → « Marquer comme récupéré » ;
 * refus (inconnu, colis d'un autre livreur) ; session conservée au rechargement ;
 * profil réel (matricule).
 *
 * Prérequis : API RUNEX seedée (CORS_ORIGIN incluant l'URL du build web) et
 * build web servi :
 *   EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1 npx expo export --platform web --output-dir dist
 *   APP_URL=http://localhost:8090 API_URL=http://localhost:4000/api/v1 PUPPETEER_CORE=… node e2e/scan-flow.web.e2e.mjs
 */
const APP = (process.env.APP_URL ?? 'http://localhost:8090').replace(/\/+$/, '');
const API = (process.env.API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOTS = process.env.SHOTS ?? '';
const puppeteer = (await import(process.env.PUPPETEER_CORE ?? 'puppeteer-core')).default;

let pass = 0;
const failures = [];
const ok = (c, l, d = '') => {
  if (c) {
    pass++;
    console.log(`  ✔ ${l}`);
  } else {
    failures.push(l);
    console.log(`  ✘ ${l}${d ? ` — ${d}` : ''}`);
  }
  return c;
};
async function api(token, method, path, body) {
  const h = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(`${API}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j = null;
  try {
    j = await r.json();
  } catch {
    /* vide */
  }
  return { status: r.status, data: j?.data, json: j };
}
const login = async (e, p) =>
  (await api(null, 'POST', '/auth/login', { email: e, password: p })).data.accessToken;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Données : un colis 2 pièces dans la tournée de Hamza, un colis à ramasser.
const admin = await login('admin@logixpress.tn', 'Admin123!');
const exp = await login('expediteur@bluestar.tn', 'Exp123!');
const hamza = await login('livreur.hamza@logixpress.tn', 'Liv123!');
const hamzaId = (await api(hamza, 'GET', '/auth/me')).data.driverId;
const mk = async (name, pieces) =>
  (
    await api(exp, 'POST', '/colis', {
      customerName: name,
      customerPhone: '93329135',
      governorate: 'Ben Arous',
      delegation: 'Mohamadia',
      address: 'Rue E2E',
      totalPrice: 43,
      pieceCount: pieces,
      contentSummary: 'test e2e',
      allowOpen: true,
      isFragile: true,
    })
  ).data;
const P = await mk('Client Scan E2E', 2);
ok(
  (await api(admin, 'POST', `/colis/${P.id}/assign`, { driverId: hamzaId })).status === 200,
  'données : colis affecté au livreur'
);
const Q = await mk('Client Ramassage E2E', 1);
const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
// Un seul ramassage par créneau et par expéditeur : on prend le premier
// créneau libre, pour que le test reste rejouable sur la même base.
let pk;
for (const [from, to] of [
  [15, 17],
  [8, 10],
  [10, 12],
  [12, 14],
  [17, 19],
  [6, 8],
  [19, 21],
]) {
  pk = await api(admin, 'POST', '/ramassages', {
    shipperId: Q.shipperId,
    scheduledDate: demain,
    timeSlotStartHour: from,
    timeSlotEndHour: to,
    assignedDriverId: hamzaId,
    address: 'Zone industrielle, Ben Arous',
    estimatedPackageCount: 2,
  });
  if (pk.status !== 409 && !/déjà demandé/.test(pk.json?.message ?? '')) break;
}
ok(
  pk.status === 201 || pk.status === 200,
  'données : ramassage affecté au livreur',
  pk.json?.message
);
const ref = pk.data.referenceNumber;
const tous = (await api(admin, 'GET', '/colis?limit=100')).data;
const autre = tous.find((c) => c.assignedDriverId && c.assignedDriverId !== hamzaId);

// --- Navigateur, format téléphone.
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const errors = [];
// Sons joués, tracés par le service de retour sonore.
await page.evaluateOnNewDocument(() => {
  window.__runexSounds = [];
});
const played = () => page.evaluate(() => (window.__runexSounds || []).slice());
const clearSounds = () =>
  page.evaluate(() => {
    if (window.__runexSounds) window.__runexSounds.length = 0;
  });
const heard = async (kind, timeout = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await played()).includes(kind)) return true;
    await pause(150);
  }
  return false;
};
page.on('pageerror', (e) => errors.push(String(e)));
let apiCalls = 0;
page.on('request', (r) => {
  if (r.url().startsWith(API)) apiCalls++;
});
/** Aucun écran ne doit interroger l'API en boucle une fois affiché. */
async function quiet(label) {
  await pause(1500);
  const before = apiCalls;
  await pause(3000);
  ok(
    apiCalls - before <= 1,
    `${label} : pas de requêtes en boucle`,
    `${apiCalls - before} requêtes en 3 s`
  );
}
const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const bodyText = () => page.evaluate(() => document.body.innerText);
const waitText = (re, timeout = 10000) =>
  page
    .waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout }, re.source)
    .then(
      () => true,
      () => false
    );
async function tap(text) {
  const box = await page.evaluate((t) => {
    const all = [...document.querySelectorAll('div,span,button,a')].filter(
      (el) => el.innerText?.trim() === t && el.getClientRects().length > 0
    );
    const el = all[all.length - 1];
    if (!el) return null;
    // Hors de la barre du bas fixe : sinon le clic tombe sur elle.
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text);
  if (!box) return false;
  await page.mouse.click(box.x, box.y);
  return true;
}
async function typeInto(selector, value) {
  await page.waitForSelector(selector, { timeout: 8000, visible: true });
  await pause(400); // fin de l'animation de la feuille
  await page.$eval(selector, (el) => el.focus());
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(value);
}

console.log('\n0. Accès sans session');
await page.goto(`${APP}/runsheet/abc`, { waitUntil: 'networkidle2' });
ok(await waitText(/Téléphone ou Matricule/), 'lien profond sans session → écran de connexion');
await page.goto(`${APP}/home`, { waitUntil: 'networkidle2' });
ok(
  (await waitText(/Téléphone ou Matricule/)) && !(await bodyText()).includes('Test démo'),
  '/home sans session → connexion ; pas de bandeau « Test démo » hors démonstration'
);

console.log('\n1. Connexion');
await page.goto(APP, { waitUntil: 'networkidle2' });
ok(await waitText(/Téléphone ou Matricule/), 'écran de connexion');
// Serveur injoignable : message utile (adresse visée)
await page.setRequestInterception(true);
const block = (r) => (r.url().startsWith(API) ? r.abort() : r.continue());
page.on('request', block);
await typeInto('[data-testid="login-identifier"]', '50123456');
await typeInto('[data-testid="login-password"]', 'Liv123!');
await tap('Se connecter');
ok(
  await waitText(/injoignable|Impossible de contacter/),
  'API injoignable → message avec l’adresse du serveur'
);
page.off('request', block);
await page.setRequestInterception(false);
// Mauvais mot de passe
await typeInto('[data-testid="login-password"]', 'faux-mdp');
await tap('Se connecter');
ok(await waitText(/incorrect|invalide|Identifiants/i), 'mauvais mot de passe → message d’erreur');
ok(await heard('error'), 'son : connexion refusée → « error »', JSON.stringify(await played()));
ok(page.url().endsWith('/login'), 'reste sur la connexion');
// Saisie au clavier : identifiant, « suivant » vers le mot de passe, « valider »
await typeInto('[data-testid="login-identifier"]', '50123456');
await page.keyboard.press('Enter');
await pause(200);
ok(
  await page.evaluate(
    () => document.activeElement?.getAttribute('data-testid') === 'login-password'
  ),
  'Entrée sur l’identifiant → focus sur le mot de passe'
);
await typeInto('[data-testid="login-password"]', 'Liv123!');
await shot('01-login');
await page.keyboard.press('Enter');
if (!(await waitText(/Hamza/)))
  console.log('   [debug]', (await bodyText()).replace(/\n/g, ' | ').slice(0, 400));
ok(await waitText(/Hamza/), 'connecté : nom réel du livreur affiché');
ok(await heard('success'), 'son : connexion réussie → « success »');
await shot('02-home');
await quiet('accueil');
ok(
  /\b3\b/.test(await bodyText()) && (await bodyText()).includes('Total colis'),
  'accueil : compteurs de la tournée réelle'
);
await shot('02b-home-loaded');
for (const [route, label] of [
  ['runsheet', 'tournée'],
  ['retour', 'retours'],
  ['pickup', 'pickup'],
  ['profile', 'profil'],
  ['scanner', 'scanner'],
]) {
  await page.goto(`${APP}/${route}`, { waitUntil: 'domcontentloaded' });
  await quiet(label);
}

console.log('\n2. Scan d’une étiquette de pièce → fiche du colis');
await page.goto(`${APP}/scanner`, { waitUntil: 'networkidle2' });
ok(await waitText(/Tournée active \(\d+ colis\)/), 'scanner : tournée réelle chargée');
await tap('Saisie manuelle');
await typeInto('[data-testid="manual-code-input"]', `${P.barcode}-2`);
await shot('03-manual');
await tap('Valider et ouvrir');
ok(await waitText(/Pièce 2 \/ 2 scannée/), 'fiche ouverte avec « Pièce 2 / 2 scannée »');
ok(await heard('scan'), 'son : code reconnu → « scan »');
let t = await bodyText();
ok(
  t.includes('Client Scan E2E') &&
    t.includes(P.trackingNumber) &&
    t.includes('FRAGILE') &&
    t.includes('43.000 TND'),
  'bon colis : destinataire, numéro, FRAGILE, montant'
);
ok(page.url().includes(`/runsheet/${P.id}`), 'route /runsheet/<id du colis>');
await shot('04-parcel');
await clearSounds();
await tap('Marquer comme livré');
await pause(1500);
ok(await heard('complete'), 'son : livré → « complete »', JSON.stringify(await played()));
const apres = (await api(admin, 'GET', `/colis/${P.id}`)).data;
ok(
  apres.status === 'LIVRE' && apres.collectedAmount === 43,
  'livré via l’API, montant encaissé 43.000',
  `${apres.status} ${apres.collectedAmount}`
);

console.log('\n3. Refus');
await page.goto(`${APP}/scanner`, { waitUntil: 'networkidle2' });
await waitText(/Tournée/);
await tap('Saisie manuelle');
await typeInto('[data-testid="manual-code-input"]', '26010199999999');
await tap('Valider et ouvrir');
ok(await waitText(/Colis inconnu/), 'code inconnu → « Colis inconnu »');
ok(await heard('error'), 'son : refus → « error »');
if (autre) {
  await tap('Saisie manuelle');
  await typeInto('[data-testid="manual-code-input"]', autre.barcode);
  await tap('Valider et ouvrir');
  ok(await waitText(/ne vous est pas affecté/), 'colis d’un autre livreur → refus');
}
await tap('Saisie manuelle');
await typeInto('[data-testid="manual-code-input"]', 'xx$%');
await tap('Valider et ouvrir');
ok(await waitText(/Étiquette illisible/), 'code illisible → « Étiquette illisible »');
await shot('05-refus');

console.log('\n4. Ramassage chez l’expéditeur');
await tap('Saisie manuelle');
await typeInto('[data-testid="manual-code-input"]', Q.barcode);
await tap('Valider et ouvrir');
ok(await waitText(/Colis à ramasser/), 'scan → « Colis à ramasser »');
await pause(900); // feuille de saisie fermée, feuille de résultat ouverte
t = await bodyText();
ok(t.includes(ref) && t.includes('BlueStar'), 'ramassage et expéditeur affichés');
await shot('06-pickup-sheet');
await tap('Ajouter au ramassage');
ok(await waitText(/Colis ajouté au ramassage/), 'ajouté au ramassage');
ok(await heard('success'), 'son : ajout au ramassage → « success »');
const pk2 = (await api(admin, 'GET', `/ramassages/${ref}`)).data;
ok(pk2.actualPickedCount === 1, 'API : 1 colis rattaché', String(pk2.actualPickedCount));
await page.goto(`${APP}/pickup`, { waitUntil: 'networkidle2' });
ok(await waitText(new RegExp(ref)), 'écran Pickup : ramassage réel listé');
await tap('Détails');
await pause(600);
ok(await waitText(/Colis scannés : 1/), 'détail : « Colis scannés : 1 / 2 annoncés »');
await shot('07-pickup-detail');
await clearSounds();
await tap('Marquer comme récupéré');
await pause(1500);
ok(
  await heard('complete'),
  'son : ramassage clôturé → « complete »',
  JSON.stringify(await played())
);
ok(
  (await api(admin, 'GET', `/ramassages/${ref}`)).data.status === 'EFFECTUE',
  'ramassage clôturé (EFFECTUE)'
);

console.log('\n5. Navigation, session, déconnexion');
await page.goto(`${APP}/home`, { waitUntil: 'domcontentloaded' });
await waitText(/Total colis/);
const depth0 = await page.evaluate(() => history.length);
for (const t of ['Runsheet', 'Pickup', 'Retour', 'Profil', 'Runsheet']) {
  await tap(t);
  await pause(700);
}
const depth1 = await page.evaluate(() => history.length);
ok(
  depth1 - depth0 <= 1,
  'barre du bas : la pile ne grossit pas à chaque onglet',
  `${depth1 - depth0} entrées`
);
await page.goBack();
ok(await waitText(/Total colis/), 'retour depuis un onglet → accueil');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.goto(`${APP}/profile`, { waitUntil: 'domcontentloaded' });
ok(await waitText(/214 TUN 4512/), 'session conservée au rechargement ; matricule réel au profil');
await shot('08-profile');
ok(await waitText(/Sons et vibrations/), 'profil : réglage « Sons et vibrations »');
await page.$eval('[data-testid="feedback-sound-switch"]', (el) =>
  el.scrollIntoView({ block: 'center' })
);
await page.click('[data-testid="feedback-sound-switch"]');
await pause(300);
await clearSounds();
await tap('Scan');
await pause(500);
ok(
  !(await played()).includes('scan'),
  'sons coupés → aucun son joué',
  JSON.stringify(await played())
);
await page.$eval('[data-testid="feedback-sound-switch"]', (el) =>
  el.scrollIntoView({ block: 'center' })
);
await page.click('[data-testid="feedback-sound-switch"]');
await pause(300);
await tap('Scan');
ok(await heard('scan'), 'sons réactivés → « scan »');
page.once('dialog', (d) => d.accept());
await tap('Déconnexion');
ok(await waitText(/Téléphone ou Matricule/), 'déconnexion → écran de connexion');
await page.goto(`${APP}/home`, { waitUntil: 'domcontentloaded' });
ok(await waitText(/Téléphone ou Matricule/), 'après déconnexion, /home renvoie à la connexion');
const left = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k.startsWith('runex.session'))
);
ok(left.length === 0, 'session effacée du stockage');
console.log('\n6. Largeurs de téléphone');
await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
await typeInto('[data-testid="login-identifier"]', '50123456');
await typeInto('[data-testid="login-password"]', 'Liv123!');
await page.keyboard.press('Enter');
await waitText(/Total colis/);
for (const w of [320, 360, 430]) {
  await page.setViewport({
    width: w,
    height: 760,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  for (const route of [
    'home',
    'runsheet',
    'scanner',
    'pickup',
    'retour',
    'profile',
    `runsheet/${P.id}`,
  ]) {
    await page.goto(`${APP}/${route}`, { waitUntil: 'domcontentloaded' });
    await pause(1200);
    const over = await page.evaluate(() => {
      const W = window.innerWidth;
      const bad = [...document.querySelectorAll('div,span,input')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || r.right <= W + 1) return false;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (/(auto|scroll|hidden)/.test(s.overflowX) && p !== document.body) return false;
          }
          return true;
        })
        .map((el) => (el.innerText || el.tagName).trim().slice(0, 25));
      return { page: document.documentElement.scrollWidth - W, bad: bad.slice(0, 3) };
    });
    ok(
      over.page <= 1 && over.bad.length === 0,
      `${route} @${w}px : rien ne dépasse`,
      JSON.stringify(over)
    );
  }
}
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

ok(errors.length === 0, 'aucune erreur JavaScript', errors.join(' | '));

await browser.close();
console.log(`\n${pass} vérifications réussies, ${failures.length} échec(s)`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
