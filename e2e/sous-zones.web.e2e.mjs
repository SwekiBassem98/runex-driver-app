#!/usr/bin/env node
/**
 * E2E — sous-zones du livreur (build web de l'application contre l'API RUNEX).
 *
 *  1. Appui long sur un colis : mode « choix » ; le livreur coche ses colis et
 *     leur donne une sous-zone. Ils passent en tête de la liste.
 *  2. Les sous-zones figurent dans le filtre « Zones », avec leur nombre de colis,
 *     et filtrent la liste.
 *  3. Sur la fiche d'un colis : ajouter, modifier, retirer sa sous-zone.
 *
 * Prérequis : API RUNEX seedée (avec PUT /colis/:id/sous-zone), build web servi :
 *   APP_URL=http://localhost:8090 API_URL=http://localhost:4000/api/v1 PUPPETEER_CORE=… node e2e/sous-zones.web.e2e.mjs
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
  const r = await fetch(`${API}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  let j = null;
  try {
    j = await r.json();
  } catch {
    /* vide */
  }
  return { status: r.status, data: j?.data, message: j?.message };
}
const login = async (e, p) => (await api(null, 'POST', '/auth/login', { identifier: e, password: p })).data.accessToken;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Données : trois colis dans la tournée de Hamza.
const admin = await login('admin@logixpress.tn', 'Admin123!');
const hamza = await login('livreur.hamza@logixpress.tn', 'Liv123!');
const bluestar = (await api(admin, 'GET', '/shippers?limit=50')).data.find((s) => s.code === 'EXP-BLUESTAR');
const hub = (await api(admin, 'GET', '/inter-depots/form-options')).data.deposits.find((d) => d.isMainHub);
const rs = (await api(hamza, 'GET', '/runsheets/driver/active')).data;
const sfx = Date.now().toString().slice(-4);
const nouveaux = [];
for (const i of [1, 2, 3]) {
  const c = (
    await api(admin, 'POST', '/colis', {
      shipperId: bluestar.id,
      customerName: `SZ ${sfx}-${i}`,
      customerPhone: `9848${sfx}${i}`.slice(0, 8),
      governorate: 'Tunis',
      delegation: 'La Marsa',
      address: `Rue ${i}`,
      goodsPrice: 10 + i,
    })
  ).data;
  await api(admin, 'POST', '/depot/reception', { code: c.barcode, depositId: hub.id });
  const r = await api(admin, 'POST', `/runsheets/${rs.id}/add-package`, { packageIdentifier: c.trackingNumber });
  if (r.status >= 400) console.log('  (ajout tournée)', r.status, r.message);
  nouveaux.push(c);
}
const codes = nouveaux.map((c) => c.trackingNumber);

// --- Navigateur, format téléphone.
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const bodyText = () => page.evaluate(() => document.body.innerText);
const waitText = (re, timeout = 10000) =>
  page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout }, re.source).then(
    () => true,
    () => false
  );
