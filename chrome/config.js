'use strict';

const coefficientRules = [
  { name: 'Heavy Charge 1BW', expected: 4, from: { physCoeff: 5.789, flatPhys: 1337, attrCoeff: 8.6834, flatAttr: 747 }, to: { physCoeff: 5.7895, flatPhys: 1601, attrCoeff: 8.6842, flatAttr: 872 } },
  { name: 'Heavy Charge 2BW', expected: 4, from: { physCoeff: 7.2362, flatPhys: 1671, attrCoeff: 10.8543, flatAttr: 934 }, to: { physCoeff: 7.2368, flatPhys: 2002, attrCoeff: 10.8553, flatAttr: 1090 } },
  { name: 'Varied Combo 2BW', expected: 2, from: { physCoeff: 2.6338, flatPhys: 609, attrCoeff: 3.9507, flatAttr: 340 }, to: { physCoeff: 2.6343, flatPhys: 729, attrCoeff: 3.9514, flatAttr: 397 } },
  { name: 'Ground Slam 2BW', expected: 1, from: { physCoeff: 1.6461, flatPhys: 380, attrCoeff: 2.4692, flatAttr: 212 }, to: { physCoeff: 1.6464, flatPhys: 455, attrCoeff: 2.4696, flatAttr: 248 } },
  { name: 'Spear Special', expected: 2, from: { physCoeff: 1.0757, flatPhys: 249, attrCoeff: 1.6135, flatAttr: 139 }, to: { physCoeff: 1.13, flatPhys: 313, attrCoeff: 1.695, flatAttr: 171 } },
  { name: 'Spear Special Cancel', expected: 2, from: { physCoeff: 0.32271, flatPhys: 74.7, attrCoeff: 0.48405, flatAttr: 41.7 }, to: { physCoeff: 0.339, flatPhys: 93.9, attrCoeff: 0.5085, flatAttr: 51.3 } },
  { name: 'Spear Q', expected: 1, from: { physCoeff: 0.3146, flatPhys: 74, attrCoeff: 0.4719, flatAttr: 41 }, to: { physCoeff: 0.3151, flatPhys: 88, attrCoeff: 0.4726, flatAttr: 48 } },
  { name: 'Fire Breath 1-Hit', expected: 2, from: { physCoeff: 1.3601, flatPhys: 183.5, attrCoeff: 2.04015, flatAttr: 0 }, to: { physCoeff: 2.7208, flatPhys: 391, attrCoeff: 0, flatAttr: 0 } },
  { name: 'Flute Ripple', expected: 1, from: { physCoeff: 1.4614, flatPhys: 300, attrCoeff: 2.1921, flatAttr: 0 }, to: { physCoeff: 0.7348, flatPhys: 155, attrCoeff: 0, flatAttr: 0 } },
  { name: 'Poet 1', skillName: 'Poet1', expected: 1, from: { physCoeff: 1.023, flatPhys: 138, attrCoeff: 1.5345, flatAttr: 0 }, to: { physCoeff: 1.0231, flatPhys: 146, attrCoeff: 0, flatAttr: 0 } },
  { name: 'Poet 2', skillName: 'Poet2', expected: 1, from: { physCoeff: 1.023, flatPhys: 138, attrCoeff: 1.5345, flatAttr: 0 }, to: { physCoeff: 1.0231, flatPhys: 146, attrCoeff: 0, flatAttr: 0 } },
  { name: 'Poet Final Hit', expected: 1, from: { physCoeff: 1.705, flatPhys: 230, attrCoeff: 2.5575, flatAttr: 0 }, to: { physCoeff: 1.7052, flatPhys: 244, attrCoeff: 0, flatAttr: 0 } }
];
const gameplayDefaults = {
  'Heavy Charge 1BW': { hitCount: 2, timingSeconds: 3.766, notes: 'Cancel: 2.93s; Perception: 1.75s; Perception Cancel: 1.12s.' },
  'Heavy Charge 2BW': { hitCount: 2, timingSeconds: 3.766, notes: 'Cancel: 2.93s; Perception: 1.75s; Perception Cancel: 1.12s.' },
  'Varied Combo 2BW': { hitCount: 1, timingSeconds: 1, notes: 'Cancel variant: 0.62s.' },
  'Ground Slam 2BW': { hitCount: 1, timingSeconds: 0, notes: 'Triggered follow-up; no separate cast time.' },
  'Spear Special': { hitCount: 1, timingSeconds: 0.816, notes: '' },
  'Spear Special Cancel': { hitCount: 1, timingSeconds: 0.816, notes: 'Uses 30% of the full Spear Special damage.' },
  'Spear Q': { hitCount: 1, timingSeconds: 1, notes: '' },
  'Fire Breath 1-Hit': { hitCount: 1, timingSeconds: 0.6667, notes: 'Prepull variant has 0s cast time.' },
  'Flute Ripple': { hitCount: 5, timingSeconds: 12.5, notes: 'One ripple every 2.5s; first ripple after 2.5s.' },
  'Poet 1': { hitCount: 1, timingSeconds: 0.4833, notes: '' },
  'Poet 2': { hitCount: 1, timingSeconds: 0.55, notes: '' },
  'Poet Final Hit': { hitCount: 1, timingSeconds: 0.7833, notes: '' }
};
for (const rule of coefficientRules) rule.gameplay = gameplayDefaults[rule.name];

