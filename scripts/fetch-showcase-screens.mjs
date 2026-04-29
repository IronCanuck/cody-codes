/**
 * Fetches homepage screenshots (Microlink API) into public/showcase/*.png
 * Run: node scripts/fetch-showcase-screens.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'showcase');

const PROJECTS = [
  { key: 'podiumnation', url: 'https://www.podiumnation.com' },
  { key: 'growyoursport', url: 'https://www.growyoursport.com' },
  { key: 'podiumlab', url: 'https://www.thepodiumlab.com' },
  { key: 'podiumhq', url: 'https://www.podiumhq.co' },
  { key: 'wrestlingstudiopro', url: 'https://www.wrestlingstudiopro.com' },
  { key: 'wrestlingdualscoreboard', url: 'https://www.podiumwrestlinghq.com/' },
  { key: 'quadmeet', url: 'https://www.quadmeet.ca' },
  { key: 'calgaryopen', url: 'https://www.thecalgaryopen.com' },
  { key: 'spartaninvitational', url: 'https://www.spartaninvite.ca' },
  { key: 'spartanwrestling', url: 'https://www.spartanwrestling.ca' },
  { key: 'canadawrestlinghq', url: 'https://www.wrestlingtournaments.ca' },
  { key: 'firereportpro', url: 'https://www.firereportpro.com' },
  { key: 'digitalpivot', url: 'https://www.thedigitalpivot.ca' },
];

const DELAY_MS = 2000;

function apiUrlFor(target) {
  const u = new URL('https://api.microlink.io');
  u.searchParams.set('url', target);
  u.searchParams.set('screenshot', 'true');
  u.searchParams.set('meta', 'false');
  u.searchParams.set('viewport.width', '800');
  u.searchParams.set('viewport.height', '500');
  return u;
}

async function main() {
  await fs.promises.mkdir(outDir, { recursive: true });
  for (const p of PROJECTS) {
    const label = p.key;
    process.stdout.write(`Fetching ${label}... `);
    try {
      const r = await fetch(apiUrlFor(p.url));
      const json = await r.json();
      if (json.status !== 'success' || !json.data?.screenshot?.url) {
        console.log('skip (API)', JSON.stringify(json).slice(0, 200));
        continue;
      }
      const ir = await fetch(json.data.screenshot.url);
      if (!ir.ok) {
        console.log('skip (image)', ir.status);
        continue;
      }
      const buf = Buffer.from(await ir.arrayBuffer());
      const out = path.join(outDir, `${p.key}.png`);
      await fs.promises.writeFile(out, buf);
      console.log('ok', Math.round(buf.length / 1024) + ' KB');
    } catch (e) {
      console.log('error', e.message);
    }
    await new Promise((res) => setTimeout(res, DELAY_MS));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
