'use strict';
const ext = globalThis.browser || globalThis.chrome;
const fields = { levels: document.getElementById('levels-json'), baseCharacterStats: document.getElementById('character-json'), oddityTalentStats: document.getElementById('progression-json'), martialArtsTalents: document.getElementById('martial-talents-json'), baseTuningStats: document.getElementById('tuning-json'), skillCoefficients: document.getElementById('skills-json'), baseGearStats: document.getElementById('gear-json') };
const friendly = { levels: document.getElementById('levels-friendly'), baseCharacterStats: document.getElementById('character-friendly'), oddityTalentStats: document.getElementById('progression-friendly'), martialArtsTalents: document.getElementById('martial-talents-friendly'), baseTuningStats: document.getElementById('tuning-friendly'), skillCoefficients: document.getElementById('skills-friendly'), baseGearStats: document.getElementById('gear-friendly') };
const status = document.getElementById('status');
const clone = x => JSON.parse(JSON.stringify(x));
let draft = clone(globalThis.WWM_DEFAULT_CONFIG);
let mode = 'friendly';
let savedConfig = clone(globalThis.WWM_DEFAULT_CONFIG);
function normalizeConfig(config) {
  const normalized=config?.schemaVersion===3?clone(config):clone(globalThis.WWM_DEFAULT_CONFIG);
  if(!Number.isFinite(normalized.levels.relayMultiplier))normalized.levels.relayMultiplier=0.94;
  if(!normalized.levels.supportedAppVersion)normalized.levels.supportedAppVersion=globalThis.WWM_DEFAULT_CONFIG.levels.supportedAppVersion;
  if(!normalized.levels.playerProfiles?.[normalized.levels.recommendedPlayerProfile])normalized.levels.recommendedPlayerProfile=normalized.levels.defaultPlayerProfile||Object.keys(normalized.levels.playerProfiles||{})[0]||null;
  if(!normalized.levels.enemyLevels?.[normalized.levels.recommendedEnemyLevel])normalized.levels.recommendedEnemyLevel=Object.keys(normalized.levels.enemyLevels||{})[0]||null;
  delete normalized.levels.playerProfiles?.['original-100'];
  if(!normalized.levels.arsenalTables)normalized.levels.arsenalTables=clone(globalThis.WWM_DEFAULT_CONFIG.levels.arsenalTables);
  for(const table of Object.values(normalized.levels.arsenalTables||{})){
    if(table.stonesplit||table.general){table.minAttack=table.stonesplit?.minStonesplit??table.general?.minPhys??0;table.maxAttack=table.stonesplit?.maxStonesplit??table.general?.maxPhys??0;delete table.stonesplit;delete table.general;}
    delete table.maxHp;
  }
  for(const [id,profile] of Object.entries(normalized.levels.playerProfiles||{})){
    if(!Object.hasOwn(profile,'arsenalTable'))profile.arsenalTable=globalThis.WWM_DEFAULT_CONFIG.levels.playerProfiles[id]?.arsenalTable??null;
    if(!profile.foodBonus)profile.foodBonus=clone(globalThis.WWM_DEFAULT_CONFIG.levels.playerProfiles[id]?.foodBonus||{minPhys:120,maxPhys:240});
  }
  if(!normalized.baseCharacterStats)normalized.baseCharacterStats=clone(globalThis.WWM_DEFAULT_CONFIG.baseCharacterStats);
  for(const [id,profile] of Object.entries(normalized.levels.playerProfiles||{}))if(!Object.hasOwn(profile,'characterTable'))profile.characterTable=globalThis.WWM_DEFAULT_CONFIG.levels.playerProfiles[id]?.characterTable??null;
  const legacyLayersMissing=!normalized.oddityTalentStats&&!normalized.martialArtsTalents;
  if(legacyLayersMissing){
    const legacy=normalized.baseCharacterStats?.['level-100-fixed'];
    const supplied=globalThis.WWM_DEFAULT_CONFIG.baseCharacterStats['level-100-fixed'];
    const oldSupplied=legacy&&legacy.minPhys===595.68&&legacy.maxPhys===947.34&&legacy.minPrimaryAttribute===274&&legacy.maxPrimaryAttribute===549;
    if(oldSupplied)normalized.baseCharacterStats['level-100-fixed']=clone(supplied);
    else if(legacy){
      const deltas={power:3,agility:3,momentum:3,body:3,defense:3,minPhys:44,maxPhys:273.9,minPrimaryAttribute:53.8,maxPrimaryAttribute:108.8,precision:0.015,crit:0.04,affinity:0.02,attrDmgBonus:0.02};
      for(const [key,value] of Object.entries(deltas))legacy[key]=(Number(legacy[key])||0)-value;
    }
  }
  if(!normalized.oddityTalentStats)normalized.oddityTalentStats=clone(globalThis.WWM_DEFAULT_CONFIG.oddityTalentStats);
  if(!normalized.martialArtsTalents)normalized.martialArtsTalents=clone(globalThis.WWM_DEFAULT_CONFIG.martialArtsTalents);
  const oldProgression=normalized.oddityTalentStats?.['level-100-complete']?.entries?.find(entry=>entry.name==='Level 100 progression and general talents (reconciled)');
  if(oldProgression){
    const base=normalized.baseCharacterStats?.['level-100-fixed'];
    if(base){const shifts={power:13,agility:13,momentum:13,body:13,defense:13,minPhys:33.53888,maxPhys:54.06936,precision:0.013,crit:-0.06439728,affinity:-0.00008};for(const [key,value] of Object.entries(shifts))base[key]=(Number(base[key])||0)+value;}
    oldProgression.name='Normal Talent Tree - Breakthrough 16 New Nodes';
    oldProgression.bonuses={power:3,agility:3,momentum:3,body:3,defense:3,precision:0.015,crit:0.04,affinity:0.02};
  }
  const level100Bonuses=normalized.oddityTalentStats?.['level-100-complete'];
  if(level100Bonuses){
    level100Bonuses.label='Level 100 - Completed progression and oddities';
    const normalTalent=level100Bonuses.entries?.find(entry=>entry.name==='Normal Talent Tree — confirmed combat bonuses');
    if(normalTalent)normalTalent.name='Normal Talent Tree - Breakthrough 16 New Nodes';
    const oddities=(level100Bonuses.entries||[]).filter(entry=>/Oddities$/i.test(entry.name||''));
    if(!normalized.oddityTalentStats['completed-oddities'])normalized.oddityTalentStats['completed-oddities']={label:'Completed Oddities - All Player Levels',levelIndependent:true,entries:oddities.length?clone(oddities):clone(globalThis.WWM_DEFAULT_CONFIG.oddityTalentStats['completed-oddities'].entries)};
    level100Bonuses.entries=(level100Bonuses.entries||[]).filter(entry=>!/Oddities$/i.test(entry.name||''));
  }
  const globalOddities=normalized.oddityTalentStats?.['completed-oddities'];
  if(globalOddities){globalOddities.label='Completed Oddities - All Player Levels';globalOddities.levelIndependent=true;}
  const stonesplitTalents=normalized.martialArtsTalents?.['stonesplit-complete'];
  if(stonesplitTalents)stonesplitTalents.label='Stonesplit Might Martial Arts Talents';
  if(stonesplitTalents&&!stonesplitTalents.entries?.some(entry=>entry.name==='Charge Calculation Enhancement')){
    const base=normalized.baseCharacterStats?.['level-100-fixed'];
    if(base)base.maxPhys=(Number(base.maxPhys)||0)-120;
    stonesplitTalents.entries??=[];
    stonesplitTalents.entries.unshift({name:'Charge Calculation Enhancement',enabled:true,bonuses:{maxPhys:120}});
  }
  for(const [id,profile] of Object.entries(normalized.levels.playerProfiles||{})){
    if(!Object.hasOwn(profile,'oddityTalentTable'))profile.oddityTalentTable=globalThis.WWM_DEFAULT_CONFIG.levels.playerProfiles[id]?.oddityTalentTable??null;
    if(!Object.hasOwn(profile,'martialArtsTalentTable'))profile.martialArtsTalentTable=globalThis.WWM_DEFAULT_CONFIG.levels.playerProfiles[id]?.martialArtsTalentTable??null;
  }
  for(const [id,table] of Object.entries(normalized.skillCoefficients||{}))for(const rule of table.coefficientRules||[]){const supplied=globalThis.WWM_DEFAULT_CONFIG.skillCoefficients[id]?.coefficientRules?.find(x=>x.name===rule.name)?.gameplay;if(!rule.gameplay||Object.values(rule.gameplay).every(value=>value===''))rule.gameplay=clone(supplied||{hitCount:'',timingSeconds:'',notes:''});}
  for(const [id,table] of Object.entries(normalized.skillCoefficients||{}))if(!table.innerWayRules&&globalThis.WWM_DEFAULT_CONFIG.skillCoefficients[id]?.innerWayRules)table.innerWayRules=clone(globalThis.WWM_DEFAULT_CONFIG.skillCoefficients[id].innerWayRules);
  if(normalized.baseGearStats?.['96']&&!normalized.baseGearStats['96'].bowSet)normalized.baseGearStats['96'].bowSet=clone(globalThis.WWM_DEFAULT_CONFIG.baseGearStats['96'].bowSet);
  if(normalized.baseGearStats?.['96']&&!normalized.baseGearStats['96'].armorSets)normalized.baseGearStats['96'].armorSets=clone(globalThis.WWM_DEFAULT_CONFIG.baseGearStats['96'].armorSets);
  for(const gear of Object.values(normalized.baseGearStats||{}))for(const [key,value] of Object.entries(gear.armorSets||{}))if(value&&typeof value==='object'&&Object.hasOwn(value,'value'))gear.armorSets[key]=value.value;
  return normalized;
}

