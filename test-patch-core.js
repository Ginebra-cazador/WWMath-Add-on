'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const har = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function body(pattern) {
  const content = har.log.entries.find(x => pattern.test(x.request.url)).response.content;
  return content.encoding === 'base64' ? Buffer.from(content.text, 'base64').toString('utf8') : content.text;
}
const app = body(/\/js\/app\.js/);
const worker = body(/\/js\/simulationWorker\.js/);
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync('firefox/config.js','utf8'), context);
vm.runInContext(fs.readFileSync('firefox/patch-core.js','utf8'), context);
const config = context.WWMPatchCore.normalize(context.WWM_DEFAULT_CONFIG);
if(config.levels.recommendedPlayerProfile!=='fixed-100'||config.levels.recommendedEnemyLevel!=='96')throw new Error('Recommended level defaults were not normalized.');
if(config.levels.playerProfiles['fixed-100'].foodBonus.minPhys!==120||config.levels.playerProfiles['fixed-100'].foodBonus.maxPhys!==240)throw new Error('Player-profile Food Bonus defaults were not normalized.');
const legacyConfig = JSON.parse(JSON.stringify(context.WWM_DEFAULT_CONFIG));
delete legacyConfig.oddityTalentStats;
delete legacyConfig.martialArtsTalents;
delete legacyConfig.levels.playerProfiles['fixed-100'].oddityTalentTable;
delete legacyConfig.levels.playerProfiles['fixed-100'].martialArtsTalentTable;
Object.assign(legacyConfig.baseCharacterStats['level-100-fixed'],{power:153,agility:153,momentum:153,body:153,defense:153,minPhys:673.21888,maxPhys:1155.30936,minPrimaryAttribute:327.8,maxPrimaryAttribute:657.8,precision:0.968,crit:0.27404272,affinity:0.16914,attrDmgBonus:0.02});
const migrated = context.WWMPatchCore.normalize(legacyConfig);
if (Math.abs(migrated.baseCharacterStats['level-100-fixed'].power-150)>1e-9 || Math.abs(migrated.baseCharacterStats['level-100-fixed'].minPhys-629.21888)>1e-9 || Math.abs(migrated.baseCharacterStats['level-100-fixed'].maxPhys-881.40936)>1e-9 || migrated.levels.playerProfiles['fixed-100'].martialArtsTalentTable!=='stonesplit-complete') throw new Error(`Legacy corrected character table was not migrated into additive layers (${JSON.stringify(migrated.baseCharacterStats['level-100-fixed'])}).`);
const migratedApp = context.WWMPatchCore.patchApp(app,migrated,'fixed-100');
if (!migratedApp.includes("'maxPhys':1155.30936+zr(") || !migratedApp.includes("'stonesplitPen':4")) throw new Error('Migrated configuration did not preserve the corrected effective values.');
const earlierSplit = JSON.parse(JSON.stringify(context.WWM_DEFAULT_CONFIG));
earlierSplit.martialArtsTalents['stonesplit-complete'].entries=earlierSplit.martialArtsTalents['stonesplit-complete'].entries.filter(entry=>entry.name!=='Charge Calculation Enhancement');
Object.assign(earlierSplit.baseCharacterStats['level-100-fixed'],{power:137,agility:137,momentum:137,body:137,defense:137,minPhys:595.68,maxPhys:947.34,precision:0.94,crit:0.29844,affinity:0.14922});
earlierSplit.oddityTalentStats['level-100-complete'].entries[0]={name:'Level 100 progression and general talents (reconciled)',enabled:true,bonuses:{power:16,agility:16,momentum:16,body:16,defense:16,minPhys:33.53888,maxPhys:54.06936,precision:0.028,crit:-0.02439728,affinity:0.01992}};
const migratedSplit=context.WWMPatchCore.normalize(earlierSplit);
if(Math.abs(migratedSplit.baseCharacterStats['level-100-fixed'].power-150)>1e-9||Math.abs(migratedSplit.baseCharacterStats['level-100-fixed'].maxPhys-881.40936)>1e-9||migratedSplit.oddityTalentStats['level-100-complete'].entries[0].name!=='Normal Talent Tree - Breakthrough 16 New Nodes'||!migratedSplit.oddityTalentStats['completed-oddities'].levelIndependent||!migratedSplit.martialArtsTalents['stonesplit-complete'].entries.some(entry=>entry.name==='Charge Calculation Enhancement'&&entry.bonuses.maxPhys===120))throw new Error('Earlier additive-layer test configuration was not migrated to the corrected split.');
const migratedSplitApp=context.WWMPatchCore.patchApp(app,migratedSplit,'fixed-100');
if(!migratedSplitApp.includes("'maxPhys':1155.30936+zr("))throw new Error('Earlier additive-layer migration changed the effective values.');
const combinedBonuses=JSON.parse(JSON.stringify(context.WWM_DEFAULT_CONFIG));
const movedOddities=combinedBonuses.oddityTalentStats['completed-oddities'].entries;
movedOddities.find(entry=>entry.name==='Hexi Oddities').enabled=false;
combinedBonuses.oddityTalentStats['level-100-complete'].entries.push(...movedOddities);
delete combinedBonuses.oddityTalentStats['completed-oddities'];
const separatedBonuses=context.WWMPatchCore.normalize(combinedBonuses);
if(separatedBonuses.oddityTalentStats['level-100-complete'].entries.length!==1||separatedBonuses.oddityTalentStats['completed-oddities'].entries.find(entry=>entry.name==='Hexi Oddities').enabled!==false)throw new Error('Combined saved Oddities were not moved into the level-independent table without losing selections.');
const fixedApp = context.WWMPatchCore.patchApp(app, config, 'fixed-100');
const fixedWorker = context.WWMPatchCore.patchWorker(worker, config, config.levels.playerProfiles['fixed-100']);
for (const expected of [
  "bu={'power':153,'agility':153,'momentum':153",
  "'minPhys':673.21888+zr(",
  "'maxPhys':1155.30936+zr(",
  "'_minPrimaryAttr':327.8",
  "'_maxPrimaryAttr':657.8",
  "'precision':0.968+zr(",
  "'crit':0.27404272+zr(",
  "'affinity':0.16914+zr(",
  "'stonesplitPen':4",
  "'attrDmgBonus':0.02"
]) if (!fixedApp.includes(expected)) throw new Error(`Composed Level 100 character value was not applied: ${expected}`);
if (!fixedApp.includes("['96']={\"legendary\":{\"minPhys\":65,\"maxPhys\":151}")) throw new Error('Level 96 gear was not injected.');
if(!/\[[^\]]+\]=120,[\w$]+\[[^\]]+\]=240;const/.test(fixedApp))throw new Error('Player-profile Food Bonus table was not applied.');
if (!/var\s+[\w$]+=0\.06,[\w$]+=\['leftWeapon'/.test(fixedApp)) throw new Error('Fixed attunement cap is not 6%.');
if (!/\([\w$]+,[\w$]+,[\w$]+\['level'\]\)/.test(fixedApp)) throw new Error('Gear level is not forwarded to the Re-Attune table lookup.');
if (!fixedWorker.includes("'physCoeff':7.2368,'flatPhys':2002")) throw new Error('Fixed coefficients were not applied.');
if (!fixedWorker.includes("'exquisiteScenery':{0xd:{'crit':0.063},0xe:{'crit':0.074},0xf:{'crit':0.086}")) throw new Error('Updated Exquisite Scenery value was not applied.');
if (!fixedWorker.includes("'battleAnthem':{0xd:{'affinity':0.028},0xe:{'affinity':0.033},0xf:{'affinity':0.039}")) throw new Error('Updated Battle Anthem value was not applied.');
if (!fixedWorker.includes("'precision':{'name':") || !fixedWorker.includes("'value':0.04") || !fixedWorker.includes("'value':0.045") || !fixedWorker.includes("'value':0.022")) throw new Error('Level 96 Bow Set values were not applied to the worker.');
if (!/=131,[\s\S]{0,100}=263/.test(fixedApp)) throw new Error(`Level 100 Arsenal attack values were not applied (${fixedApp.indexOf('=131,')}, ${fixedApp.indexOf('=263')}).`);
for (const label of ['+8% Precision','+9% Crit Rate','+4.5% Affinity','+78 Min Phys','+4% Precision']) if(!fixedApp.includes(`'${label}'`)) throw new Error(`${label} was not applied to the visible set table.`);
const custom = JSON.parse(JSON.stringify(config));
custom.levels.enemyLevels['105'] = { label:'Lv.105 test', level:105, defense:500, resistance:0.85 };
custom.levels.relayMultiplier = 0.93;
custom.levels.playerProfiles['fixed-100'].foodBonus={minPhys:150,maxPhys:300};
custom.baseGearStats['96'].armorSets.rainwhisper = 0.081;
custom.baseGearStats['96'].armorSets.ivorybloom = 0.091;
custom.baseGearStats['96'].armorSets.hawkwing = 0.046;
custom.baseGearStats['96'].armorSets.shatteredridge = 79;
custom.oddityTalentStats['completed-oddities'].entries.find(entry=>entry.name==='Hidden Mountain: Suixiang Oddities').enabled=false;
const customApp = context.WWMPatchCore.patchApp(app, custom, 'fixed-100');
const customWorker = context.WWMPatchCore.patchWorker(worker, custom, custom.levels.playerProfiles['fixed-100']);
if (!customApp.includes("['105']=500") || !customApp.includes("['105']=0.85")) throw new Error('Future enemy level was not injected.');
if (!/var\s+[\w$]+=0\.93,[\w$]+=\[/.test(customApp)) throw new Error('Configured relay multiplier was not applied.');
if(!/\[[^\]]+\]=150,[\w$]+\[[^\]]+\]=300;const/.test(customApp))throw new Error('Custom player-profile Food Bonus table was not applied.');
if (!customApp.includes("'minPhys':665.21888+zr(") || !customApp.includes("'maxPhys':1139.30936+zr(")) throw new Error('Disabled oddity was not removed from the composed character values.');
const globalOnly=JSON.parse(JSON.stringify(config));
globalOnly.levels.playerProfiles['fixed-100'].oddityTalentTable=null;
globalOnly.levels.playerProfiles['fixed-100'].martialArtsTalentTable=null;
const globalOnlyApp=context.WWMPatchCore.patchApp(app,globalOnly,'fixed-100');
if(!globalOnlyApp.includes("'minPhys':673.21888+zr(")||!globalOnlyApp.includes("'maxPhys':961.40936+zr(")||!globalOnlyApp.includes("bu={'power':150,'agility':150,'momentum':150"))throw new Error('Level-independent Oddities did not apply independently of the selected player talent table.');
const withoutCharge = JSON.parse(JSON.stringify(config));
withoutCharge.martialArtsTalents['stonesplit-complete'].entries.find(entry=>entry.name==='Charge Calculation Enhancement').enabled=false;
const withoutChargeApp = context.WWMPatchCore.patchApp(app, withoutCharge, 'fixed-100');
if (!withoutChargeApp.includes("'maxPhys':1035.30936+zr(")) throw new Error('Charge Calculation Enhancement was not isolated as a +120 Max Physical Attack Martial Arts talent.');
for (const [key,value] of [['rainwhisper',0.081],['ivorybloom',0.091],['hawkwing',0.046],['shatteredridge',79]]) {
  const start=customWorker.indexOf(`'${key}':{`), part=customWorker.slice(start,start+700);
  if(start<0||!part.includes(`'value':${value}`))throw new Error(`${key} armor-set value was not applied.`);
}
for (const browserName of ['firefox', 'chrome']) {
  const optionsSource = fs.readFileSync(path.join(__dirname, browserName, 'options.js'), 'utf8');
  for (const label of [
    '+ Add Player Level Talent List',
    '+ Map New Oddity',
    '+ Add Bonus to Mapped Entry'
  ]) if (!optionsSource.includes(`action('${label}'`)) throw new Error(`${browserName} is missing ${label}`);
  if (optionsSource.includes("action('+ Add Oddities & general talents table'")) throw new Error(`${browserName} still exposes the combined list action`);
  if (optionsSource.includes("action('+ Add bonus entry'")) throw new Error(`${browserName} still exposes the combined bonus action`);
  if(!optionsSource.includes("key==='recommendedPlayerProfile'")||!optionsSource.includes("key==='recommendedEnemyLevel'"))throw new Error(`${browserName} is missing recommended-level dropdowns.`);
  const contentSource=fs.readFileSync(path.join(__dirname,browserName,'content.js'),'utf8');
  if(!contentSource.includes('Apply Recommended Levels')||!contentSource.includes('applyRecommendedLevels'))throw new Error(`${browserName} is missing the recommended-level action.`);
}
console.log('Schema 3 patch tests passed.');
