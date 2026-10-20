// Builds data.js: every Dota 2 hero with sounds for its Q W E R abilities.
// Slots come from OpenDota constants; sounds come from the Dota 2 Wiki.
// Run: node build-data.js
const fs = require('fs');

const UA = { 'User-Agent': 'DotaOfListen/1.0 (fan project)' };
const WIKI = 'https://dota2.fandom.com/api.php';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => s.toLowerCase().replace(/&#39;|'/g, '').replace(/[^a-z0-9]/g, '');

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

// Ability sounds shown next to each ability header on a hero's wiki page.
function parseAbilities(html) {
  const out = new Map();
  for (const block of html.split('class="ability-background"').slice(1)) {
    const name = (block.match(/text-shadow:1px 1px 2px #000;;">([^<]+)</) || [])[1];
    if (!name) continue;
    const sounds = [...block.split('<h2')[0].matchAll(/<source src="([^"]+)"/g)].map(m => m[1])
      .filter(u => !/\/Vo_/.test(u));
    const key = norm(name.replace(/&amp;/g, '&'));
    if (sounds.length && !out.has(key)) out.set(key, { name: name.replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim(), sounds: [...new Set(sounds)] });
  }
  return out;
}

// Fallback: wiki files named "<Hero>_<Ability>*.mp3".
async function fileSounds(hero, ability) {
  const prefix = (hero + '_' + ability).replace(/ /g, '_');
  const j = await getJSON(`${WIKI}?action=query&list=allimages&aiprefix=${encodeURIComponent(prefix)}&ailimit=50&format=json`);
  return (j.query?.allimages || [])
    .filter(img => /\.mp3$/i.test(img.name) && !/Artifact|intro|Arcana|Persona/i.test(img.name))
    .map(img => img.url);
}

(async () => {
  const heroes = await getJSON('https://api.opendota.com/api/heroes');
  const heroAbilities = await getJSON('https://api.opendota.com/api/constants/hero_abilities');
  const abilityInfo = await getJSON('https://api.opendota.com/api/constants/abilities');
  heroes.sort((a, b) => a.localized_name.localeCompare(b.localized_name));

  const result = [];
  for (const h of heroes) {
    const slots = heroAbilities[h.name]?.abilities || [];
    // Standard layout: 0=Q 1=W 2=E 5=R (3 and 4 are D/F, usually hidden).
    const qwer = [slots[0], slots[1], slots[2], slots[5]].map(id => ({ id, name: abilityInfo[id]?.dname }));
    const page = h.localized_name.replace(/ /g, '_');
    let wiki = new Map();
    try {
      const j = await getJSON(`${WIKI}?action=parse&page=${encodeURIComponent(page)}&prop=text&redirects=1&format=json`);
      if (j.parse) wiki = parseAbilities(j.parse.text['*']);
    } catch {}

    const abilities = [];
    for (const a of qwer) {
      if (!a.name) { abilities.push({ name: '—', sounds: [] }); continue; }
      let sounds = wiki.get(norm(a.name))?.sounds || [];
      if (!sounds.length) { try { sounds = await fileSounds(h.localized_name, a.name); } catch {} }
      abilities.push({ name: a.name, sounds });
    }
    // Up to two extra abilities with sound (shard/scepter/invoked spells) become D and F.
    const used = new Set(qwer.map(a => a.name && norm(a.name)));
    const extra = [...wiki.entries()].filter(([k]) => !used.has(k)).slice(0, 2).map(([, v]) => v);
    abilities.push(...extra);
    const withSound = abilities.filter(a => a.sounds.length).length;
    console.log(`${h.localized_name}: ${abilities.map(a => a.name + (a.sounds.length ? '' : '(x)')).join(', ')}`);
    if (withSound >= 2) {
      result.push({ name: h.localized_name, img: h.name.replace('npc_dota_hero_', ''), attr: h.primary_attr, roles: h.roles, abilities });
    }
    await sleep(300);
  }
  fs.writeFileSync('data.js', 'window.HEROES = ' + JSON.stringify(result) + ';\n');
  console.log('Wrote', result.length, 'heroes');
})();