function humanize(value) {
  const labels = { oddityTalentTable: 'Post-Breakthrough Player Talents table', martialArtsTalentTable: 'Martial Arts talents table', stonesplitPen: 'Stonesplit Penetration', bonuses: 'Stat bonuses', physPen: 'Physical Penetration', attributePen: 'Formless (Attribute) Penetration', physicalDefense: 'Physical Defense', skillAttunement: 'Skill Attunement Maximum', attunementRange: 'Skill Attunement Range', coefficientRules: 'Skill List', innerWayRules: 'Innerway Buffs Data', armorSets: 'Armor Set Data', bowSet: 'Bow Set Data', rainwhisper: 'Rainwhisper — Precision Rate', ivorybloom: 'Ivorybloom — Critical Rate', hawkwing: 'Hawkwing — Affinity Rate', shatteredridge: 'Shattered Ridge (Cleftpeak) — Min Physical Attack', from: 'Original Calculator Values', to: 'Replacement Values', expected: 'Code Match Count', gameplay: 'Timing and Hit Data', timingSeconds: 'Timing (seconds)' };
  if (labels[value]) return labels[value];
  return String(value).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, x => x.toUpperCase());
}
function getAt(root, path) { return path.reduce((value, key) => value[key], root); }
function setAt(root, path, value) { const parent=getAt(root,path.slice(0,-1)); parent[path.at(-1)]=value; }
function groupTitle(key, value) {
  if (Array.isArray(value)) return humanize(key);
  if (value && typeof value === 'object' && value.name) return `${value.name}${Number.isInteger(value.expected) ? ` — Expected: ${value.expected}` : ''}`;
  return humanize(key);
}
function renderNode(container, value, path = [], editRoot = draft) {
  if (path.length === 1 && value?.maxRolls && value?.attunementRange) {
    if (Object.hasOwn(value,'sourceBracket')) renderNode(container,{sourceBracket:value.sourceBracket},path,editRoot);
    const tuningDetails=document.createElement('details');
    const tuningSummary=document.createElement('summary'); tuningSummary.textContent='Max Rolls';
    const tuningChildren=document.createElement('div'); tuningChildren.className='children'; renderNode(tuningChildren,value.maxRolls,[...path,'maxRolls'],editRoot);
    tuningDetails.append(tuningSummary,tuningChildren); container.appendChild(tuningDetails);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (path.length === 0 && (key === 'defaultPlayerProfile' || key === 'defaultEnemyLevel')) continue;
    if (key === 'namedStatRules' || key === 'patches' || key === 'from') continue;
    if (path.includes('innerWayRules') && (key === 'name' || key === 'key')) continue;
    if (path.includes('coefficientRules') && (key === 'name' || key === 'skillName')) continue;
    const childPath = [...path, key];
    if (child && typeof child === 'object') {
      if (key === 'to' && path.includes('innerWayRules')) { renderNode(container,child,childPath,editRoot); continue; }
      const details=document.createElement('details');
      const heading=document.createElement('summary');
      heading.textContent=Array.isArray(value) ? `${Number(key)+1}. ${groupTitle(key,child)}` : (child.weapon&&Object.hasOwn(child,'relayEligible') ? `Lvl ${key} Gear` : groupTitle(key,child));
      const children=document.createElement('div'); children.className='children';
      details.append(heading,children); container.appendChild(details);
      renderNode(children, child, childPath,editRoot);
      continue;
    }
    const row = document.createElement('div'); row.className = 'field';
    const label = document.createElement('label'); label.textContent = humanize(key);
    const pathHint = document.createElement('small'); pathHint.textContent = childPath.join(' > '); label.appendChild(pathHint);
    let input;
    if (path.length===0 && key==='recommendedPlayerProfile') {
      input=document.createElement('select');
      for(const [id,profile] of Object.entries(draft.levels.playerProfiles||{}))input.add(new Option(profile.label||id,id));
      input.value=child||'';
    } else if (path.length===0 && key==='recommendedEnemyLevel') {
      input=document.createElement('select');
      for(const [id,enemy] of Object.entries(draft.levels.enemyLevels||{}))input.add(new Option(enemy.label||`Lv.${enemy.level}`,id));
      input.value=child||'';
    } else if (path[0] === 'playerProfiles' && ['characterTable','oddityTalentTable','martialArtsTalentTable','tuningTable','coefficientTable','arsenalTable'].includes(key)) {
      input=document.createElement('select'); input.add(new Option('None (use original website data)',''));
      const choices=key==='characterTable' ? Object.keys(draft.baseCharacterStats) : key==='oddityTalentTable' ? Object.keys(draft.oddityTalentStats).filter(id=>!draft.oddityTalentStats[id].levelIndependent) : key==='martialArtsTalentTable' ? Object.keys(draft.martialArtsTalents) : (key==='tuningTable' ? Object.keys(draft.baseTuningStats) : (key==='coefficientTable'?Object.keys(draft.skillCoefficients):Object.keys(draft.levels.arsenalTables||{})));
      for (const id of choices) input.add(new Option(id,id));
      input.value=child || '';
    } else if (typeof child === 'boolean') { input=document.createElement('input'); input.type='checkbox'; input.checked=child; }
    else { input=document.createElement('input'); input.type=typeof child === 'number' ? 'number' : 'text'; if (typeof child === 'number') input.step='any'; input.value=child === null ? 'Null' : child; if (child === null) { input.disabled=true; input.title='This value is intentionally null and is not used by the calculator.'; } }
    if (path.includes('from') || key === 'expected') {
      input.disabled=true;
      input.title='Compatibility value from the original calculator. Edit only in Advanced JSON mode.';
    }
    if (key === 'supportedAppVersion') {
      input.disabled=true;
      input.title='This identifies the calculator bundle version verified by this extension release.';
    }
    const updateValue = () => {
      let next;
      if (typeof child === 'boolean') next=input.checked;
      else if (typeof child === 'number') next=input.value === '' ? 0 : Number(input.value);
      else if (child === null) next=input.value === '' ? null : (['characterTable','oddityTalentTable','martialArtsTalentTable','tuningTable','coefficientTable','arsenalTable'].includes(key) ? input.value : Number(input.value));
      else next=input.value;
      setAt(editRoot, childPath, next);
    };
    input.addEventListener('input', updateValue);
    input.addEventListener('change', updateValue);
    row.append(label,input); container.appendChild(row);
  }
}
function askId(message, existing) {
  const id=prompt(message)?.trim();
  if (!id) return null;
  if (Object.hasOwn(existing,id)) { alert(`“${id}” already exists.`); return null; }
  return id;
}
function chooseSource(label, existing) {
  const ids=Object.keys(existing);
  if (!ids.length) return null;
  const answer=prompt(`Optional: enter an existing ${label} to copy.\nLeave blank to start with empty values.\n\nAvailable:\n${ids.join('\n')}`,'')?.trim();
  if (answer && !Object.hasOwn(existing,answer)) { alert(`“${answer}” does not exist.`); return false; }
  return answer || null;
}
function action(label, handler) { const button=document.createElement('button'); button.className='add'; button.textContent=label; button.onclick=handler; return button; }
function selectLayerEntryDestination({title,tables,tableLabel,templateLabel,defaultName}) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    const heading=document.createElement('h2'); heading.textContent=title;
    const destinationLabel=document.createElement('label'); destinationLabel.textContent=tableLabel;
    const destinationSelect=document.createElement('select');
    for(const [id,table] of Object.entries(tables))destinationSelect.add(new Option(table.label||humanize(id),id));
    const sourceLabel=document.createElement('label'); sourceLabel.textContent=templateLabel;
    const sourceSelect=document.createElement('select'); sourceSelect.add(new Option('Blank entry',''));
    const entries=Object.values(tables).flatMap(table=>table.entries||[]);
    for(const entry of [...new Map(entries.map(item=>[item.name,item])).values()])sourceSelect.add(new Option(entry.name,entry.name));
    const nameLabel=document.createElement('label'); nameLabel.textContent='New entry name';
    const nameInput=document.createElement('input'); nameInput.value=defaultName;
    sourceSelect.onchange=()=>{if(sourceSelect.value)nameInput.value=sourceSelect.value;};
    const add=document.createElement('button'); add.className='add'; add.textContent=title;
    const cancel=document.createElement('button'); cancel.textContent='Cancel';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    add.onclick=()=>{const name=nameInput.value.trim();if(!name)return alert('Enter a name for the new entry.');finish({tableId:destinationSelect.value,sourceName:sourceSelect.value,name});};
    cancel.onclick=()=>finish(null);
    dialog.append(heading,destinationLabel,destinationSelect,sourceLabel,sourceSelect,nameLabel,nameInput,add,cancel); document.body.appendChild(dialog); dialog.showModal();
  });
}
function selectPlayerTalentList() {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    const heading=document.createElement('h2'); heading.textContent='Add Player Level Talent List';
    const levelLabel=document.createElement('label'); levelLabel.textContent='Player level';
    const levelInput=document.createElement('input'); levelInput.type='number'; levelInput.min='1'; levelInput.step='1'; levelInput.value='105';
    const templateLabel=document.createElement('label'); templateLabel.textContent='Base the new list on';
    const templateSelect=document.createElement('select'); templateSelect.add(new Option('Blank list',''));
    for(const [id,table] of Object.entries(draft.oddityTalentStats).filter(([,table])=>!table.levelIndependent))templateSelect.add(new Option(table.label||humanize(id),id));
    const add=document.createElement('button'); add.className='add'; add.textContent='Add Player Level Talent List';
    const cancel=document.createElement('button'); cancel.textContent='Cancel';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    add.onclick=()=>{const level=Number(levelInput.value);if(!Number.isInteger(level)||level<1)return alert('Enter a whole-number player level.');finish({level,sourceId:templateSelect.value});};
    cancel.onclick=()=>finish(null);
    dialog.append(heading,levelLabel,levelInput,templateLabel,templateSelect,add,cancel);document.body.appendChild(dialog);dialog.showModal();
  });
}
function selectOddityMapping() {
  const tables=Object.fromEntries(Object.entries(draft.oddityTalentStats).filter(([,table])=>table.levelIndependent));
  return selectLayerEntryDestination({title:'Map New Oddity',tables,tableLabel:'Level-independent Oddities list',templateLabel:'Base the new Oddity on',defaultName:'New Oddity'});
}
function selectMappedEntryBonus() {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    const heading=document.createElement('h2'); heading.textContent='Add Bonus to Mapped Entry';
    const tableLabel=document.createElement('label'); tableLabel.textContent='Oddity or Player Talent list';
    const tableSelect=document.createElement('select');
    for(const [id,table] of Object.entries(draft.oddityTalentStats))tableSelect.add(new Option(table.label||humanize(id),id));
    const entryLabel=document.createElement('label'); entryLabel.textContent='Mapped entry';
    const entrySelect=document.createElement('select');
    const statLabel=document.createElement('label'); statLabel.textContent='Stat bonus';
    const statSelect=document.createElement('select');
    const valueLabel=document.createElement('label'); valueLabel.textContent='Bonus value (percentages use decimal form, for example 0.02 for 2%)';
    const valueInput=document.createElement('input'); valueInput.type='number'; valueInput.step='any'; valueInput.value='0';
    const statKeys=[...new Set([...Object.keys(globalThis.WWM_DEFAULT_CONFIG.baseCharacterStats['level-100-fixed']), 'stonesplitPen'])];
    const updateStats=()=>{statSelect.replaceChildren();const table=draft.oddityTalentStats[tableSelect.value];const entry=table?.entries?.[Number(entrySelect.value)];for(const key of statKeys.filter(key=>!Object.hasOwn(entry?.bonuses||{},key)))statSelect.add(new Option(humanize(key),key));};
    const updateEntries=()=>{entrySelect.replaceChildren();const table=draft.oddityTalentStats[tableSelect.value];for(const [index,entry] of (table?.entries||[]).entries())entrySelect.add(new Option(entry.name,String(index)));updateStats();};
    tableSelect.onchange=updateEntries;entrySelect.onchange=updateStats;updateEntries();
    const add=document.createElement('button'); add.className='add'; add.textContent='Add Bonus';
    const cancel=document.createElement('button'); cancel.textContent='Cancel';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    add.onclick=()=>{if(!entrySelect.options.length)return alert('The selected list has no mapped entries.');if(!statSelect.value)return alert('Every supported stat is already mapped on this entry.');const value=Number(valueInput.value);if(!Number.isFinite(value))return alert('Enter a numeric bonus value.');finish({tableId:tableSelect.value,entryIndex:Number(entrySelect.value),statKey:statSelect.value,value});};
    cancel.onclick=()=>finish(null);
    dialog.append(heading,tableLabel,tableSelect,entryLabel,entrySelect,statLabel,statSelect,valueLabel,valueInput,add,cancel);document.body.appendChild(dialog);dialog.showModal();
  });
}
function selectSkillDestination() {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    const title=document.createElement('h2'); title.textContent='Add Skill';
    const tableLabel=document.createElement('label'); tableLabel.textContent='Martial Arts table';
    const tableSelect=document.createElement('select');
    for(const id of Object.keys(draft.skillCoefficients))tableSelect.add(new Option(humanize(id),id));
    const sourceLabel=document.createElement('label'); sourceLabel.textContent='Skill template';
    const sourceSelect=document.createElement('select');
    for(const rule of Object.values(draft.skillCoefficients).flatMap(x=>x.coefficientRules||[]))sourceSelect.add(new Option(rule.name,rule.name));
    const createLabel=document.createElement('label'); const createNew=document.createElement('input'); createNew.type='checkbox'; createLabel.append(createNew,' Create a new skill from this template');
    const nameLabel=document.createElement('label'); nameLabel.textContent='New skill name'; const nameInput=document.createElement('input');
    const keyLabel=document.createElement('label'); keyLabel.textContent='Internal calculator key (optional)'; const keyInput=document.createElement('input');
    const update=()=>{nameLabel.hidden=nameInput.hidden=keyLabel.hidden=keyInput.hidden=!createNew.checked;}; createNew.onchange=update; update();
    const add=document.createElement('button'); add.className='add'; add.textContent='Add Skill';
    const cancel=document.createElement('button'); cancel.textContent='Cancel';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    add.onclick=()=>{if(createNew.checked&&!nameInput.value.trim())return alert('Enter a name for the new skill.');finish({tableId:tableSelect.value,sourceName:sourceSelect.value,createNew:createNew.checked,name:nameInput.value.trim(),key:keyInput.value.trim()});}; cancel.onclick=()=>finish(null);
    dialog.append(title,tableLabel,tableSelect,sourceLabel,sourceSelect,createLabel,nameLabel,nameInput,keyLabel,keyInput,add,cancel); document.body.appendChild(dialog); dialog.showModal();
  });
}
function selectInnerWayDestination() {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    const title=document.createElement('h2'); title.textContent='Add Inner Way Buff Data';
    const tableLabel=document.createElement('label'); tableLabel.textContent='Martial Arts table';
    const tableSelect=document.createElement('select');
    for(const id of Object.keys(draft.skillCoefficients))tableSelect.add(new Option(humanize(id),id));
    const sourceLabel=document.createElement('label'); sourceLabel.textContent='Inner Way template';
    const sourceSelect=document.createElement('select');
    const rules=Object.values(draft.skillCoefficients).flatMap(x=>x.innerWayRules||[]);
    const unique=[...new Map(rules.map(rule=>[rule.key,rule])).values()];
    for(const rule of unique)sourceSelect.add(new Option(rule.name,rule.key));
    const createLabel=document.createElement('label'); const createNew=document.createElement('input'); createNew.type='checkbox'; createLabel.append(createNew,' Create a new Inner Way from this template');
    const nameLabel=document.createElement('label'); nameLabel.textContent='New Inner Way name'; const nameInput=document.createElement('input');
    const keyLabel=document.createElement('label'); keyLabel.textContent='Internal calculator key'; const keyInput=document.createElement('input');
    const update=()=>{nameLabel.hidden=nameInput.hidden=keyLabel.hidden=keyInput.hidden=!createNew.checked;}; createNew.onchange=update; update();
    const add=document.createElement('button'); add.className='add'; add.textContent='Add Inner Way';
    const cancel=document.createElement('button'); cancel.textContent='Cancel';
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    add.onclick=()=>{if(createNew.checked&&(!nameInput.value.trim()||!keyInput.value.trim()))return alert('Enter both a name and internal calculator key.');finish({tableId:tableSelect.value,key:sourceSelect.value,createNew:createNew.checked,name:nameInput.value.trim(),newKey:keyInput.value.trim()});}; cancel.onclick=()=>finish(null);
    dialog.append(title,tableLabel,tableSelect,sourceLabel,sourceSelect,createLabel,nameLabel,nameInput,keyLabel,keyInput,add,cancel); document.body.appendChild(dialog); dialog.showModal();
  });
}
function addActions(section,container) {
  const actions=document.createElement('div'); actions.className='actions';
  if (section==='levels') {
    actions.append(action('+ Add player profile',()=>{ const id=askId('New profile ID, for example fixed-105:',draft.levels.playerProfiles); if(!id)return; const source=chooseSource('player profile',draft.levels.playerProfiles); if(source===false)return; const base=source?clone(draft.levels.playerProfiles[source]):{label:'',level:105,characterTable:null,oddityTalentTable:null,martialArtsTalentTable:null,tuningTable:null,coefficientTable:null,arsenalTable:null,foodBonus:{minPhys:120,maxPhys:240}}; const level=Number(prompt('Player level:',String(base.level||105))); if(!Number.isInteger(level))return alert('Enter a whole-number level.'); draft.levels.playerProfiles[id]={...base,label:`Lv.${level}`,level}; renderFriendly(); }),
      action('+ Add enemy level',()=>{ const id=askId('New enemy level ID, for example 105:',draft.levels.enemyLevels); if(!id)return; const level=Number(id); if(!Number.isInteger(level))return alert('Use a whole-number level ID.'); const source=chooseSource('enemy level',draft.levels.enemyLevels); if(source===false)return; draft.levels.enemyLevels[id]=source?clone(draft.levels.enemyLevels[source]):{label:`Lv.${level}`,level,defense:0,resistance:0}; draft.levels.enemyLevels[id].label=`Lv.${level}`; draft.levels.enemyLevels[id].level=level; renderFriendly(); }),
      action('+ Add Arsenal table',()=>{ const id=askId('New Arsenal table ID, for example level-105:',draft.levels.arsenalTables); if(!id)return; const source=chooseSource('Arsenal table',draft.levels.arsenalTables); if(source===false)return; draft.levels.arsenalTables[id]=source?clone(draft.levels.arsenalTables[source]):{minAttack:0,maxAttack:0}; renderFriendly(); }));
  }
  if (section==='baseTuningStats') actions.append(action('+ Add base tuning table',()=>{ const id=askId('New tuning table ID, for example level-105:',draft.baseTuningStats); if(!id)return; const source=chooseSource('tuning table',draft.baseTuningStats); if(source===false)return; draft.baseTuningStats[id]=source?clone(draft.baseTuningStats[source]):{sourceBracket:96,maxRolls:{minMaxPhys:0,precision:0,crit:0,affinity:0,coreAttribute:0,attributeAttack:0,physPen:0,attributePen:0,maxHp:0,physicalDefense:0,specifiedWeaponBoost:0,allMartialArtsBoost:0,bossDamage:0,attackTypeDamage:null,mysticDamage:0,skillAttunement:0},attunementRange:{min:0,max:0}}; renderFriendly(); }));
  if (section==='baseCharacterStats') actions.append(action('+ Add base character table',()=>{ const id=askId('New base character table ID, for example level-105:',draft.baseCharacterStats); if(!id)return; const source=chooseSource('base character table',draft.baseCharacterStats); if(source===false)return; const template=globalThis.WWM_DEFAULT_CONFIG.baseCharacterStats['level-100-fixed']; draft.baseCharacterStats[id]=source?clone(draft.baseCharacterStats[source]):Object.fromEntries(Object.keys(template).map(key=>[key,0])); renderFriendly(); }));
  if (section==='oddityTalentStats') actions.append(
    action('+ Add Player Level Talent List',async()=>{const choice=await selectPlayerTalentList();if(!choice)return;const id=`level-${choice.level}-talents`;if(Object.hasOwn(draft.oddityTalentStats,id))return alert(`“${id}” already exists.`);const source=choice.sourceId?clone(draft.oddityTalentStats[choice.sourceId]):{entries:[]};draft.oddityTalentStats[id]={...source,label:`Level ${choice.level} - Post-Breakthrough Player Talents`,levelIndependent:false};renderFriendly();}),
    action('+ Map New Oddity',async()=>{const choice=await selectOddityMapping();if(!choice)return;const target=draft.oddityTalentStats[choice.tableId];target.entries??=[];if(target.entries.some(entry=>entry.name===choice.name))return alert('An Oddity with that name is already mapped.');const template=Object.values(draft.oddityTalentStats).filter(table=>table.levelIndependent).flatMap(table=>table.entries||[]).find(entry=>entry.name===choice.sourceName);const entry=template?clone(template):{name:choice.name,enabled:true,bonuses:{}};entry.name=choice.name;target.entries.push(entry);renderFriendly();}),
    action('+ Add Bonus to Mapped Entry',async()=>{const choice=await selectMappedEntryBonus();if(!choice)return;const entry=draft.oddityTalentStats[choice.tableId].entries[choice.entryIndex];entry.bonuses??={};entry.bonuses[choice.statKey]=choice.value;renderFriendly();})
  );
  if (section==='martialArtsTalents') actions.append(action('+ Add Martial Arts talents table',()=>{ const id=askId('New Martial Arts talents table ID:',draft.martialArtsTalents); if(!id)return; const source=chooseSource('Martial Arts talents table',draft.martialArtsTalents); if(source===false)return; draft.martialArtsTalents[id]=source?clone(draft.martialArtsTalents[source]):{label:humanize(id),entries:[]}; renderFriendly(); }));
  if (section==='martialArtsTalents') actions.append(action('+ Add talent entry',async()=>{ const choice=await selectLayerEntryDestination({title:'Add talent entry',tables:draft.martialArtsTalents,tableLabel:'Martial Arts talents table',templateLabel:'Start from',defaultName:'New Martial Arts talent'}); if(!choice)return; const target=draft.martialArtsTalents[choice.tableId]; target.entries??=[]; if(target.entries.some(entry=>entry.name===choice.name))return alert('An entry with that name already exists in the selected table.'); const template=Object.values(draft.martialArtsTalents).flatMap(table=>table.entries||[]).find(entry=>entry.name===choice.sourceName); const entry=template?clone(template):{name:choice.name,enabled:true,bonuses:{}}; entry.name=choice.name; target.entries.push(entry); renderFriendly(); }));
  if (section==='skillCoefficients') actions.append(
    action('+ Add Martial Arts table',()=>{ const id=askId('New Martial Arts table ID, for example stonesplit-105:',draft.skillCoefficients); if(!id)return; const source=chooseSource('Martial Arts table',draft.skillCoefficients); if(source===false)return; draft.skillCoefficients[id]=source?clone(draft.skillCoefficients[source]):{coefficientRules:[],namedStatRules:[],innerWayRules:[]}; renderFriendly(); }),
    action('+ Add Skill',async()=>{ const choice=await selectSkillDestination(); if(!choice)return; const rules=Object.values(draft.skillCoefficients).flatMap(x=>x.coefficientRules||[]); const template=rules.find(x=>x.name===choice.sourceName); if(!template)return alert('No source skill is available.'); const entry=clone(template); if(choice.createNew){entry.name=choice.name;if(choice.key)entry.skillName=choice.key;else delete entry.skillName;} const target=draft.skillCoefficients[choice.tableId]; if(target.coefficientRules.some(rule=>(rule.skillName||rule.name)===(entry.skillName||entry.name)))return alert('That skill already exists in the selected table.'); target.coefficientRules.push(entry); renderFriendly(); }),
    action('+ Add Inner Way Buff Data',async()=>{ const choice=await selectInnerWayDestination(); if(!choice)return; const target=draft.skillCoefficients[choice.tableId]; target.innerWayRules??=[]; const template=Object.values(draft.skillCoefficients).flatMap(x=>x.innerWayRules||[]).find(rule=>rule.key===choice.key); if(!template)return alert('No Inner Way template is available.'); const entry=clone(template); if(choice.createNew){entry.name=choice.name;entry.key=choice.newKey;} if(target.innerWayRules.some(rule=>rule.key===entry.key))return alert('That Inner Way already exists in the selected table.'); target.innerWayRules.push(entry); renderFriendly(); })
  );
  if (section==='baseGearStats') actions.append(action('+ Add base gear level',()=>{ const id=askId('New gear level, for example 101:',draft.baseGearStats); if(!id)return; if(!/^\d+$/.test(id))return alert('Use a whole-number gear level.'); const source=chooseSource('gear level',draft.baseGearStats); if(source===false)return; draft.baseGearStats[id]=source?clone(draft.baseGearStats[source]):{relayEligible:false,weapon:{legendary:{},epic:{}},pendant:{legendary:{},epic:{}},disc:{legendary:{},epic:{}},lightArmor:{legendary:{},epic:{}},greaves:{legendary:{},epic:{}},chest:{legendary:{},epic:{}},bowSet:{precision:0,crit:0,affinity:0},armorSets:{rainwhisper:0,ivorybloom:0,hawkwing:0,shatteredridge:0}}; renderFriendly(); }));
  if (actions.childElementCount) container.appendChild(actions);
}
function renderFriendly() { for (const [key,container] of Object.entries(friendly)) { container.replaceChildren(); addActions(key,container); renderNode(container,draft[key],[],draft[key]); } }
function writeJson() { for (const [key,field] of Object.entries(fields)) field.value=JSON.stringify(draft[key],null,2); }
function readJson() { const next={schemaVersion:3}; for (const [key,field] of Object.entries(fields)) next[key]=JSON.parse(field.value); draft=next; }
function show(config) { draft=clone(config); writeJson(); renderFriendly(); }
function changedPaths(before,after,path='') {
  if (JSON.stringify(before)===JSON.stringify(after)) return [];
  if (!before || !after || typeof before!=='object' || typeof after!=='object') return [path||'configuration'];
  const keys=new Set([...Object.keys(before),...Object.keys(after)]);
  return [...keys].flatMap(key=>changedPaths(before[key],after[key],path?`${path} > ${key}`:key));
}

