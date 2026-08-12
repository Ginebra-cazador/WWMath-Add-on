'use strict';

const ext = globalThis.browser || globalThis.chrome;
let config = globalThis.WWM_DEFAULT_CONFIG;
let runtime = { playerProfile: null, enemyLevel: null };
let restoring = false;
let pendingGearLevel = null;
let pendingGearUntil = 0;
let gearLevelMemory = {};
let recommendedButton = null;
let updateLink = null;
let attached = false;
let applyingRecommendedLevels = false;
const attemptedEnemySynchronizations = new Set();
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

function recommendedLevelsAreSelected() {
  const profileId = config.levels.recommendedPlayerProfile || config.levels.defaultPlayerProfile || Object.keys(config.levels.playerProfiles || {})[0];
  const enemyId = config.levels.recommendedEnemyLevel || Object.keys(config.levels.enemyLevels || {})[0];
  const enemy = config.levels.enemyLevels?.[enemyId];
  const visibleEnemySelect = [...document.querySelectorAll('select')].find(isEnemySelect);
  const currentEnemyLevel = visibleEnemySelect?.value || runtime.enemyLevel;
  return Boolean(profileId && enemy && runtime.playerProfile === profileId && Number(currentEnemyLevel) === Number(enemy.level));
}

function updateRecommendedButtonVisibility() {
  if (!recommendedButton) return;
  const selected = recommendedLevelsAreSelected();
  const visible = attached && (applyingRecommendedLevels || !selected);
  recommendedButton.style.display = visible ? 'block' : 'none';
  if (updateLink) updateLink.style.bottom = visible ? '96px' : '54px';
}

function synchronizeEnemySelect(select) {
  if (!select.isConnected || !select.value) return;
  let container = select.parentElement;
  for (let depth = 0; container && depth < 6; depth++, container = container.parentElement) {
    const match = (container.textContent || '').match(/Empty\s*=\s*use\s*Lv\.?\s*(\d+)/i);
    if (!match) continue;
    const displayedLevel = Number(select.value), internalLevel = Number(match[1]);
    if (displayedLevel === internalLevel) return;
    const signature = `${displayedLevel}:${internalLevel}`;
    if (attemptedEnemySynchronizations.has(signature)) return;
    attemptedEnemySynchronizations.add(signature);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
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
      const wanted = runtime.playerProfile ? `wwm:${runtime.playerProfile}` : null;
      if (!restoring && wanted && [...select.options].some(x => x.value === wanted)) select.value = wanted;
    }
    if (isEnemySelect(select)) {
      for (const data of Object.values(config.levels.enemyLevels || {})) addOption(select, String(data.level), data.label);
      setTimeout(() => synchronizeEnemySelect(select), 0);
      setTimeout(() => synchronizeEnemySelect(select), 500);
    }
  }
  updateRecommendedButtonVisibility();
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
  if (isEnemySelect(select) && !restoring) {
    runtime = { ...runtime, enemyLevel: Number(select.value) || null };
    await ext.storage.local.set({ wwmRuntime: runtime });
    updateRecommendedButtonVisibility();
    return;
  }
  if (!isPlayerSelect(select) || restoring) return;
  if (!select.value.startsWith('wwm:')) {
    runtime = { ...runtime, playerProfile: null, nativePlayerLevel: Number(select.value) || null };
    await ext.storage.local.set({ wwmRuntime: runtime });
    setTimeout(() => location.reload(), 100);
    return;
  }
  event.stopImmediatePropagation();
  const id = select.value.slice(4);
  const selected = config.levels.playerProfiles[id];
  if (!selected) return;
  runtime = { ...runtime, playerProfile: id, nativePlayerLevel: null };
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
  runtime = result.wwmRuntime || { playerProfile: null, enemyLevel: null };
  expose();
});

new MutationObserver(mutations => mutations.forEach(x => { expose(x.target); [...x.addedNodes].forEach(expose); })).observe(document.body, { childList: true, subtree: true });

