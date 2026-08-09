'use strict';

let activeConfig = WWMPatchCore.normalize(globalThis.WWM_DEFAULT_CONFIG);
let activeProfile = activeConfig.levels.defaultPlayerProfile;
const ready = browser.storage.local.get(['wwmConfig','wwmRuntime']).then(result => {
  activeConfig = WWMPatchCore.normalize(result.wwmConfig);
  activeProfile = result.wwmRuntime?.playerProfile || activeConfig.levels.defaultPlayerProfile;
});

browser.storage.onChanged.addListener(changes => {
  if (changes.wwmConfig) activeConfig = WWMPatchCore.normalize(changes.wwmConfig.newValue);
  if (changes.wwmRuntime) activeProfile = changes.wwmRuntime.newValue?.playerProfile || activeConfig.levels.defaultPlayerProfile;
});

browser.runtime.onMessage.addListener(async message => {
  if (message?.type === 'wwm-open-options') {
    await browser.runtime.openOptionsPage();
    return { ok: true };
  }
  if (message?.type === 'wwm-check-update') return WWMUpdateCheck.check(browser, 'firefox');
  return undefined;
});

function patchSource(url, source) {
  if (/\/js\/app\.js(?:[?#]|$)/i.test(url)) return WWMPatchCore.patchApp(source, activeConfig, activeProfile);
  if (/\/js\/simulationWorker\.js(?:[?#]|$)/i.test(url)) return WWMPatchCore.patchWorker(source, activeConfig, WWMPatchCore.profile(activeConfig, activeProfile).data);
  return source;
}

function reportCompatibility(url, update) {
  const isApp=/\/js\/app\.js(?:[?#]|$)/i.test(url);
  const actual=isApp ? new URL(url).searchParams.get('v') : null;
  const expected=activeConfig.levels.supportedAppVersion || null;
  browser.storage.local.get('wwmCompatibility').then(result => browser.storage.local.set({
    wwmCompatibility: { ...(result.wwmCompatibility||{}), expectedAppVersion:expected, ...(isApp?{actualAppVersion:actual,versionMatch:!expected||actual===expected}:{}), ...update, checkedAt:new Date().toISOString() }
  }));
}

function intercept(details) {
  const filter = browser.webRequest.filterResponseData(details.requestId);
  const chunks = [];
  filter.ondata = event => chunks.push(new Uint8Array(event.data));
  filter.onstop = () => {
    try {
      const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      filter.write(new TextEncoder().encode(patchSource(details.url, new TextDecoder().decode(bytes))));
      reportCompatibility(details.url, /\/app\.js/i.test(details.url)?{appPatched:true,appError:null}:{workerPatched:true,workerError:null});
    } catch (error) {
      console.error('[WWM Patch] Patch failed; original response restored.', error);
      reportCompatibility(details.url, /\/app\.js/i.test(details.url)?{appPatched:false,appError:error.message}:{workerPatched:false,workerError:error.message});
      for (const chunk of chunks) filter.write(chunk);
    } finally { filter.close(); }
  };
}

function route(details) {
  const url = new URL(details.url);
  if (url.searchParams.get('wwm-patch') !== 'profiles-3') {
    url.searchParams.set('wwm-patch', 'profiles-3');
    return { redirectUrl: url.href };
  }
  intercept(details);
  return {};
}

ready.finally(() => browser.webRequest.onBeforeRequest.addListener(
  route,
  { urls: ['https://wherewindsmath.pages.dev/js/app.js*','https://wherewindsmath.pages.dev/js/simulationWorker.js*'], types: ['script'] },
  ['blocking']
));