document.querySelectorAll('.tab').forEach(button => button.onclick = () => { document.querySelectorAll('.tab,.panel').forEach(x => x.classList.remove('active')); button.classList.add('active'); document.getElementById(button.dataset.panel).classList.add('active'); });
document.querySelector('[data-panel="progression"]').textContent='Oddities & Player Talents';
document.querySelector('#progression>.hint').textContent='Post-Breakthrough Player Talents are linked to the selected Player Profile. Earlier mandatory progression is already included in Base character stats. Oddities are level-independent and apply to every patched player level.';
document.querySelector('#martial-talents>.hint').textContent='Martial Arts Talent values assume that 100% of their conditions are fulfilled. These bonuses remain separate from Base character stats and Inner Ways.';
document.querySelectorAll('.mode').forEach(button => button.onclick = () => {
  try {
    if (button.dataset.mode === mode) return;
    if (mode === 'json') { readJson(); renderFriendly(); } else writeJson();
    mode=button.dataset.mode;
    document.querySelectorAll('.mode').forEach(x => x.classList.toggle('active',x===button));
    document.querySelectorAll('.friendly').forEach(x => x.classList.toggle('active',mode==='friendly'));
    document.querySelectorAll('.json-editor').forEach(x => x.classList.toggle('hidden',mode!=='json'));
    document.getElementById('mode-hint').textContent = mode === 'friendly' ? 'Edit individual names and values. Advanced JSON remains available for adding or restructuring complete entries.' : 'Advanced mode: edit the complete JSON structures directly.';
    status.textContent='';
  } catch(error) { status.textContent=`Cannot switch modes: ${error.message}`; }
});

