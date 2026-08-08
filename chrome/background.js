'use strict';

importScripts('config.js', 'patch-core.js');

let activeConfig = JSON.parse(JSON.stringify(globalThis.WWM_DEFAULT_CONFIG));
let activeProfile = activeConfig.levels.defaultPlayerProfile;
const attachedTabs = new Set();
const tabStates = new Map();

function updateTabState(tabId, update) {
  const state = { attached: attachedTabs.has(tabId), appPatched: false, workerPatched: false, error: null, ...(tabStates.get(tabId) || {}), ...update };
  tabStates.set(tabId, state);
  chrome.tabs.sendMessage(tabId, { type: 'wwm-patch-state', state }).catch(() => {});
  return state;
}

function reportCompatibility(update) {
  chrome.storage.local.get('wwmCompatibility').then(result=>chrome.storage.local.set({wwmCompatibility:{...(result.wwmCompatibility||{}),...update,checkedAt:new Date().toISOString()}}));
}

chrome.storage.local.get(['wwmConfig', 'wwmRuntime']).then(result => {
  activeConfig = WWMPatchCore.normalize(result.wwmConfig);
  activeProfile = result.wwmRuntime?.playerProfile || activeConfig.levels.defaultPlayerProfile;
});
chrome.storage.onChanged.addListener(changes => {
  if (changes.wwmConfig) activeConfig = WWMPatchCore.normalize(changes.wwmConfig.newValue);
  if (changes.wwmRuntime) activeProfile = changes.wwmRuntime.newValue?.playerProfile || activeConfig.levels.defaultPlayerProfile;
});

function replaceVerified(source, from, to, expected, label) {
  const found = source.split(from).length - 1;
  if (found !== expected) throw new Error(`${label}: found ${found}, expected ${expected}`);
  return source.split(from).join(to);
}

function numericSourcePattern(value) {
  const decimal = String(value).replace('.', '\\.');
  if (!Number.isInteger(value)) return decimal;
  return `(?:${decimal}|0x${value.toString(16)})`;
}

function coefficientPattern(values) {
  return new RegExp(
    `('physCoeff':)${numericSourcePattern(values.physCoeff)}` +
    `(,'flatPhys':)${numericSourcePattern(values.flatPhys)}` +
    `(,'attrCoeff':)${numericSourcePattern(values.attrCoeff)}` +
    `(,'flatAttr':)${numericSourcePattern(values.flatAttr)}`,
    'g'
  );
}

const BASE_TABLE_CATEGORIES = [
  'weapon', 'pendant', 'disc', 'lightArmor', 'greaves', 'chest',
  'weapon', 'pendant', 'disc', 'lightArmor', 'greaves', 'chest'
];

function patchApp(source) {
  return WWMPatchCore.patchApp(source, activeConfig, activeProfile);
  /* Legacy implementation retained below for easy source review. */
  const levels = Object.entries(activeConfig.gearLevels || {});
  const relay = [...new Set([71, 81, 86, 91, ...levels.filter(([, data]) => data.relayEligible).map(([level]) => Number(level))])].sort((a, b) => a - b);
  let patched = replaceVerified(source, 'var di=0.94,Bs=[0x47,0x51,0x56,0x5b];', `var di=0.94,Bs=[${relay.map(level => `0x${level.toString(16)}`).join(',')}];`, 1, 'relay levels');
  const tablePattern = /const\s+([A-Za-z_$][\w$]*)=\{\};\1\['91'\]=([A-Za-z_$][\w$]*),\1\['86'\]=([A-Za-z_$][\w$]*),\1\['81'\]=([A-Za-z_$][\w$]*)(?:,\1\['71'\]=([A-Za-z_$][\w$]*))?;/g;
  let tableIndex = 0;
  patched = patched.replace(tablePattern, match => {
    if (tableIndex >= BASE_TABLE_CATEGORIES.length) return match;
    const variableName = /^const\s+([A-Za-z_$][\w$]*)/.exec(match)[1];
    const category = BASE_TABLE_CATEGORIES[tableIndex++];
    const additions = levels.filter(([, data]) => data[category]).map(([level, data]) => `${variableName}['${level}']=${JSON.stringify(data[category])};`).join('');
    return match + additions;
  });
  if (tableIndex !== BASE_TABLE_CATEGORIES.length) throw new Error(`Gear base tables: found ${tableIndex}, expected ${BASE_TABLE_CATEGORIES.length}`);
  return patched;
}

