#!/usr/bin/env node
/**
 * E2E — le livreur corrige un geste depuis la fiche du colis (build web de
 * l'application contre l'API RUNEX) :
 *   1. « Livré » par erreur → « Annuler « Livré » (erreur) » → de nouveau à livrer ;
 *   2. retour, puis le client veut son colis → « Le client veut son colis » → livré ;
 *   3. report par erreur → « Annuler le report (erreur) ».
 *
 *   APP_URL=http://localhost:8090 API_URL=http://localhost:4000/api/v1 PUPPETEER_CORE=… node e2e/corriger-action.web.e2e.mjs
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

const admin = await login('admin@logixpress.tn', 'Admin123!');
const hamza = await login('livreur.hamza@logixpress.tn', 'Liv123!');
const bluestar = (await api(admin, 'GET', '/shippers?limit=50')).data.find((s) => s.code === 'EXP-BLUESTAR');
const hub = (await api(admin, 'GET', '/inter-depots/form-options')).data.deposits.find((d) => d.isMainHub);
const rs = (await api(hamza, 'GET', '/runsheets/driver/active')).data;
const sfx = Date.now().toString().slice(-4);
const colis = [];
for (const i of [1, 2, 3]) {
  const c = (
    await api(admin, 'POST', '/colis', {
      shipperId: bluestar.id,
      customerName: `CA ${sfx}-${i}`,
      customerPhone: `9847${sfx}${i}`.slice(0, 8),
      governorate: 'Tunis',
      delegation: 'La Marsa',
      address: `Rue ${i}`,
      goodsPrice: 20 + i,
    })
  ).data;
  await api(admin, 'POST', '/depot/reception', { code: c.barcode, depositId: hub.id });
  await api(admin, 'POST', `/runsheets/${rs.id}/add-package`, { packageIdentifier: c.trackingNumber });
  await api(hamza, 'POST', `/colis/${c.id}/start`, {});
  colis.push(c);
}
const [livre, retour, reporte] = colis;
await api(hamza, 'POST', `/colis/${livre.id}/deliver`, { collectedAmount: Number(livre.totalPrice) });
await api(hamza, 'POST', `/colis/${retour.id}/return`, { reason: 'Refus de commande par le destinataire' });
await api(hamza, 'POST', `/colis/${reporte.id}/postpone`, { reason: 'Client absent' });
const statut = async (c) => (await api(admin, 'GET', `/colis/${c.id}`)).data?.status;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const waitText = (re, timeout = 10000) =>
  page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout }, re.source).then(
    () => true,
    () => false
  );
const clic = async (testId) => {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 8000, visible: true });
  await pause(400);
  await page.$eval(`[data-testid="${testId}"]`, (el) => el.click());
};
async function typeInto(selector, value) {
  await page.waitForSelector(selector, { timeout: 8000, visible: true });
  await page.$eval(selector, (el) => el.focus());
  await page.keyboard.type(value);
}
const fiche = async (c) => {
  await page.goto(`${APP}/runsheet/${c.id}`, { waitUntil: 'networkidle2' });
  await waitText(new RegExp(c.trackingNumber), 15000);
  await pause(600);
};

console.log('\n0. Connexion');
await page.goto(APP, { waitUntil: 'networkidle2' });
await typeInto('[data-testid="login-identifier"]', 'livreur.hamza@logixpress.tn');
await typeInto('[data-testid="login-password"]', 'Liv123!');
await page.keyboard.press('Enter');
ok(await waitText(/Bonjour|Tournée|Accueil/, 15000), 'connecté');

console.log('\n1. « Livré » par erreur');
await fiche(livre);
ok(/Aucune action de livraison/.test(await page.evaluate(() => document.body.innerText)), 'colis livré : plus d’actions de livraison');
await shot('corriger-livre');
await clic('corriger-erreur');
ok(await waitText(/Annuler ce geste/), 'confirmation : montant retiré de la caisse expliqué');
await shot('corriger-confirmation');
await typeInto('[data-testid="correction-note"]', 'Mauvais colis');
await clic('confirmer-correction');
ok(await waitText(/Action annulée/), 'message : « Action annulée : choisissez le bon geste »');
ok(await waitText(/Marquer comme livré/), 'actions de livraison de nouveau disponibles');
ok((await statut(livre)) === 'EN_COURS_LIVRAISON', 'plateforme : « En cours de livraison »');

console.log('\n2. Retour, puis le client veut son colis');
await fiche(retour);
await clic('relivrer');
ok(await waitText(/Livrer finalement ce colis/), 'confirmation « Livrer finalement ce colis ? »');
await clic('confirmer-correction');
ok(await waitText(/Colis remis en livraison/), 'message : « Colis remis en livraison »');
await shot('corriger-relivrer');
ok((await statut(retour)) === 'EN_COURS_LIVRAISON', 'plateforme : « En cours de livraison »');
await page.evaluate(() => [...document.querySelectorAll('div')].reverse().find((d) => d.innerText?.trim() === 'Marquer comme livré')?.click());
await pause(2500);
ok((await statut(retour)) === 'LIVRE', 'livré ensuite depuis l’application');

console.log('\n3. Report par erreur');
await fiche(reporte);
await clic('corriger-erreur');
await clic('confirmer-correction');
ok(await waitText(/Action annulée/), 'report annulé');
ok((await statut(reporte)) === 'EN_COURS_LIVRAISON', 'plateforme : « En cours de livraison »');

ok(errors.length === 0, 'aucune erreur JavaScript', errors.join(' | '));
await browser.close();
console.log(`\n${pass} réussis, ${failures.length} échoués`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