function validate(config) {
  const profiles=config.levels?.playerProfiles;
  if (!profiles || !profiles[config.levels.defaultPlayerProfile]) throw new Error('defaultPlayerProfile must name an existing player profile.');
  if (!profiles[config.levels.recommendedPlayerProfile]) throw new Error('Recommended player profile must name an existing player profile.');
  if (!config.levels.enemyLevels?.[config.levels.recommendedEnemyLevel]) throw new Error('Recommended enemy level must name an existing enemy level.');
  if (!Number.isFinite(config.levels.relayMultiplier) || config.levels.relayMultiplier<=0 || config.levels.relayMultiplier>1) throw new Error('Relay multiplier must be greater than 0 and no more than 1.');
  for (const [id,p] of Object.entries(profiles)) {
    if (!Number.isInteger(p.level) || !p.label) throw new Error(`Player profile ${id} needs a label and integer level.`);
    if (p.tuningTable && !config.baseTuningStats[p.tuningTable]) throw new Error(`Player profile ${id} refers to missing tuning table ${p.tuningTable}.`);
    if (p.characterTable && !config.baseCharacterStats[p.characterTable]) throw new Error(`Player profile ${id} refers to missing base character table ${p.characterTable}.`);
    if (p.oddityTalentTable && !config.oddityTalentStats[p.oddityTalentTable]) throw new Error(`Player profile ${id} refers to missing Oddities & general talents table ${p.oddityTalentTable}.`);
    if (p.martialArtsTalentTable && !config.martialArtsTalents[p.martialArtsTalentTable]) throw new Error(`Player profile ${id} refers to missing Martial Arts talents table ${p.martialArtsTalentTable}.`);
    if (p.coefficientTable && !config.skillCoefficients[p.coefficientTable]) throw new Error(`Player profile ${id} refers to missing coefficient table ${p.coefficientTable}.`);
    if (p.arsenalTable && !config.levels.arsenalTables?.[p.arsenalTable]) throw new Error(`Player profile ${id} refers to missing Arsenal table ${p.arsenalTable}.`);
    if (![p.foodBonus?.minPhys,p.foodBonus?.maxPhys].every(Number.isFinite)) throw new Error(`Player profile ${id} needs numeric Food Bonus minPhys and maxPhys values.`);
  }
  for (const [id,e] of Object.entries(config.levels.enemyLevels||{})) if (![e.level,e.defense,e.resistance].every(Number.isFinite)) throw new Error(`Enemy level ${id} needs numeric level, defense, and resistance.`);
  const percentageKeys=['precision','crit','affinity','specifiedWeaponBoost','allMartialArtsBoost','bossDamage','mysticDamage','skillAttunement'];
  for(const [id,table] of Object.entries(config.baseTuningStats||{}))for(const key of percentageKeys){const value=table.maxRolls?.[key];if(Number.isFinite(value)&&(value<0||value>2))throw new Error(`${id} > ${key} must use decimal form, for example 0.06 for 6%.`);}
  for (const [level,data] of Object.entries(config.baseGearStats||{})) for (const key of ['weapon','pendant','disc','lightArmor','greaves','chest']) if (!data[key]) throw new Error(`Gear level ${level} is missing ${key}.`);
}
async function load() { const saved=await ext.storage.local.get(['wwmConfig','wwmCompatibility']); savedConfig=normalizeConfig(saved.wwmConfig); show(savedConfig); const c=saved.wwmCompatibility; const banner=document.getElementById('compatibility'); if(!c)banner.textContent='Compatibility has not been checked yet. Open or reload the calculator.'; else if(c.versionMatch===false||c.appError||c.workerError){banner.textContent=`⚠ Compatibility warning: ${c.appError||c.workerError||`website app ${c.actualAppVersion||'unknown'}; supported ${c.expectedAppVersion}`}. The patch may be compromised.`;banner.style.color='#ff9b9b';}else banner.textContent=`✓ Website compatibility check passed${c.actualAppVersion?` (app ${c.actualAppVersion})`:''}.`; }
document.getElementById('save').onclick=async()=>{ try { if(mode==='json') readJson(); validate(draft); const changes=changedPaths(savedConfig,draft); if(!changes.length){status.textContent='No changes to save.';return;} const preview=changes.slice(0,18).map(x=>`• ${x}`).join('\n'); if(!confirm(`Save ${changes.length} changed value(s)?\n\n${preview}${changes.length>18?'\n• …':''}`))return; await ext.storage.local.set({wwmConfigBackup:savedConfig,wwmConfig:draft}); savedConfig=clone(draft); writeJson(); if(mode==='friendly') renderFriendly(); status.textContent='Saved. Previous configuration backed up. Reload the calculator to apply it.'; } catch(error) { status.textContent=`Not saved: ${error.message}`; } };
document.getElementById('export').onclick=()=>{ try { if(mode==='json')readJson(); validate(draft); const blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download='wwm-patch-configuration.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); status.textContent='Configuration exported.'; } catch(error){status.textContent=`Not exported: ${error.message}`;} };
document.getElementById('import').onclick=()=>document.getElementById('import-file').click();
document.getElementById('import-file').onchange=async event=>{ try { const file=event.target.files[0]; if(!file)return; const imported=normalizeConfig(JSON.parse(await file.text())); validate(imported); show(imported); status.textContent='Imported for review. Select Review and save to apply it.'; } catch(error){status.textContent=`Not imported: ${error.message}`;} finally{event.target.value='';} };
document.getElementById('rollback').onclick=async()=>{ const stored=await ext.storage.local.get(['wwmConfig','wwmConfigBackup']); if(!stored.wwmConfigBackup){status.textContent='No previous save is available.';return;} if(!confirm('Restore the configuration from before the last save?'))return; await ext.storage.local.set({wwmConfigBackup:stored.wwmConfig||savedConfig,wwmConfig:stored.wwmConfigBackup}); savedConfig=clone(stored.wwmConfigBackup); show(savedConfig); status.textContent='Previous configuration restored. Reload the calculator.'; };
document.getElementById('reset').onclick=async()=>{ const config=clone(globalThis.WWM_DEFAULT_CONFIG); await ext.storage.local.set({wwmConfigBackup:savedConfig,wwmConfig:config,wwmRuntime:{playerProfile:null,nativePlayerLevel:null}}); savedConfig=clone(config); show(config); status.textContent='Defaults restored. Previous configuration backed up.'; };
const credits=document.createElement('footer');
credits.append('Unofficial WWM Calculator Data Patch · ');
const repository=document.createElement('a');
repository.href='https://github.com/Ginebra-cazador/WWMath-Add-on';
repository.target='_blank';
repository.rel='noopener noreferrer';
repository.textContent='GitHub';
repository.style.color='#9db2ff';
credits.append(repository,' · Credits: ');
const discordIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');
discordIcon.setAttribute('viewBox','0 0 24 24');
discordIcon.setAttribute('width','16');
discordIcon.setAttribute('height','16');
discordIcon.setAttribute('aria-label','Discord');
discordIcon.style.cssText='vertical-align:-3px;margin-right:4px;fill:#8c9eff';
const discordPath=document.createElementNS('http://www.w3.org/2000/svg','path');
discordPath.setAttribute('d','M19.5 5.3A16.3 16.3 0 0 0 15.4 4l-.5 1a15.2 15.2 0 0 0-5.8 0l-.5-1a16.4 16.4 0 0 0-4.1 1.3C1.9 9.2 1.2 13 1.5 16.8a16.7 16.7 0 0 0 5 2.5l1.2-1.7a10.7 10.7 0 0 1-1.9-.9l.5-.4c3.7 1.7 7.7 1.7 11.4 0l.5.4c-.6.4-1.2.7-1.9.9l1.2 1.7a16.7 16.7 0 0 0 5-2.5c.4-4.4-.7-8.1-3-11.5ZM8.7 14.5c-1.1 0-2-1-2-2.2 0-1.2.9-2.2 2-2.2s2 1 2 2.2c0 1.2-.9 2.2-2 2.2Zm6.6 0c-1.1 0-2-1-2-2.2 0-1.2.9-2.2 2-2.2s2 1 2 2.2c0 1.2-.9 2.2-2 2.2Z');
discordIcon.appendChild(discordPath);
credits.append(discordIcon,'@.ginebra');
credits.style.cssText='margin:28px 0 8px;padding-top:14px;border-top:1px solid #303956;color:#808ba9;text-align:center;font-size:13px';
document.body.appendChild(credits);
load();
