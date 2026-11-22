// YO-KA-MURAI - ALL game data lives here: sizes, tiers, fighters and arenas.
// To add a fighter: add an entry to FIGHTERS (stats + 3 abilities + ai + art) and an art spec in art.js. No core code changes.
'use strict';
const WORLD = { W: 800, H: 460, BASE_R: 14, BASE_SPEED: 165, ROUND_TIME: 99, ROUNDS_TO_WIN: 2 };

// Six size categories. hit = hitbox multiplier, speed = move speed multiplier, kb = knockback taken.
const SIZES = {
  small:    { idx: 0, label: 'Small',    hit: 0.5,  speed: 1.4,  hp: 60,  m1cd: 0.15, kb: 1.5 },
  medium:   { idx: 1, label: 'Medium',   hit: 0.75, speed: 1.2,  hp: 80,  m1cd: 0.2,  kb: 1.2 },
  human:    { idx: 2, label: 'Human',    hit: 1,    speed: 1.0,  hp: 100, m1cd: 0.2,  kb: 1.0 },
  ogre:     { idx: 3, label: 'Ogre',     hit: 1.6,  speed: 0.85, hp: 140, m1cd: 0.4,  kb: 0.7 },
  giant:    { idx: 4, label: 'Giant',    hit: 2.5,  speed: 0.7,  hp: 180, m1cd: 0.6,  kb: 0.4 },
  mountain: { idx: 5, label: 'Mountain', hit: 4,    speed: 0.55, hp: 250, m1cd: 0.8,  kb: 0.15 },
};

// Tier = overall power. dmg scales every hit the fighter deals.
const TIERS = {
  S: { color: '#f4c430', dmg: 1.12 },
  A: { color: '#a45ee5', dmg: 1.05 },
  B: { color: '#3d8fe6', dmg: 1.0 },
  C: { color: '#3fbf5a', dmg: 0.94 },
};

const FACTIONS = {
  warrior: { label: 'Warriors', color: '#2f6fd6' },
  yokai:   { label: 'Yokai',    color: '#d63a2f' },
};

/* Ability fields
   kind: melee | proj | guard | hook | charge | whirl | scatter | rush | roar | hand | tunnel
   melee shape: arc {range, arc(deg)} | line {range, width} | ring {range}
   windup/active/recover (s), cd (s), dmg, kb (knockback speed), hitstun, stun, slow{mul,t}, knockup (s airborne),
   pull (drag toward attacker), lunge (forward speed while active), cuts (cuts bamboo), moveMul (move speed while attacking)
*/
const FIGHTERS = {
  itsube: {
    id: 'itsube', name: 'Itsube', faction: 'warrior', size: 'human', tier: 'B', weapon: 'Katana',
    blurb: 'Calm wanderer. Read the attack, time the parry, punish.',
    a: { name: 'Jab', icon: 'thrust', kind: 'melee', shape: 'line', range: 60, width: 16, windup: 0.06, active: 0.06, recover: 0.04, cd: 0.2, dmg: 4.5, kb: 140, fx: 'thrust', pose: 'strike' },
    b: { name: 'Slash', icon: 'slash', kind: 'melee', shape: 'arc', range: 50, arc: 160, windup: 0.07, active: 0.06, recover: 0.04, cd: 0.2, dmg: 4, kb: 170, fx: 'slash', cuts: true, pose: 'strike2' },
    s: { name: 'Guard', icon: 'guard', kind: 'guard', window: 0.3, whiff: 0.2, cd: 2 },
    ai: { range: 90, style: 'counter' },
    art: 'itsube',
  },
};
const ROSTER = ['itsube'];

/* Arenas. Obstacles are circles: {kind, x, y, r, hp, solid, blocksProj, blocksLOS, cutOnly}.
   Zones: {kind:'pond', x, y, r}. cliffs: list of boundary segments that ring-out instead of acting as a wall. */
const ARENAS = {
  dojo: {
    id: 'dojo', name: 'Dojo', sub: 'Polished wood, paper walls',
    floor: '#a8763f', line: '#f3ead2', stands: '#3a2418',
    mats: [[22, 22, 96, 60], [682, 22, 96, 60], [22, 378, 96, 60], [682, 378, 96, 60]],
    build() {
      const o = [];
      for (const [x, y] of [[215, 110], [585, 110], [215, 350], [585, 350]]) o.push({ kind: 'pillar', x, y, r: 15, hp: 4 });
      for (const y of [62, 398]) for (let x = 330; x <= 470; x += 20) o.push({ kind: 'shoji', x, y, r: 10, hp: 1 });
      return { obstacles: o, zones: [] };
    },
  },
};
const ARENA_LIST = ['dojo'];
