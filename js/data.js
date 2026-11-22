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
FIGHTERS.kodama = {
 id:'kodama',name:'Kodama',faction:'yokai',size:'small',tier:'A',weapon:'Forest spirit',art:'kodama',
 blurb:'Fast forest spirit. Harass with seeds and escape among decoys.',
 a:{name:'Headbutt',icon:'thrust',kind:'melee',shape:'line',range:30,width:14,windup:0.03,active:0.05,recover:0.03,cd:0.15,dmg:2.8,kb:65},
 b:{name:'Seed Flick',icon:'slash',kind:'proj',proj:'seed',speed:380,life:0.7,radius:3,windup:0.03,active:0.03,recover:0.04,cd:0.15,dmg:1.8,kb:35},
 s:{name:'Echo Scatter',icon:'guard',kind:'scatter',cd:8},ai:{range:180,style:'kite'}
};

FIGHTERS.hayate = {"id":"hayate","name":"Hayate","faction":"warrior","size":"medium","tier":"A","weapon":"Kusarigama","blurb":"Hook foes or zip to larger targets.","a":{"name":"Sickle Slash","icon":"slash","kind":"melee","shape":"arc","arc":130,"range":38,"dmg":3,"cd":0.15,"kb":180,"windup":0.033,"active":0.07,"recover":0.0375,"cuts":true},"b":{"name":"Chain Whip","icon":"slash","kind":"melee","shape":"line","arc":130,"range":115,"dmg":4,"cd":0.3,"kb":180,"windup":0.066,"active":0.07,"recover":0.075,"cuts":true,"width":15},"s":{"name":"Kusari Hook","kind":"hook","cd":6,"icon":"guard"},"ai":{"range":85,"style":"rush"},"art":"hayate"};
FIGHTERS.suzume = {"id":"suzume","name":"Suzume","faction":"warrior","size":"human","tier":"A","weapon":"Yumi longbow","blurb":"Keep your distance and charge piercing arrows.","a":{"name":"Quick Shot","icon":"thrust","kind":"proj","proj":"arrow","cd":0.3,"speed":580,"life":1.1,"dmg":5,"kb":80,"windup":0.06,"active":0.03,"recover":0.07},"b":{"name":"Bow Bash","icon":"slash","kind":"melee","shape":"arc","arc":130,"range":43,"dmg":3,"cd":0.3,"kb":360,"windup":0.066,"active":0.07,"recover":0.075,"cuts":true},"s":{"name":"Piercing Shot","kind":"charge","cd":8,"icon":"guard"},"ai":{"range":280,"style":"kite"},"art":"suzume"};
FIGHTERS.okuma = {"id":"okuma","name":"Ōkuma","faction":"warrior","size":"ogre","tier":"A","weapon":"ō-kama war scythe","blurb":"Pull opponents into a sweeping death whirl.","a":{"name":"Reap","icon":"slash","kind":"melee","shape":"arc","arc":180,"range":90,"dmg":8,"cd":0.45,"kb":180,"windup":0.099,"active":0.07,"recover":0.1125,"cuts":true},"b":{"name":"Hook Pull","icon":"slash","kind":"melee","shape":"line","arc":130,"range":100,"dmg":6,"cd":0.45,"kb":180,"windup":0.099,"active":0.07,"recover":0.1125,"cuts":true,"width":24,"pull":65},"s":{"name":"Death Whirl","kind":"whirl","cd":9,"icon":"guard"},"ai":{"range":80,"style":"rush"},"art":"okuma"};
FIGHTERS.kappa = {"id":"kappa","name":"Kappa","faction":"yokai","size":"medium","tier":"C","weapon":"Claws","blurb":"Control space with water and rushing trails.","a":{"name":"Claw Swipe","icon":"slash","kind":"melee","shape":"arc","arc":130,"range":43,"dmg":4,"cd":0.2,"kb":180,"windup":0.044000000000000004,"active":0.07,"recover":0.05,"cuts":true},"b":{"name":"Water Spit","icon":"thrust","kind":"proj","proj":"water","cd":0.2,"speed":350,"life":0.85,"dmg":2.5,"kb":80,"windup":0.06,"active":0.03,"recover":0.07,"slow":{"mul":0.8,"t":1}},"s":{"name":"River Rush","kind":"rush","cd":7,"icon":"guard"},"ai":{"range":150,"style":"kite"},"art":"kappa"};
FIGHTERS.akaoni = {"id":"akaoni","name":"Akaoni","faction":"yokai","size":"ogre","tier":"B","weapon":"Kanabō iron club","blurb":"Close the gap and shake the arena.","a":{"name":"Club Smash","icon":"slash","kind":"melee","shape":"arc","arc":130,"range":80,"dmg":10,"cd":0.4,"kb":180,"windup":0.18,"active":0.07,"recover":0.1,"cuts":true,"heavy":true},"b":{"name":"Shoulder Barge","icon":"slash","kind":"melee","shape":"arc","arc":130,"range":55,"dmg":6,"cd":0.4,"kb":400,"windup":0.08800000000000001,"active":0.15,"recover":0.1,"cuts":true,"lunge":260},"s":{"name":"Oni Roar","kind":"roar","cd":9,"icon":"guard"},"ai":{"range":60,"style":"rush"},"art":"akaoni"};
FIGHTERS.gashadokuro = {"id":"gashadokuro","name":"Gashadokuro","faction":"yokai","size":"giant","tier":"A","weapon":"Bone hands","blurb":"Throw foes and summon a rising skeletal hand.","a":{"name":"Bone Swipe","icon":"slash","kind":"melee","shape":"arc","arc":150,"range":140,"dmg":12,"cd":0.6,"kb":180,"windup":0.132,"active":0.07,"recover":0.15,"cuts":true},"b":{"name":"Grasp","icon":"slash","kind":"melee","shape":"line","arc":130,"range":150,"dmg":9,"cd":0.6,"kb":180,"windup":0.132,"active":0.07,"recover":0.15,"cuts":true,"width":35,"throwIt":true},"s":{"name":"Rising Hand","kind":"hand","cd":10,"icon":"guard"},"ai":{"range":130,"style":"counter"},"art":"gashadokuro"};
FIGHTERS.orochi = {"id":"orochi","name":"Yamata no Orochi","faction":"yokai","size":"mountain","tier":"S","weapon":"Eight heads","blurb":"Tunnel beneath the arena and erupt in a ring.","a":{"name":"Sweep","icon":"slash","kind":"melee","shape":"arc","arc":170,"range":195,"dmg":16,"cd":0.8,"kb":180,"windup":0.17600000000000002,"active":0.07,"recover":0.2,"cuts":true},"b":{"name":"Jab","icon":"slash","kind":"melee","shape":"line","arc":130,"range":215,"dmg":18,"cd":0.8,"kb":180,"windup":0.17600000000000002,"active":0.07,"recover":0.2,"cuts":true,"width":48},"s":{"name":"Tunnel","kind":"tunnel","cd":12,"icon":"guard"},"ai":{"range":165,"style":"rush"},"art":"orochi"};
const ROSTER = ['kodama','hayate','kappa','itsube','suzume','okuma','akaoni','gashadokuro','orochi'];

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

