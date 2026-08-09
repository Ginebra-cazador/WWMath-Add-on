'use strict';

globalThis.WWMPatchCore = (() => {
  const ROLL_KEYS = ['minMaxPhys','precision','crit','affinity','coreAttribute','attributeAttack','physPen','attributePen','maxHp','physicalDefense','specifiedWeaponBoost','allMartialArtsBoost','bossDamage','attackTypeDamage','mysticDamage','skillAttunement'];
  const GEAR_CATEGORIES = ['weapon','pendant','disc','lightArmor','greaves','chest','weapon','pendant','disc','lightArmor','greaves','chest'];
  const clone = value => JSON.parse(JSON.stringify(value));

  function normalize(config) {
    const normalized=config?.schemaVersion===3 ? clone(config) : clone(globalThis.WWM_DEFAULT_CONFIG);
    if (!Number.isFinite(normalized.levels.relayMultiplier)) normalized.levels.relayMultiplier=0.94;
    if (!normalized.levels.supportedAppVersion) normalized.levels.supportedAppVersion=globalThis.WWM_DEFAULT_CONFIG.levels.supportedAppVersion;
    delete normalized.levels.playerProfiles?.['original-100'];
    if(!normalized.levels.arsenalTables)normalized.levels.arsenalTables=clone(globalThis.WWM_DEFAULT_CONFIG.levels.arsenalTables);
    for(const table of Object.values(normalized.levels.arsenalTables||{})){
      if(table.stonesplit||table.general){table.minAttack=table.stonesplit?.minStonesplit??table.general?.minPhys??0;table.maxAttack=table.stonesplit?.maxStonesplit??table.general?.maxPhys??0;delete table.stonesplit;delete table.general;}
      delete table.maxHp;
    }
    for(const [id,profile] of Object.entries(normalized.levels.playerProfiles||{}))if(!Object.hasOwn(profile,'arsenalTable'))profile.arsenalTable=globalThis.WWM_DEFAULT_CONFIG.levels.playerProfiles[id]?.arsenalTable??null;
    for (const [id,table] of Object.entries(normalized.skillCoefficients||{})) for (const rule of table.coefficientRules||[]) {
      const supplied=globalThis.WWM_DEFAULT_CONFIG.skillCoefficients[id]?.coefficientRules?.find(x=>x.name===rule.name)?.gameplay;
      if (!rule.gameplay || Object.values(rule.gameplay).every(value=>value==='')) rule.gameplay=clone(supplied||{hitCount:'',timingSeconds:'',notes:''});
    }
    for(const [id,table] of Object.entries(normalized.skillCoefficients||{}))if(!table.innerWayRules&&globalThis.WWM_DEFAULT_CONFIG.skillCoefficients[id]?.innerWayRules)table.innerWayRules=clone(globalThis.WWM_DEFAULT_CONFIG.skillCoefficients[id].innerWayRules);
    if(normalized.baseGearStats?.['96']&&!normalized.baseGearStats['96'].bowSet)normalized.baseGearStats['96'].bowSet=clone(globalThis.WWM_DEFAULT_CONFIG.baseGearStats['96'].bowSet);
    if(normalized.baseGearStats?.['96']&&!normalized.baseGearStats['96'].armorSets)normalized.baseGearStats['96'].armorSets=clone(globalThis.WWM_DEFAULT_CONFIG.baseGearStats['96'].armorSets);
    for(const gear of Object.values(normalized.baseGearStats||{}))for(const [key,value] of Object.entries(gear.armorSets||{}))if(value&&typeof value==='object'&&Object.hasOwn(value,'value'))gear.armorSets[key]=value.value;
    return normalized;
  }

  function profile(config, profileId) {
    const id = profileId && config.levels.playerProfiles[profileId] ? profileId : config.levels.defaultPlayerProfile;
    return { id, data: config.levels.playerProfiles[id] };
  }

  function numericPattern(value) {
    const decimal = String(value).replace('.', '\\.');
    return Number.isInteger(value) ? `(?:${decimal}|0x${value.toString(16)})` : decimal;
  }
  const percent=value=>Number((value*100).toFixed(4));

  function patchGear(source, config) {
    const levels = Object.entries(config.baseGearStats || {});
    const relay = [...new Set([71,81,86,91,...levels.filter(([,x]) => x.relayEligible).map(([x]) => Number(x))])].sort((a,b) => a-b);
    const relayMultiplier = Number.isFinite(config.levels?.relayMultiplier) ? config.levels.relayMultiplier : 0.94;
    let patched = source.replace(/var\s+([\w$]+)=0\.94,([\w$]+)=\[0x47,0x51,0x56,0x5b\];/, (_, ratio, list) => `var ${ratio}=${relayMultiplier},${list}=[${relay.map(x => `0x${x.toString(16)}`).join(',')}];`);
    const table = /const\s+([A-Za-z_$][\w$]*)=\{\};\1\['91'\]=([A-Za-z_$][\w$]*),\1\['86'\]=([A-Za-z_$][\w$]*),\1\['81'\]=([A-Za-z_$][\w$]*)(?:,\1\['71'\]=([A-Za-z_$][\w$]*))?;/g;
    let index = 0;
    patched = patched.replace(table, match => {
      if (index >= GEAR_CATEGORIES.length) return match;
      const name = /^const\s+([A-Za-z_$][\w$]*)/.exec(match)[1];
      const category = GEAR_CATEGORIES[index++];
      return match + levels.filter(([,x]) => x[category]).map(([level,x]) => `${name}['${level}']=${JSON.stringify(x[category])};`).join('');
    });
    if (index !== GEAR_CATEGORIES.length) throw new Error(`Gear tables: found ${index}, expected ${GEAR_CATEGORIES.length}`);
    return patched;
  }

  function patchEnemyLevels(source, config) {
    const enemies = Object.values(config.levels.enemyLevels || {});
    const pattern = /const\s+([\w$]+)=\{\};\1\['16'\]=[^;]+;const\s+([\w$]+)=\{\};\2\['16'\]=[^;]+;var\s+([\w$]+)=\1,([\w$]+)=\2;/;
    const match = pattern.exec(source);
    if (!match) throw new Error('Enemy defense/resistance tables were not found.');
    const additions = enemies.map(x => `${match[3]}['${x.level}']=${x.defense};${match[4]}['${x.level}']=${x.resistance};`).join('');
    return source.slice(0, match.index + match[0].length) + additions + source.slice(match.index + match[0].length);
  }

  function patchTuning(source, config, selectedProfile) {
    if (!selectedProfile?.tuningTable) return source;
    const tuning = config.baseTuningStats[selectedProfile.tuningTable];
    if (!tuning) throw new Error(`Missing tuning table: ${selectedProfile.tuningTable}`);
    const mapPattern = /const\s+([\w$]+)=\{\};\1\['61'\]=([\w$]+),\1\['71'\]=([\w$]+),\1\['81'\]=([\w$]+),\1\['86'\]=([\w$]+),\1\['91'\]=([\w$]+),\1\['96'\]=([\w$]+);/g;
    let map;
    while ((map = mapPattern.exec(source))) {
      const bracketIndex = { 61:2, 71:3, 81:4, 86:5, 91:6, 96:7 }[tuning.sourceBracket];
      if (!bracketIndex) throw new Error(`Unsupported tuning source bracket: ${tuning.sourceBracket}`);
      const objectName = map[bracketIndex];
      const declaration = `const ${objectName}={};`;
      const start = source.lastIndexOf(declaration, map.index);
      if (start < 0) continue;
      const bodyStart = start + declaration.length;
      const body = source.slice(bodyStart, map.index);
      const assignment = new RegExp(`(${objectName.replace('$','\\$')}\\[[^\\]]+\\]=)([^,;]+)([,;])`, 'g');
      const found = [...body.matchAll(assignment)];
      if (found.length !== ROLL_KEYS.length) continue;
      let i = 0;
      const values = ROLL_KEYS.map(key => tuning.maxRolls[key]);
      const replacedBody = body.replace(assignment, (all, left, old, end) => `${left}${values[i++] === null ? 'null' : values[i-1]}${end}`);
      let patched = source.slice(0, bodyStart) + replacedBody + source.slice(map.index);
      const cap = tuning.attunementRange?.max ?? tuning.maxRolls.skillAttunement;
      const capPattern = /(var\s+[\w$]+=)0\.05(,[\w$]+=\['leftWeapon')/;
      if (!capPattern.test(patched)) throw new Error('Global skill-attunement cap was not found.');
      return patched.replace(capPattern, `$1${cap}$2`);
    }
    throw new Error('Level 96 tuning table was not found.');
  }

  function replaceScoped(source, start, end, replacements, label) {
    const startIndex=source.indexOf(start);
    const endIndex=startIndex<0?-1:source.indexOf(end,startIndex);
    if(startIndex<0||endIndex<0)throw new Error(`${label} table was not found.`);
    let part=source.slice(startIndex,endIndex);
    for(const item of replacements){const found=part.split(item.from).length-1;if(found!==item.expected)throw new Error(`${label} ${item.name}: found ${found}, expected ${item.expected}`);part=part.split(item.from).join(item.to);}
    return source.slice(0,startIndex)+part+source.slice(endIndex);
  }

  function replaceEntryValueAndLabel(part, oldValue, newValue, newLabel, beforeMarker=null) {
    const limit=beforeMarker ? part.indexOf(beforeMarker) : part.length;
    const token=`=${oldValue}`, valueAt=part.lastIndexOf(token,limit);
    if(valueAt<0)throw new Error(`${newLabel}: source value was not found.`);
    part=part.slice(0,valueAt)+`=${newValue}`+part.slice(valueAt+token.length);
    const labelAssignment=part.indexOf('=',valueAt+String(newValue).length+1),labelEnd=part.indexOf(';const',labelAssignment);
    if(labelAssignment<0||labelEnd<0)throw new Error(`${newLabel}: display label was not found.`);
    return part.slice(0,labelAssignment+1)+`'${newLabel}'`+part.slice(labelEnd);
  }

  function bowData(config) {
    return Object.entries(config.baseGearStats||{}).sort((a,b)=>Number(b[0])-Number(a[0])).find(([,data])=>data.bowSet)?.[1].bowSet||null;
  }

  function patchBowSet(source, config) {
    const bow=bowData(config); if(!bow)return source;
    if(source.includes("fi={'none':")) return replaceScoped(source,"fi={'none':",'function di(',[
      {name:'Precision',from:"'value':0.033",to:`'value':${bow.precision}`,expected:1},
      {name:'Crit',from:"'value':0.037",to:`'value':${bow.crit}`,expected:1},
      {name:'Affinity',from:"'value':0.018",to:`'value':${bow.affinity}`,expected:1}
    ],'Bow Set');
    if(source.includes('No\\x20Bow\\x20Set')) {
      let patched=replaceScoped(source,'No\\x20Bow\\x20Set','function Zn(',[
      {name:'Precision',from:'=0.033',to:`=${bow.precision}`,expected:1},
      {name:'Crit',from:'=0.037',to:`=${bow.crit}`,expected:1},
      {name:'Affinity',from:'=0.018',to:`=${bow.affinity}`,expected:1},
      {name:'Crit label',from:"'+3.7%\\x20Crit'",to:`'+${percent(bow.crit)}%\\x20Crit'`,expected:1},
      {name:'Affinity label',from:"'+1.8%\\x20Affi'",to:`'+${percent(bow.affinity)}%\\x20Affi'`,expected:1}
      ],'Bow Set');
      const start=patched.indexOf('No\\x20Bow\\x20Set'),end=patched.indexOf('function Zn(',start);
      let part=patched.slice(start,end);
      part=replaceEntryValueAndLabel(part,bow.precision,bow.precision,`+${percent(bow.precision)}% Precision`,"['key']='crit'");
      return patched.slice(0,start)+part+patched.slice(end);
    }
    return source;
  }

  function patchArsenal(source, config, selectedProfile) {
    if(!selectedProfile?.arsenalTable)return source;
    const table=config.levels.arsenalTables?.[selectedProfile.arsenalTable];
    if(!table)throw new Error(`Missing Arsenal table: ${selectedProfile.arsenalTable}`);
    const min=table.minAttack;
    const max=table.maxAttack;
    if(source.includes("Xi={'min':0x72,'max':0xe5}"))return source.replace("Xi={'min':0x72,'max':0xe5}",`Xi={'min':${min},'max':${max}}`);
    const pattern=/(const\s+([\w$]+)=\{\};\2\[[^\]]+\]=)0x72(,\2\[[^\]]+\]=)0xe5(?=;const\s+[\w$]+=\{\};[\s\S]{0,150}\['minPhys'\]=0x4)/;
    if(!pattern.test(source))throw new Error('Arsenal attack table was not found.');
    return source.replace(pattern,(_match,left,_variable,middle)=>`${left}${min}${middle}${max}`);
  }

  function objectRanges(source, marker) {
    const ranges=[]; let search=0;
    while((search=source.indexOf(marker,search))>=0){let start=search+marker.length-1,depth=0,quote=null,escape=false,end=-1;for(let i=start;i<source.length;i++){const char=source[i];if(quote){if(escape)escape=false;else if(char==='\\')escape=true;else if(char===quote)quote=null;continue;}if(char==="'"||char==='"'){quote=char;continue;}if(char==='{')depth++;else if(char==='}'&&--depth===0){end=i+1;break;}}if(end<0)break;ranges.push([search,end]);search=end;}
    return ranges;
  }

  const originalArmorSetValues={rainwhisper:0.066,ivorybloom:0.074,hawkwing:0.037,shatteredridge:64};

  function patchMainArmorSets(source, sets) {
    const start=source.indexOf('var xg=0.03'),end=start<0?-1:source.indexOf('var Ps=',start);
    if(start<0||end<0)throw new Error('Main armor-set table was not found.');
    let part=source.slice(start,end);
    part=replaceEntryValueAndLabel(part,'0.037',sets.hawkwing,`+${percent(sets.hawkwing)}% Affinity`,"['key']='hawkwing'");
    part=replaceEntryValueAndLabel(part,'0.066',sets.rainwhisper,`+${percent(sets.rainwhisper)}% Precision`,"='rainwhispe'+'r'");
    part=replaceEntryValueAndLabel(part,'0.074',sets.ivorybloom,`+${percent(sets.ivorybloom)}% Crit Rate`,"='Ivorybloom'");
    part=replaceEntryValueAndLabel(part,'0x40',sets.shatteredridge,`+${sets.shatteredridge} Min Phys`,"='shatteredR'+");
    return source.slice(0,start)+part+source.slice(end);
  }

  function armorSetData(config) {
    return Object.entries(config.baseGearStats||{}).sort((a,b)=>Number(b[0])-Number(a[0])).find(([,data])=>data.armorSets)?.[1].armorSets||null;
  }

  function patchArmorSets(source, config) {
    const sets=armorSetData(config); if(!sets)return source;
    if(!source.includes("'twoPiece':{"))return patchMainArmorSets(source,sets);
    let patched=source;
    for(const [key,value] of Object.entries(sets)){
      if(!Object.hasOwn(originalArmorSetValues,key))continue;
      const ranges=objectRanges(patched,`'${key}':{`);
      let found=0;
      for(let i=ranges.length-1;i>=0;i--){
        const [start,end]=ranges[i],part=patched.slice(start,end);
        const pattern=new RegExp(`('twoPiece':\\{[\\s\\S]*?'value':)${numericPattern(originalArmorSetValues[key])}`);
        if(pattern.test(part)){found++;patched=patched.slice(0,start)+part.replace(pattern,`$1${value}`)+patched.slice(end);}
      }
      if(found!==1)throw new Error(`${key} armor set: found ${found}, expected 1`);
    }
    return patched;
  }

  function patchInnerWays(source, table) {
    let patched=source;
    for(const rule of table.innerWayRules||[])for(const change of rule.patches||[]){const marker=`'${rule.key}':{`;const ranges=objectRanges(patched,marker);let found=0;for(let i=ranges.length-1;i>=0;i--){const [start,end]=ranges[i],part=patched.slice(start,end),pattern=new RegExp(`('${change.field}':)${numericPattern(change.from)}`,'g'),matches=[...part.matchAll(pattern)];found+=matches.length;if(matches.length)patched=patched.slice(0,start)+part.replace(pattern,`$1${change.to}`)+patched.slice(end);}if(found!==change.expected)throw new Error(`${rule.name} ${change.field}: found ${found}, expected ${change.expected}`);}
    return patched;
  }

  function coefficientPattern(values) {
    return new RegExp(`('physCoeff':)${numericPattern(values.physCoeff)}(,'flatPhys':)${numericPattern(values.flatPhys)}(,'attrCoeff':)${numericPattern(values.attrCoeff)}(,'flatAttr':)${numericPattern(values.flatAttr)}`, 'g');
  }

  function patchWorker(source, config, selectedProfile) {
    if (!selectedProfile?.coefficientTable) return source;
    const table = config.skillCoefficients[selectedProfile.coefficientTable];
    if (!table) throw new Error(`Missing coefficient table: ${selectedProfile.coefficientTable}`);
    let patched = source;
    for (const rule of table.coefficientRules || []) {
      const pattern = coefficientPattern(rule.from);
      const replacement = `$1${rule.to.physCoeff}$2${rule.to.flatPhys}$3${rule.to.attrCoeff}$4${rule.to.flatAttr}`;
      if (rule.skillName) {
        const start = patched.indexOf(`'${rule.skillName}':{`);
        const end = patched.indexOf('}', start);
        if (start < 0 || end < 0) throw new Error(`${rule.name}: skill not found`);
        const part = patched.slice(start, end + 1);
        if ([...part.matchAll(pattern)].length !== rule.expected) throw new Error(`${rule.name}: unexpected source data`);
        patched = patched.slice(0,start) + part.replace(pattern,replacement) + patched.slice(end+1);
      } else {
        if ([...patched.matchAll(pattern)].length !== rule.expected) throw new Error(`${rule.name}: unexpected source data`);
        patched = patched.replace(pattern,replacement);
      }
    }
    for (const rule of table.namedStatRules || []) {
      const pattern = new RegExp(`('statBonuses':\\{'minStonesplit':)${numericPattern(rule.from.minStonesplit)}(,'maxStonesplit':)${numericPattern(rule.from.maxStonesplit)}(?=(?:,'stonesplitPen':${numericPattern(6)})?\\},'shieldDamageBonus':(?:0\\.05|0\\.1))`, 'g');
      if ([...patched.matchAll(pattern)].length !== rule.expected) throw new Error(`${rule.name}: unexpected source data`);
      patched = patched.replace(pattern, `$1${rule.to.minStonesplit}$2${rule.to.maxStonesplit}`);
    }
    return patchInnerWays(patchArmorSets(patchBowSet(patchArsenal(patched,config,selectedProfile),config),config),table);
  }

  function patchGearAttuneLevel(source) {
    const functionPattern = /function\s+[\w$]+\(\{mainStats:[\w$]+,attunements:[\w$]+,gearPiece:([\w$]+),slotKey:([\w$]+),specId:([\w$]+),calculateDps:[\w$]+,cachedCurrentDps:[\w$]+=null\}\)\{/g;
    const candidates = [...source.matchAll(functionPattern)].map(match => {
      const gearPiece = match[1], slotKey = match[2], specId = match[3];
      const start = match.index, end = Math.min(source.length, start + 7500);
      const section = source.slice(start, end);
      const callPattern = new RegExp(`([\\w$]+)\\(${slotKey},${specId}\\)`, 'g');
      return { gearPiece, slotKey, specId, start, end, section, callPattern, calls: [...section.matchAll(callPattern)] };
    }).filter(candidate => candidate.calls.length === 1);
    if (candidates.length !== 1) throw new Error(`Gear Re-Attune table call: found ${candidates.length} candidate functions, expected 1`);
    const { gearPiece, slotKey, specId, start, end, section, callPattern } = candidates[0];
    return source.slice(0, start) + section.replace(callPattern, `$1(${slotKey},${specId},${gearPiece}['level'])`) + source.slice(end);
  }

  function patchApp(source, config, profileId) {
    const selected = profile(config, profileId).data;
    return patchGearAttuneLevel(patchTuning(patchArsenal(patchArmorSets(patchBowSet(patchEnemyLevels(patchGear(source, config), config),config),config),config,selected), config, selected));
  }

  return { normalize, profile, patchApp, patchWorker };
})();