const innerWayRules = [
  { name:'Morale Chant', key:'moraleChant', from:{ tier4:{minPhys:23.6,maxPhys:47.2}, tier5:{minPhys:23.6,maxPhys:47.2,directCrit:0.046}, tier6:{minPhys:23.6,maxPhys:47.2,directCrit:0.046} }, to:{ tier4:{minPhys:23.6,maxPhys:47.2}, tier5:{minPhys:23.6,maxPhys:47.2,directCrit:0.046}, tier6:{minPhys:23.6,maxPhys:47.2,directCrit:0.046} }, patches:[] },
  { name:'Seasonal Edge', key:'seasonalEdge', from:{ tier4:{minPhys:23.6,maxPhys:47.2}, tier5:{minPhys:23.6,maxPhys:47.2,physDmgBonus:0.028}, tier6:{minPhys:23.6,maxPhys:47.2,physDmgBonus:0.028} }, to:{ tier4:{minPhys:23.6,maxPhys:47.2}, tier5:{minPhys:23.6,maxPhys:47.2,physDmgBonus:0.028}, tier6:{minPhys:23.6,maxPhys:47.2,physDmgBonus:0.028} }, patches:[] },
  { name:'Breaking Point', key:'breakingPoint', from:{ tier4:{precision:0.065}, tier5:{precision:0.065,directCrit:0.041}, tier6:{precision:0.065,directCrit:0.041} }, to:{ tier4:{precision:0.065}, tier5:{precision:0.065,directCrit:0.041}, tier6:{precision:0.065,directCrit:0.041} }, patches:[] },
  { name:'Fivefold Bleed', key:'fivefoldBleed', from:{ tier4:{maxPhys:56.7}, tier5:{maxPhys:56.7,critDmg:0.035}, tier6:{maxPhys:56.7,critDmg:0.035} }, to:{ tier4:{maxPhys:56.7}, tier5:{maxPhys:56.7,critDmg:0.035}, tier6:{maxPhys:56.7,critDmg:0.035} }, patches:[] },
  { name:'Invigorated Warrior', key:'invigoratedWarrior', from:{ tier4:{minPhys:63.8}, tier5:{minPhys:63.8,physPen:5.1}, tier6:{minPhys:63.8,physPen:5.1} }, to:{ tier4:{minPhys:63.8}, tier5:{minPhys:63.8,physPen:5.1}, tier6:{minPhys:63.8,physPen:5.1} }, patches:[] },
  { name:'Exquisite Scenery', key:'exquisiteScenery', from:{ tier4:{crit:0.082}, tier5:{crit:0.082,critDmg:0.044}, tier6:{crit:0.082,critDmg:0.044} }, to:{ tier4:{crit:0.086}, tier5:{crit:0.086,critDmg:0.044}, tier6:{crit:0.086,critDmg:0.044} }, patches:[{field:'crit',from:0.082,to:0.086,expected:4}] },
  { name:'Battle Anthem', key:'battleAnthem', from:{ tier4:{affinity:0.037}, tier5:{affinity:0.037,affinityDmgBonus:0.052}, tier6:{affinity:0.037,affinityDmgBonus:0.052} }, to:{ tier4:{affinity:0.039}, tier5:{affinity:0.039,affinityDmgBonus:0.052}, tier6:{affinity:0.039,affinityDmgBonus:0.052} }, patches:[{field:'affinity',from:0.037,to:0.039,expected:4}] },
  { name:'Adaptive Steel', key:'adaptiveSteel', from:{ tier0:{maxBellstrike:0}, tier4:{maxBellstrike:36.2}, tier5:{maxBellstrike:36.2,bellstrikeDmgBonus:0.03} }, to:{ tier0:{maxBellstrike:0}, tier4:{maxBellstrike:36.2}, tier5:{maxBellstrike:36.2,bellstrikeDmgBonus:0.03} }, patches:[] },
  { name:'Art of Resistance [CN Buff]', key:'artOfResistance', from:{ tier4:{minStonesplit:12.1,maxStonesplit:24.1,shieldDamageBonus:0.05}, tier5:{minStonesplit:12.1,maxStonesplit:24.1,stonesplitPen:6,shieldDamageBonus:0.05}, tier6:{minStonesplit:12.1,maxStonesplit:24.1,stonesplitPen:6,shieldDamageBonus:0.1} }, to:{ tier4:{minStonesplit:12.7,maxStonesplit:25.3,shieldDamageBonus:0.05}, tier5:{minStonesplit:12.7,maxStonesplit:25.3,stonesplitPen:6,shieldDamageBonus:0.05}, tier6:{minStonesplit:12.7,maxStonesplit:25.3,stonesplitPen:6,shieldDamageBonus:0.1} }, patches:[] },
  { name:'Throat-Piercing Art', key:'throatPierced', from:{ tier4:{minStonesplit:12.1,maxStonesplit:24.1}, tier5:{minStonesplit:12.1,maxStonesplit:24.1,stonesplitPen:6}, tier6:{minStonesplit:12.1,maxStonesplit:24.1,stonesplitPen:6} }, to:{ tier4:{minStonesplit:12.1,maxStonesplit:24.1}, tier5:{minStonesplit:12.1,maxStonesplit:24.1,stonesplitPen:6}, tier6:{minStonesplit:12.1,maxStonesplit:24.1,stonesplitPen:6} }, patches:[] },
  { name:'Bitter Seasons', key:'bitterSeasons', from:{ tier4:{precision:0.065}, tier5:{precision:0.065,physDmgBonus:0.025}, tier6:{precision:0.065,physDmgBonus:0.025} }, to:{ tier4:{precision:0.065}, tier5:{precision:0.065,physDmgBonus:0.025}, tier6:{precision:0.065,physDmgBonus:0.025} }, patches:[] }
];

