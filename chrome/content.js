'use strict';

const ext = globalThis.browser || globalThis.chrome;
let config = globalThis.WWM_DEFAULT_CONFIG;
let runtime = { playerProfile: config.levels.defaultPlayerProfile };
let restoring = false;
let pendingGearLevel = null;
let pendingGearUntil = 0;
let gearLevelMemory = {};
try { gearLevelMemory=JSON.parse(sessionStorage.getItem('wwmGearLevelMemory')||'{}'); } catch (_) {}

function gearSlotKey(select) {
  let node=select;
  for(let depth=0;node&&depth<8;depth++,node=node.parentElement){
    const heading=[...(node.querySelectorAll?.('h1,h2,h3,h4,.section-title')||[])].find(x=>/Edit\s*:/i.test(x.textContent||''));
    const match=heading?.textContent?.match(/Edit\s*:\s*([^\n]+)/i);
    if(match)return match[1].trim().toLowerCase();
  }
  return null;
}

function rememberGearLevel(select, level) {
  const key=gearSlotKey(select); if(!key)return;
  gearLevelMemory[key]=level;
  try { sessionStorage.setItem('wwmGearLevelMemory',JSON.stringify(gearLevelMemory)); } catch (_) {}
}

function isGearSelect(select) {
  const values = [...select.options].map(x => x.value);
  return select.id === 'gt-level-select' || ['71','81','86','91'].every(x => values.includes(x));
}

function rowLabel(select) {
  const parent = select.closest('div,li,tr,label') || select.parentElement;
  return (parent?.textContent || '').replace(select.textContent || '', '').trim().toLowerCase();
}

function isPlayerSelect(select) {
  const values = [...select.options].map(x => x.value);
  return rowLabel(select).includes('player level') || (values.includes('100') && !values.includes('96'));
}

function isEnemySelect(select) {
  return rowLabel(select).includes('enemy level') || [...select.options].some(x => /def:|jr:/i.test(x.textContent));
}

function addOption(select, value, label) {
  let option = [...select.options].find(x => x.value === value);
  if (!option) { option = new Option(label, value); select.add(option); }
  else option.textContent = label;
  return option;
}

function expose(root = document) {
  const selects = root instanceof HTMLSelectElement ? [root] : [...(root.querySelectorAll?.('select') || [])];
  for (const select of selects) {
    if (isGearSelect(select)) {
      for (const level of Object.keys(config.baseGearStats || {})) addOption(select, level, level);
      const remembered=gearLevelMemory[gearSlotKey(select)];
      const wanted=remembered || (pendingGearLevel && Date.now() < pendingGearUntil ? pendingGearLevel : null);
      if (wanted && [...select.options].some(x => x.value === wanted)) select.value = wanted;
    }
    if (isPlayerSelect(select)) {
      for (const [id, data] of Object.entries(config.levels.playerProfiles || {})) addOption(select, `wwm:${id}`, data.label);
      const wanted = `wwm:${runtime.playerProfile}`;
      if (!restoring && [...select.options].some(x => x.value === wanted)) select.value = wanted;
    }
    if (isEnemySelect(select)) {
      for (const data of Object.values(config.levels.enemyLevels || {})) addOption(select, String(data.level), data.label);
    }
  }
}

document.addEventListener('change', async event => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;
  if (isGearSelect(select)) {
    pendingGearLevel = select.value;
    pendingGearUntil = Date.now() + 2500;
    rememberGearLevel(select,select.value);
    setTimeout(() => expose(), 0);
    return;
  }
  if (!isPlayerSelect(select) || restoring) return;
  if (!select.value.startsWith('wwm:')) return;
  event.stopImmediatePropagation();
  const id = select.value.slice(4);
  const selected = config.levels.playerProfiles[id];
  if (!selected) return;
  runtime.playerProfile = id;
  await ext.storage.local.set({ wwmRuntime: runtime });
  restoring = true;
  if (![...select.options].some(x => x.value === String(selected.level))) {
    const bridge = addOption(select, String(selected.level), `Lv.${selected.level}`);
    bridge.hidden = true;
  }
  select.value = String(selected.level);
  select.dispatchEvent(new Event('change', { bubbles: true }));
  restoring = false;
  setTimeout(() => location.reload(), 100);
}, true);

ext.storage.local.get(['wwmConfig','wwmRuntime']).then(result => {
  if (result.wwmConfig?.schemaVersion === 3) config = result.wwmConfig;
  runtime = result.wwmRuntime || { playerProfile: config.levels.defaultPlayerProfile };
  expose();
});

new MutationObserver(mutations => mutations.forEach(x => { expose(x.target); [...x.addedNodes].forEach(expose); })).observe(document.body, { childList: true, subtree: true });

const button = document.createElement('button');
button.type = 'button';
button.textContent = 'Enable WWM Patch';
button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:8px 12px;border:1px solid #d7a94b;border-radius:7px;background:#17233f;color:#f4d58a;font:12px system-ui;cursor:pointer;box-shadow:0 2px 8px #0008';
let attached = false;
button.addEventListener('click', async () => {
  if (!attached) {
    button.textContent = 'Enabling...';
    const result = await ext.runtime.sendMessage({ type: 'wwm-enable' });
    if (!result?.ok) { button.textContent = 'Patch error - retry'; alert(result?.error || 'Could not enable patch.'); }
    return;
  }
  ext.runtime.sendMessage({ type: 'wwm-options' });
});
document.body.appendChild(button);
expose();

ext.runtime.sendMessage({ type: 'wwm-status' }).then(state => {
  attached = Boolean(state?.attached);
  if (attached) button.textContent = state.versionMatch===false || state.error ? 'WWM Patch WARNING ⚠' : (state.appPatched ? 'WWM Patch: ON - Settings' : 'WWM Patch attached...');
});
ext.runtime.onMessage.addListener(message => {
  if (message.type !== 'wwm-patch-state') return;
  attached = Boolean(message.state?.attached);
  button.textContent = message.state?.error || message.state?.versionMatch===false ? 'WWM Patch WARNING ⚠' : (message.state?.appPatched ? 'WWM Patch: ON - Settings' : 'WWM Patch attached...');
  if (message.state?.versionMatch===false) button.title=`Website version ${message.state.actualVersion||'unknown'} differs from supported ${message.state.expectedVersion}. Functionality may be compromised.`;
});