const wait = milliseconds => new Promise(resolve => setTimeout(resolve,milliseconds));
function openWebsiteSettings() {
  const candidate=[...document.querySelectorAll('[role="tab"],button,a,[data-tab]')].find(element=>{
    const text=(element.textContent||'').trim();
    return element.getAttribute('aria-controls')==='tab-panel-settings' ||
      element.dataset?.tab==='settings' ||
      (!/wwm\s+patch/i.test(text) && /settings$/i.test(text));
  });
  candidate?.click();
  return Boolean(candidate);
}
function findShowOtherEnemyLevelsCheckbox() {
  return [...document.querySelectorAll('input[type="checkbox"]')].find(checkbox => {
    let container = checkbox.parentElement;
    for (let depth = 0; container && depth < 6; depth++, container = container.parentElement) {
      if (/show other enemy levels/i.test(container.textContent || '') && container.querySelectorAll('input[type="checkbox"]').length === 1) return true;
    }
    return false;
  });
}
async function enableOtherEnemyLevels() {
  let checkbox = null;
  for (const pause of [0,100,250,500,900]) {
    await wait(pause);
    checkbox = findShowOtherEnemyLevelsCheckbox();
    if (checkbox) break;
  }
  if (!checkbox) return false;
  if (!checkbox.checked) checkbox.click();
  for (const pause of [100,250,500,900]) {
    await wait(pause);
    expose();
    const enemySelect = [...document.querySelectorAll('select')].find(select => isEnemySelect(select) && !select.disabled && select.getAttribute('aria-disabled') !== 'true');
    if (enemySelect) return true;
  }
  return false;
}
function recommendedApplyFailed(message) {
  applyingRecommendedLevels=false;
  recommendedButton.disabled=false;
  recommendedButton.textContent=message;
  setTimeout(() => {
    recommendedButton.textContent='Apply Recommended Levels';
    updateRecommendedButtonVisibility();
  },2500);
}
async function applyRecommendedLevels() {
  const profileId=config.levels.recommendedPlayerProfile||config.levels.defaultPlayerProfile||Object.keys(config.levels.playerProfiles||{})[0];
  const enemyId=config.levels.recommendedEnemyLevel||Object.keys(config.levels.enemyLevels||{})[0];
  const selectedProfile=config.levels.playerProfiles?.[profileId];
  const selectedEnemy=config.levels.enemyLevels?.[enemyId];
  if(!selectedProfile||!selectedEnemy)return alert('Choose valid Recommended Player Profile and Recommended Enemy Level values in WWM Patch Settings.');
  applyingRecommendedLevels=true;
  recommendedButton.disabled=true;
  recommendedButton.textContent='Applying Recommended Levels...';
  openWebsiteSettings();
  let playerSelect=null;
  for(const pause of [0,100,250,500,900]){
    await wait(pause);
    expose();
    const selects=[...document.querySelectorAll('select')];
    playerSelect=selects.find(isPlayerSelect)||playerSelect;
    if(playerSelect&&findShowOtherEnemyLevelsCheckbox())break;
  }
  if(!playerSelect){
    return recommendedApplyFailed('Calculator Settings unavailable');
  }
  if(!await enableOtherEnemyLevels()) return recommendedApplyFailed('Enemy levels unavailable');
  playerSelect=[...document.querySelectorAll('select')].find(isPlayerSelect)||playerSelect;
  restoring=true;
  if(![...playerSelect.options].some(option=>option.value===String(selectedProfile.level))){
    const bridge=addOption(playerSelect,String(selectedProfile.level),`Lv.${selectedProfile.level}`); bridge.hidden=true;
  }
  playerSelect.value=String(selectedProfile.level);
  playerSelect.dispatchEvent(new Event('change',{bubbles:true}));
  restoring=false;
  await wait(250);
  let enemySelect=null;
  for(const pause of [0,100,250,500,900]){
    await wait(pause);
    expose();
    enemySelect=[...document.querySelectorAll('select')].find(select=>isEnemySelect(select)&&!select.disabled&&select.getAttribute('aria-disabled')!=='true');
    if(enemySelect)break;
  }
  if(!enemySelect){
    return recommendedApplyFailed('Enemy levels unavailable');
  }
  addOption(enemySelect,String(selectedEnemy.level),selectedEnemy.label);
  enemySelect.value=String(selectedEnemy.level);
  enemySelect.dispatchEvent(new Event('change',{bubbles:true}));
  runtime={...runtime,playerProfile:profileId,nativePlayerLevel:null,enemyLevel:Number(selectedEnemy.level)};
  await ext.storage.local.set({wwmRuntime:runtime});
  recommendedButton.textContent='Recommended Settings Applied ✓';
  recommendedButton.style.display='block';
  recommendedButton.style.opacity='1';
  await wait(2000);
  recommendedButton.style.opacity='0';
  await wait(300);
  location.reload();
}

