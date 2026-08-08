'use strict';
const fs = require('fs');
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
const fixedApp = context.WWMPatchCore.patchApp(app, config, 'fixed-100');
const fixedWorker = context.WWMPatchCore.patchWorker(worker, config, config.levels.playerProfiles['fixed-100']);
if (!fixedApp.includes("['96']={\"legendary\":{\"minPhys\":65,\"maxPhys\":151}")) throw new Error('Level 96 gear was not injected.');
if (!/var\s+[\w$]+=0\.06,[\w$]+=\['leftWeapon'/.test(fixedApp)) throw new Error('Fixed attunement cap is not 6%.');
if (!fixedWorker.includes("'physCoeff':7.2368,'flatPhys':2002")) throw new Error('Fixed coefficients were not applied.');
if (!fixedWorker.includes("'exquisiteScenery':{0xd:{'crit':0.063},0xe:{'crit':0.074},0xf:{'crit':0.086}")) throw new Error('Updated Exquisite Scenery value was not applied.');
if (!fixedWorker.includes("'battleAnthem':{0xd:{'affinity':0.028},0xe:{'affinity':0.033},0xf:{'affinity':0.039}")) throw new Error('Updated Battle Anthem value was not applied.');
if (!fixedWorker.includes("'precision':{'name':") || !fixedWorker.includes("'value':0.04") || !fixedWorker.includes("'value':0.045") || !fixedWorker.includes("'value':0.022")) throw new Error('Level 96 Bow Set values were not applied to the worker.');
if (!/=131,[\s\S]{0,100}=263/.test(fixedApp)) throw new Error(`Level 100 Arsenal attack values were not applied (${fixedApp.indexOf('=131,')}, ${fixedApp.indexOf('=263')}).`);
for (const label of ['+8% Precision','+9% Crit Rate','+4.5% Affinity','+78 Min Phys','+4% Precision']) if(!fixedApp.includes(`'${label}'`)) throw new Error(`${label} was not applied to the visible set table.`);
const custom = JSON.parse(JSON.stringify(config));
custom.levels.enemyLevels['105'] = { label:'Lv.105 test', level:105, defense:500, resistance:0.85 };
custom.levels.relayMultiplier = 0.93;
custom.baseGearStats['96'].armorSets.rainwhisper = 0.081;
custom.baseGearStats['96'].armorSets.ivorybloom = 0.091;
custom.baseGearStats['96'].armorSets.hawkwing = 0.046;
custom.baseGearStats['96'].armorSets.shatteredridge = 79;
const customApp = context.WWMPatchCore.patchApp(app, custom, 'fixed-100');
const customWorker = context.WWMPatchCore.patchWorker(worker, custom, custom.levels.playerProfiles['fixed-100']);
if (!customApp.includes("['105']=500") || !customApp.includes("['105']=0.85")) throw new Error('Future enemy level was not injected.');
if (!/var\s+[\w$]+=0\.93,[\w$]+=\[/.test(customApp)) throw new Error('Configured relay multiplier was not applied.');
for (const [key,value] of [['rainwhisper',0.081],['ivorybloom',0.091],['hawkwing',0.046],['shatteredridge',79]]) {
  const start=customWorker.indexOf(`'${key}':{`), part=customWorker.slice(start,start+700);
  if(start<0||!part.includes(`'value':${value}`))throw new Error(`${key} armor-set value was not applied.`);
}
console.log('Schema 3 patch tests passed.');