function patchWorker(source) {
  return WWMPatchCore.patchWorker(source, activeConfig, WWMPatchCore.profile(activeConfig, activeProfile).data);
  /* Legacy implementation retained below for easy source review. */
  let patched = source;
  for (const rule of activeConfig.coefficientRules || []) {
    const pattern = coefficientPattern(rule.from);
    const replacement = `$1${rule.to.physCoeff}$2${rule.to.flatPhys}$3${rule.to.attrCoeff}$4${rule.to.flatAttr}`;
    if (rule.skillName) {
      const marker = `'${rule.skillName}':{`;
      const markerIndex = patched.indexOf(marker);
      if (markerIndex < 0) throw new Error(`${rule.name}: named skill was not found`);
      const objectEnd = patched.indexOf('}', markerIndex);
      const objectSource = patched.slice(markerIndex, objectEnd + 1);
      const matches = [...objectSource.matchAll(pattern)];
      if (matches.length !== rule.expected) throw new Error(`${rule.name}: found ${matches.length}, expected ${rule.expected}`);
      patched = patched.slice(0, markerIndex) + objectSource.replace(pattern, replacement) + patched.slice(objectEnd + 1);
    } else {
      const matches = [...patched.matchAll(pattern)];
      if (matches.length !== rule.expected) throw new Error(`${rule.name}: found ${matches.length}, expected ${rule.expected}`);
      patched = patched.replace(pattern, replacement);
    }
  }
  for (const rule of activeConfig.namedStatRules || []) {
    const pattern = new RegExp(
      `('statBonuses':\\{'minStonesplit':)${numericSourcePattern(rule.from.minStonesplit)}` +
      `(,'maxStonesplit':)${numericSourcePattern(rule.from.maxStonesplit)}` +
      `(?=(?:,'stonesplitPen':${numericSourcePattern(6)})?\\},'shieldDamageBonus':(?:0\\.05|0\\.1))`,
      'g'
    );
    const matches = [...patched.matchAll(pattern)];
    if (matches.length !== rule.expected) throw new Error(`${rule.name}: found ${matches.length}, expected ${rule.expected}`);
    patched = patched.replace(pattern, `$1${rule.to.minStonesplit}$2${rule.to.maxStonesplit}`);
  }
  return patched;
}

function decodeBody(body, base64Encoded) {
  if (!base64Encoded) return body;
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBody(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function enableTab(tabId) {
  if (attachedTabs.has(tabId)) return;
  await chrome.debugger.attach({ tabId }, '1.3');
  await chrome.debugger.sendCommand({ tabId }, 'Network.setCacheDisabled', { cacheDisabled: true });
  await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', { patterns: [
    { urlPattern: 'https://wherewindsmath.pages.dev/js/app.js*', requestStage: 'Response' },
    { urlPattern: 'https://wherewindsmath.pages.dev/js/simulationWorker.js*', requestStage: 'Response' }
  ] });
  attachedTabs.add(tabId);
  updateTabState(tabId, { attached: true, appPatched: false, workerPatched: false, error: null });
  console.info(`[WWM Patch] Debugger attached to tab ${tabId}; waiting for app.js.`);
}

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (method !== 'Fetch.requestPaused') return;
  try {
    const result = await chrome.debugger.sendCommand(source, 'Fetch.getResponseBody', { requestId: params.requestId });
    const original = decodeBody(result.body, result.base64Encoded);
    const isApp = /\/js\/app\.js(?:[?#]|$)/i.test(params.request.url);
    const expectedVersion = activeConfig.levels.supportedAppVersion || null;
    const actualVersion = isApp ? new URL(params.request.url).searchParams.get('v') : null;
    const patched = isApp ? patchApp(original) : patchWorker(original);
    const headers = (params.responseHeaders || []).filter(header => !/^(content-length|content-encoding)$/i.test(header.name));
    await chrome.debugger.sendCommand(source, 'Fetch.fulfillRequest', {
      requestId: params.requestId,
      responseCode: params.responseStatusCode || 200,
      responseHeaders: headers,
      body: encodeBody(patched)
    });
    if (source.tabId) {
      updateTabState(source.tabId, isApp ? { appPatched: true, error: null, expectedVersion, actualVersion, versionMatch: !expectedVersion || actualVersion === expectedVersion } : { workerPatched: true, error: null });
    }
    reportCompatibility(isApp?{appPatched:true,appError:null,expectedAppVersion:expectedVersion,actualAppVersion:actualVersion,versionMatch:!expectedVersion||actualVersion===expectedVersion}:{workerPatched:true,workerError:null});
    console.info(`[WWM Patch] ${isApp ? 'Main gear tables' : 'Simulation worker'} patched successfully.`);
  } catch (error) {
    console.error('[WWM Patch] Response patch failed.', error);
    reportCompatibility(/\/app\.js/i.test(params.request.url)?{appPatched:false,appError:error.message}:{workerPatched:false,workerError:error.message});
    if (source.tabId) updateTabState(source.tabId, { error: error.message || String(error) });
    try { await chrome.debugger.sendCommand(source, 'Fetch.continueResponse', { requestId: params.requestId }); } catch (_) {}
  }
});

chrome.debugger.onDetach.addListener(source => {
  if (source.tabId) {
    attachedTabs.delete(source.tabId);
    updateTabState(source.tabId, { attached: false });
  }
});
chrome.tabs.onRemoved.addListener(tabId => { attachedTabs.delete(tabId); tabStates.delete(tabId); });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'wwm-enable' && sender.tab?.id) {
    enableTab(sender.tab.id).then(() => {
      sendResponse({ ok: true });
      setTimeout(() => chrome.tabs.reload(sender.tab.id, { bypassCache: true }), 150);
    }).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'wwm-status' && sender.tab?.id) {
    sendResponse(tabStates.get(sender.tab.id) || { attached: attachedTabs.has(sender.tab.id), appPatched: false, workerPatched: false, error: null });
  }
  if (message.type === 'wwm-options') chrome.runtime.openOptionsPage();
});

chrome.action.onClicked.addListener(tab => {
  if (!tab.id || !tab.url?.startsWith('https://wherewindsmath.pages.dev/')) return;
  enableTab(tab.id).then(() => chrome.tabs.reload(tab.id));
});