globalThis.WWM_DEFAULT_CONFIG = {
  schemaVersion: 3,
  levels: {
    relayMultiplier: 0.94,
    supportedAppVersion: '5faff436',
    recommendedPlayerProfile: 'fixed-100',
    recommendedEnemyLevel: '96',
    defaultPlayerProfile: 'fixed-100',
    playerProfiles: {
      'fixed-100': {
        label: 'Lv.100 (Fixed)', level: 100,
        characterTable: 'level-100-fixed',
        oddityTalentTable: 'level-100-complete',
        martialArtsTalentTable: 'stonesplit-complete',
        tuningTable: 'level-100-fixed', coefficientTable: 'stonesplit-100', arsenalTable: 'level-100',
        foodBonus: { minPhys: 120, maxPhys: 240 }
      }
    },
    arsenalTables: {
      'level-100': {
        minAttack: 131,
        maxAttack: 263
      }
    },
    enemyLevels: {
      '96': { label: 'Lv.96 (Def: 405, JR: 65%)', level: 96, defense: 405, resistance: 0.65 }
    }
  },
  baseCharacterStats: {
    'level-100-fixed': {
      power: 150,
      agility: 150,
      momentum: 150,
      body: 150,
      defense: 150,
      minPhys: 629.21888,
      maxPhys: 881.40936,
      minPrimaryAttribute: 274,
      maxPrimaryAttribute: 549,
      precision: 0.953,
      crit: 0.23404272,
      affinity: 0.14914,
      directCrit: 0,
      directAffinity: 0,
      critDmgBonus: 0.5,
      affinityDmgBonus: 0.35,
      physPen: 0,
      attrDmgBonus: 0,
      physDmgBonus: 0,
      allWeaponDmg: 0,
      bossDmg: 0,
      lightAtkDmg: 0,
      heavyAtkDmg: 0,
      executionDmg: 0,
      stMysticDmg: 0,
      stControlMysticDmg: 0,
      stBurstMysticDmg: 0,
      areaMysticDmg: 0,
      minSilkbind: 0,
      maxSilkbind: 0,
      minBellstrike: 0,
      maxBellstrike: 0,
      minStonesplit: 0,
      maxStonesplit: 0,
      stonesplitPen: 0,
      minBamboocut: 0,
      maxBamboocut: 0,
      maxHp: 76454,
      physDef: 22.7
    }
  },
  oddityTalentStats: {
    'completed-oddities': {
      label: 'Completed Oddities - All Player Levels',
      levelIndependent: true,
      entries: [
        { name: 'Qinghe Oddities', enabled: true, bonuses: { minPhys: 8, maxPhys: 16 } },
        { name: 'Kaifeng Oddities', enabled: true, bonuses: { minPhys: 16, maxPhys: 24 } },
        { name: 'Hexi Oddities', enabled: true, bonuses: { minPhys: 8, maxPhys: 16 } },
        { name: 'Kaifeng Palace Oddities', enabled: true, bonuses: { minPhys: 4, maxPhys: 8 } },
        { name: 'Hidden Mountain: Suixiang Oddities', enabled: true, bonuses: { minPhys: 8, maxPhys: 16 } }
      ]
    },
    'level-100-complete': {
      label: 'Level 100 - Completed progression and oddities',
      entries: [
        { name: 'Normal Talent Tree - Breakthrough 16 New Nodes', enabled: true, bonuses: { power: 3, agility: 3, momentum: 3, body: 3, defense: 3, precision: 0.015, crit: 0.04, affinity: 0.02 } }
      ]
    }
  },
  martialArtsTalents: {
    'stonesplit-complete': {
      label: 'Stonesplit Might Martial Arts Talents',
      entries: [
        { name: 'Charge Calculation Enhancement', enabled: true, bonuses: { maxPhys: 120 } },
        { name: 'Physical Attack UP', enabled: true, bonuses: { maxPhys: 73.9 } },
        { name: 'Stonesplit Attribute UP — Attack', enabled: true, bonuses: { minPrimaryAttribute: 53.8, maxPrimaryAttribute: 108.8 } },
        { name: 'Stonesplit Attribute UP — Penetration', enabled: true, bonuses: { stonesplitPen: 4 } },
        { name: 'Stonesplit Attribute DMG Bonus', enabled: true, bonuses: { attrDmgBonus: 0.02 } }
      ]
    }
  },
  baseTuningStats: {
    'level-100-fixed': {
      sourceBracket: 96,
      maxRolls: {
        minMaxPhys: 77.8, precision: 0.08, crit: 0.09, affinity: 0.044,
        coreAttribute: 49.4, attributeAttack: 44.2, physPen: 11, attributePen: 13,
        maxHp: 2960, physicalDefense: 39, specifiedWeaponBoost: 0.062,
        allMartialArtsBoost: 0.032, bossDamage: 0.032, attackTypeDamage: null,
        mysticDamage: 0.098, skillAttunement: 0.06
      },
      attunementRange: { min: 0.036, max: 0.06 }
    }
  },
  skillCoefficients: {
    'stonesplit-100': {
      coefficientRules,
      namedStatRules: [
        { name: 'Art of Resistance T4-T6', expected: 3, from: { minStonesplit: 12.1, maxStonesplit: 24.1 }, to: { minStonesplit: 12.7, maxStonesplit: 25.3 } }
      ],
      innerWayRules
    }
  },
  baseGearStats: {
    '96': {
      relayEligible: true,
      weapon: { legendary: { minPhys: 65, maxPhys: 151 }, epic: { minPhys: 59, maxPhys: 136 } },
      pendant: { legendary: { maxPhys: 129 }, epic: { maxPhys: 116 } },
      disc: { legendary: { minPhys: 86 }, epic: { minPhys: 78 } },
      lightArmor: { legendary: { maxHp: 5774, physDef: 22 }, epic: { maxHp: 5196, physDef: 20 } },
      greaves: { legendary: { maxHp: 5774, physDef: 44 }, epic: { maxHp: 5196, physDef: 39 } },
      chest: { legendary: { maxHp: 11547, physDef: 22 }, epic: { maxHp: 10392, physDef: 20 } }
      ,bowSet: { precision: 0.04, crit: 0.045, affinity: 0.022 },
      armorSets: {
        rainwhisper: 0.08,
        ivorybloom: 0.09,
        hawkwing: 0.045,
        shatteredridge: 78
      }
    }
  }
};
