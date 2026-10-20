// Builds data.js: every Dota 2 hero with its ability sound URLs from the Dota 2 Wiki.
// Run: node build-data.js
const fs = require('fs');

const UA = { 'User-Agent': 'DotaOfListen/1.0 (fan project)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJSON(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
    } catch {}
    await sleep(1500);
  }
  throw new Error('fetch failed: ' + url);
}

function parseAbilities(html) {
  const out = [];
  for (const block of html.split('class="ability-background"').slice(1)) {
    const name = (block.match(/text-shadow:1px 1px 2px #000;;">([^<]+)</) || [])[1];
    if (!name) continue;
    const sounds = [...block.split('<h2')[0].matchAll(/<source src="([^"]+)"/g)].map(m => m[1])
      .filter(u => !/\/Vo_/.test(u));
    if (!sounds.length) continue;
    const clean = name.replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
    if (out.some(a => a.name === clean)) continue;
    out.push({ name: clean, sounds: [...new Set(sounds)] });
  }
  return out;
}

// For heroes whose wiki page lacks ability sounds: find files named "<Hero>_<Ability>.mp3".
async function fallbackFiles(hero, existing) {
  const prefix = hero.replace(/ /g, '_') + '_';
  const j = await getJSON('https://dota2.fandom.com/api.php?action=query&list=allimages&aiprefix=' +
    encodeURIComponent(prefix) + '&ailimit=200&format=json');
  const groups = new Map();
  for (const img of j.query.allimages) {
    if (!/\.mp3$/i.test(img.name)) continue;
    let ab = img.name.slice(prefix.length).replace(/\.mp3$/i, '');
    if (/Artifact|intro|attack|move|Unleashed|death|spawn|Arcana|Persona|footstep|foley/i.test(ab)) continue;
    ab = ab.replace(/_\d+$/, '').replace(/_(cast|impact|loop|end|start|success|target|hit)$/i, '').replace(/_/g, ' ');
    if (!groups.has(ab)) groups.set(ab, []);
    groups.get(ab).push(img.url);
  }
  const extra = [...groups].map(([name, sounds]) => ({ name, sounds }))
    .filter(a => !existing.some(e => e.name === a.name));
  return existing.concat(extra);
}

(async () => {
  const heroes = await getJSON('https://api.opendota.com/api/heroes');
  heroes.sort((a, b) => a.localized_name.localeCompare(b.localized_name));
  const result = [];
  for (const h of heroes) {
    const page = h.localized_name.replace(/ /g, '_');
    try {
      const j = await getJSON(`https://dota2.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&redirects=1&format=json`);
      let abilities = j.parse ? parseAbilities(j.parse.text['*']) : [];
      if (abilities.length < 3) abilities = await fallbackFiles(h.localized_name, abilities);
      result.push({
        name: h.localized_name,
        img: h.name.replace('npc_dota_hero_', ''),
        attr: h.primary_attr,
        roles: h.roles,
        abilities,
      });
      console.log(`${h.localized_name}: ${abilities.length} abilities with sound`);
    } catch (e) {
      console.log(`${h.localized_name}: FAILED`);
    }
    await sleep(400);
  }
  fs.writeFileSync('data.js', 'window.HEROES = ' + JSON.stringify(result) + ';\n');
  console.log('Wrote', result.length, 'heroes');
})();