const button = document.createElement('button');
button.type = 'button';
button.textContent = 'WWM Patch: OFF - Click to Enable';
button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:8px 12px;border:1px solid #ff6b6b;border-radius:7px;background:#3a1720;color:#ffd0d0;font:12px system-ui;cursor:pointer;box-shadow:0 2px 8px #0008';
function renderPatchState(state) {
  attached = Boolean(state?.attached);
  const warning = Boolean(state?.error || state?.versionMatch === false);
  if (!attached) {
    button.textContent = 'WWM Patch: OFF - Click to Enable';
    button.style.borderColor = '#ff6b6b'; button.style.background = '#3a1720'; button.style.color = '#ffd0d0';
  } else if (warning) {
    button.textContent = 'WWM Patch WARNING ⚠';
    button.style.borderColor = '#ff6b6b'; button.style.background = '#3a1720'; button.style.color = '#ffd0d0';
  } else {
    button.textContent = state?.appPatched ? 'WWM Patch: ON - Settings' : 'WWM Patch: attaching...';
    button.style.borderColor = '#55d98b'; button.style.background = '#17233f'; button.style.color = '#8ff0b6';
  }
  updateRecommendedButtonVisibility();
}
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
recommendedButton=document.createElement('button');
recommendedButton.type='button';
recommendedButton.textContent='Apply Recommended Levels';
recommendedButton.title='Apply the recommended Player Profile and Enemy Level configured in WWM Patch Settings.';
recommendedButton.style.cssText='display:none;position:fixed;right:12px;bottom:54px;z-index:2147483647;padding:8px 12px;border:1px solid #55d98b;border-radius:7px;background:#17233f;color:#8ff0b6;font:12px system-ui;cursor:pointer;box-shadow:0 2px 8px #0008;transition:opacity .3s ease';
recommendedButton.addEventListener('click',applyRecommendedLevels);
document.body.appendChild(recommendedButton);
expose();

updateLink = document.createElement('a');
updateLink.style.cssText = 'display:none;position:fixed;right:12px;bottom:96px;z-index:2147483647;padding:7px 11px;border:1px solid #55d98b;border-radius:7px;background:#17233f;color:#8ff0b6;font:12px system-ui;text-decoration:none;box-shadow:0 2px 8px #0008';
updateLink.target = '_blank';
updateLink.rel = 'noopener noreferrer';
document.body.appendChild(updateLink);
updateRecommendedButtonVisibility();
ext.runtime.sendMessage({ type: 'wwm-check-update' }).then(status => {
  if (!status?.available) return;
  updateLink.textContent = `Update available: v${status.latestVersion}`;
  updateLink.href = status.releaseUrl;
  updateLink.style.display = 'block';
});

ext.runtime.sendMessage({ type: 'wwm-status' }).then(state => {
  renderPatchState(state);
});
ext.runtime.onMessage.addListener(message => {
  if (message.type !== 'wwm-patch-state') return;
  renderPatchState(message.state);
  if (message.state?.versionMatch===false) button.title=`Website version ${message.state.actualVersion||'unknown'} differs from supported ${message.state.expectedVersion}. Functionality may be compromised.`;
});