const centre = (text) =>
  page.evaluate((t) => {
    const all = [...document.querySelectorAll('div,span,button,a')].filter(
      (el) => el.innerText?.trim() === t && el.getClientRects().length > 0
    );
    const el = all[all.length - 1];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text);
async function tap(text) {
  const box = await centre(text);
  if (!box) return false;
  await page.mouse.click(box.x, box.y);
  return true;
}
async function appuiLong(text) {
  const box = await centre(text);
  if (!box) return false;
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await pause(800);
  await page.mouse.up();
  return true;
}
async function typeInto(selector, value) {
  await page.waitForSelector(selector, { timeout: 8000, visible: true });
  await pause(400);
  await page.$eval(selector, (el) => el.focus());
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(value);
}
/** Ordre d'affichage des colis (positions dans le texte de la page). */
const ordre = async () => {
  const t = await bodyText();
  return codes
    .map((c) => ({ c, i: t.indexOf(c) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.c);
};
const premierCode = async () => {
  const t = await bodyText();
  const m = t.match(/\b\d{12,14}\b/);
  return m?.[0] ?? null;
};
const sousZoneApi = async (c) =>
  ((await api(hamza, 'GET', '/runsheets/driver/active')).data.packages ?? []).find((p) => p.id === c.id)?.driverSubZone ?? null;

console.log('\n1. Connexion et tournée');
await page.goto(APP, { waitUntil: 'networkidle2' });
await typeInto('[data-testid="login-identifier"]', 'livreur.hamza@logixpress.tn');
await typeInto('[data-testid="login-password"]', 'Liv123!');
await tap('Se connecter');
ok(await waitText(/Bonjour|Tournée|Accueil/), 'connecté');
await page.goto(`${APP}/runsheet`, { waitUntil: 'networkidle2' });
ok(await waitText(new RegExp(codes[2]), 15000), 'tournée : les nouveaux colis sont listés');
ok(/Appui long sur un colis/.test(await bodyText()), 'aide : « Appui long sur un colis pour le ranger dans une sous-zone »');

console.log('\n2. Choisir des colis et leur donner une sous-zone');
ok(await appuiLong(codes[1]), 'appui long sur le 2e colis');
ok(await waitText(/1 colis choisi/), 'mode choix : « 1 colis choisi »');
await tap(codes[2]);
ok(await waitText(/2 colis choisis/), 'appui simple en mode choix : 2e colis coché (pas d’ouverture de la fiche)');
await shot('sous-zones-choix');
await page.click('[data-testid="choix-sous-zone"]');
ok(await waitText(/2 colis choisis · ils passeront en tête/), 'fenêtre « Sous-zone » ouverte pour 2 colis');
await typeInto('[data-testid="sous-zone-saisie"]', 'Rue de Marseille');
await shot('sous-zones-saisie');
await page.click('[data-testid="sous-zone-enregistrer"]');
ok(await waitText(/Rue de Marseille/, 10000), 'sous-zone affichée sur les colis');
await pause(1200);
ok(!/colis choisi/.test(await bodyText()), 'mode choix fermé après l’enregistrement');
ok((await sousZoneApi(nouveaux[1])) === 'Rue de Marseille' && (await sousZoneApi(nouveaux[2])) === 'Rue de Marseille', 'plateforme : sous-zone enregistrée sur les 2 colis');
const o = await ordre();
ok(o[0] === codes[1] && o[1] === codes[2] && o[2] === codes[0], 'les colis rangés passent avant le colis sans sous-zone', JSON.stringify(o));
const premier = await premierCode();
ok(premier === codes[1] || premier === codes[2], 'un colis de la sous-zone est le premier de la liste', String(premier));
await shot('sous-zones-liste');

console.log('\n3. Filtre « Zones »');
await tap('Toutes les Zones');
ok(await waitText(/Mes sous-zones|MES SOUS-ZONES/), 'filtre : rubrique « Mes sous-zones »');
const t = await bodyText();
ok(/Rue de Marseille\s*Ma sous-zone\s*2/.test(t), 'sous-zone proposée avec son nombre de colis (2)', t.slice(t.indexOf('Mes sous-zones'), t.indexOf('Mes sous-zones') + 80));
await shot('sous-zones-filtre');
await page.click('[data-testid="filtre-sous-zone-Rue de Marseille"]');
await pause(800);
let vus = await ordre();
ok(vus.length === 2 && !vus.includes(codes[0]), 'filtre sous-zone : seulement ses 2 colis', JSON.stringify(vus));
ok(/Sous-zone : Rue de Marseille/.test(await bodyText()), 'filtre actif affiché');
await tap('Sous-zone : Rue de Marseille');
await pause(400);
await tap('Toutes les Zones');
await pause(800);
ok((await ordre()).length === 3, '« Toutes les zones » : de nouveau les 3 colis');

console.log('\n4. Fiche du colis : ajouter, modifier, retirer');
await tap(codes[0]);
ok(await waitText(/Ranger dans une sous-zone/, 10000), 'fiche : « Ranger dans une sous-zone »');
await page.click('[data-testid="sous-zone-colis"]');
ok(await waitText(/Mes sous-zones/), 'les sous-zones de la tournée sont proposées');
await typeInto('[data-testid="sous-zone-saisie"]', 'Centre');
await page.click('[data-testid="sous-zone-enregistrer"]');
ok(await waitText(/Sous-zone : Centre/), 'sous-zone ajoutée sur la fiche');
ok((await sousZoneApi(nouveaux[0])) === 'Centre', 'plateforme : « Centre »');
await page.click('[data-testid="sous-zone-colis"]');
await typeInto('[data-testid="sous-zone-saisie"]', 'Zitouna');
await page.click('[data-testid="sous-zone-enregistrer"]');
ok(await waitText(/Sous-zone : Zitouna/), 'sous-zone modifiée');
await page.goto(`${APP}/runsheet`, { waitUntil: 'networkidle2' });
await waitText(new RegExp(codes[0]), 15000);
await pause(800);
let ord = await ordre();
ok(ord[0] === codes[1] && ord[1] === codes[2] && ord[2] === codes[0], 'tri : sous-zones par ordre alphabétique (Rue de Marseille, puis Zitouna)', JSON.stringify(ord));
await tap(codes[0]);
await waitText(/Sous-zone : Zitouna/, 10000);
await page.click('[data-testid="sous-zone-colis"]');
await page.waitForSelector('[data-testid="sous-zone-retirer"]', { timeout: 5000, visible: true });
await pause(600);
await page.$eval('[data-testid="sous-zone-retirer"]', (el) => el.click());
ok(await waitText(/Ranger dans une sous-zone/), 'sous-zone retirée');
ok((await sousZoneApi(nouveaux[0])) === null, 'plateforme : plus de sous-zone');

ok(errors.length === 0, 'aucune erreur JavaScript', errors.join(' | '));
await browser.close();
console.log(`\n${pass} réussis, ${failures.length} échoués`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
