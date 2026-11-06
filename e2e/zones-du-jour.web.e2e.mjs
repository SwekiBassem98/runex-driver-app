#!/usr/bin/env node
/**
 * E2E — zones du livreur (build web de l'application contre l'API RUNEX).
 *
 *  1. Filtre « Zones » de la tournée : il filtre vraiment les colis — par zone
 *     de la plateforme, et par gouvernorat + délégation pour une adresse sans
 *     zone enregistrée ;
 *  2. Les zones valent pour la journée : le lendemain, « Mes zones » est vide
 *     (sur la plateforme et sur le téléphone), et le livreur les choisit à nouveau.
 *
 * Prérequis : API RUNEX seedée, build web servi (voir scan-flow.web.e2e.mjs) :
 *   APP_URL=http://localhost:8090 API_URL=http://localhost:4000/api/v1 DB_URL=… PUPPETEER_CORE=… node e2e/zones-du-jour.web.e2e.mjs
 */
import { execFileSync } from 'node:child_process';

const APP = (process.env.APP_URL ?? 'http://localhost:8090').replace(/\/+$/, '');
const API = (process.env.API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
const DB = process.env.DB_URL ?? 'postgresql://prod_owner:ownerpw@localhost:5432/runex_qa';
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
const sql = (q) => execFileSync('psql', [DB, '-qAtc', q], { encoding: 'utf8' }).trim();
const login = async (e, p) => (await api(null, 'POST', '/auth/login', { identifier: e, password: p })).data.accessToken;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Données : trois colis dans la tournée de Hamza, deux zones différentes.
const admin = await login('admin@logixpress.tn', 'Admin123!');
const hamza = await login('livreur.hamza@logixpress.tn', 'Liv123!');
const hamzaId = (await api(hamza, 'GET', '/auth/me')).data.driverId;
const bluestar = (await api(admin, 'GET', '/shippers?limit=50')).data.find((s) => s.code === 'EXP-BLUESTAR');
const hub = (await api(admin, 'GET', '/inter-depots/form-options')).data.deposits.find((d) => d.isMainHub);
const rs = (await api(hamza, 'GET', '/runsheets/driver/active')).data;
const sfx = Date.now().toString().slice(-4);
const nouveaux = [];
for (const [deleg, i] of [['Rades', 1], ['Rades', 2], ['Mégrine', 3]]) {
  const c = (
    await api(admin, 'POST', '/colis', {
      shipperId: bluestar.id,
      customerName: `Zone ${deleg} ${sfx}-${i}`,
      customerPhone: `9847${sfx}${i}`.slice(0, 8),
      governorate: 'Ben Arous',
      delegation: deleg,
      address: `Rue ${i}`,
      goodsPrice: 10 + i,
    })
  ).data;
  await api(admin, 'POST', '/depot/reception', { code: c.barcode, depositId: hub.id });
  const r = await api(admin, 'POST', `/runsheets/${rs.id}/add-package`, { packageIdentifier: c.trackingNumber });
  if (r.status >= 400) console.log('  (ajout tournée)', r.status, r.message);
  nouveaux.push(c);
}
const zoneRades = (await api(admin, 'GET', '/zones?search=Rades')).data.find((z) => z.delegation === 'Rades');
const zoneMegrine = (await api(admin, 'GET', '/zones?search=grine')).data.find((z) => /grine/.test(z.delegation));
ok(!!zoneRades && !!zoneMegrine, 'zones Rades et Mégrine créées avec les colis');
// Un colis ancien, dont l'adresse n'a pas de zone enregistrée (avant les zones).
sql(`UPDATE "CustomerAddress" SET "zoneId" = NULL WHERE id = (SELECT "customerAddressId" FROM "Package" WHERE id = '${nouveaux[1].id}')`);
// Zones du jour du livreur : Rades seulement.
await api(hamza, 'PUT', '/drivers/me/zones', { zoneIds: [zoneRades.id] });

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
async function tap(text) {
  const box = await page.evaluate((t) => {
    const all = [...document.querySelectorAll('div,span,button,a')].filter(
      (el) => el.innerText?.trim() === t && el.getClientRects().length > 0
    );
    const el = all[all.length - 1];
    if (!el) return null;
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
  await pause(400);
  await page.$eval(selector, (el) => el.focus());
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(value);
}
const visibles = (codes) => page.evaluate((cs) => cs.filter((c) => document.body.innerText.includes(c)), codes);

console.log('\n1. Connexion et tournée');
await page.goto(APP, { waitUntil: 'networkidle2' });
await typeInto('[data-testid="login-identifier"]', 'livreur.hamza@logixpress.tn');
await typeInto('[data-testid="login-password"]', 'Liv123!');
await tap('Se connecter');
ok(await waitText(/Bonjour|Tournée|Accueil/), 'connecté');
await page.goto(`${APP}/runsheet`, { waitUntil: 'networkidle2' });
ok(await waitText(new RegExp(nouveaux[2].trackingNumber), 15000), 'tournée : les nouveaux colis sont listés');
const codes = nouveaux.map((c) => c.trackingNumber);
ok((await visibles(codes)).length === 3, 'tous les colis visibles sans filtre');

console.log('\n2. Filtre par zone');
await tap('Toutes les Zones');
ok(await waitText(/Filtrer par Zone/), 'feuille « Filtrer par Zone » ouverte');
let t = await bodyText();
ok(/Ma zone du jour/.test(t) && t.includes(zoneRades.name), 'ma zone du jour (Rades) proposée en premier');
ok(t.includes(zoneMegrine.name) && /Zone des colis de la tournée/.test(t), 'zone d’un colis de la tournée (Mégrine) proposée aussi');
await shot('zones-filtre');
await tap(zoneRades.name);
await pause(800);
let vus = await visibles(codes);
ok(vus.includes(codes[0]) && vus.includes(codes[1]) && !vus.includes(codes[2]), 'filtre Rades : les 2 colis de Rades, pas celui de Mégrine', JSON.stringify(vus));
ok(vus.includes(codes[1]), 'colis sans zone enregistrée retrouvé par gouvernorat + délégation');
await tap(zoneRades.name);
await pause(400);
await tap(zoneMegrine.name);
await pause(800);
vus = await visibles(codes);
ok(vus.length === 1 && vus[0] === codes[2], 'filtre Mégrine : seulement son colis', JSON.stringify(vus));
await tap(zoneMegrine.name);
await pause(400);
await tap('Toutes les Zones');
await pause(800);
ok((await visibles(codes)).length === 3, '« Toutes les zones » : de nouveau tous les colis');

console.log('\n3. Zones du jour');
await page.goto(`${APP}/profile`, { waitUntil: 'networkidle2' });
ok(await waitText(/Mes zones aujourd’hui \(1\)/), 'profil : « Mes zones aujourd’hui (1) »');
ok((await bodyText()).includes(zoneRades.name), 'profil : Rades affichée');
// Minuit passé : la plateforme ne garde pas les zones d'hier…
sql(`UPDATE "DriverZone" SET "createdAt" = now() - interval '1 day' WHERE "driverId" = '${hamzaId}'`);
// …et le téléphone non plus : la session gardée date d'hier.
await page.evaluate(() => {
  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      const v = store.getItem(k);
      if (v && v.includes('"zonesDay"')) store.setItem(k, v.replace(/"zonesDay":"[0-9-]+"/g, '"zonesDay":"2000-01-01"'));
    }
  }
});
await page.reload({ waitUntil: 'networkidle2' });
ok(await waitText(/Mes zones aujourd’hui \(0\)/), 'lendemain : profil sans zones');
ok(/Aucune zone choisie aujourd’hui/.test(await bodyText()), 'lendemain : invite à choisir les zones du jour');
await shot('zones-lendemain');
await tap('Choisir mes zones du jour');
ok(await waitText(/Mes zones du jour/), 'écran « Mes zones du jour »');
ok(await waitText(/0 zone choisie aujourd’hui/), 'écran : aucune zone gardée de la veille');
await page.waitForSelector(`[aria-label="Ajouter la zone ${zoneMegrine.name}"]`, { timeout: 10000 });
await page.click(`[aria-label="Ajouter la zone ${zoneMegrine.name}"]`);
ok(await waitText(/1 zone choisie aujourd’hui/), 'nouvelle zone du jour choisie (Mégrine)');
const surPlateforme = (await api(hamza, 'GET', '/drivers/me/zones')).data;
ok(surPlateforme.length === 1 && surPlateforme[0].id === zoneMegrine.id, 'plateforme : seule la zone du jour (pas Rades d’hier)', JSON.stringify(surPlateforme.map((z) => z.name)));
await page.click(`[aria-label="Retirer la zone ${zoneMegrine.name}"]`);
ok(await waitText(/0 zone choisie aujourd’hui/), 'retrait de la dernière zone : permis (journée sans zone)');
ok(((await api(hamza, 'GET', '/drivers/me/zones')).data ?? []).length === 0, 'plateforme : plus aucune zone du jour');
await page.goto(`${APP}/runsheet`, { waitUntil: 'networkidle2' });
await waitText(new RegExp(codes[0]), 15000);
await tap('Toutes les Zones');
t = await bodyText();
ok(!/Ma zone du jour/.test(t) && t.includes(zoneRades.name), 'filtre : sans zone du jour, les zones des colis restent filtrables');

await browser.close();
ok(errors.length === 0, 'aucune erreur JavaScript', errors.join(' | '));
console.log(`\n${pass} réussis, ${failures.length} échoués`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
