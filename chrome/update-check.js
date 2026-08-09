'use strict';

globalThis.WWMUpdateCheck = (() => {
  const METADATA_URL = 'https://raw.githubusercontent.com/Ginebra-cazador/WWMath-Add-on/main/update.json';
  const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

  function newer(latest, installed) {
    const left = String(latest).split('.').map(Number);
    const right = String(installed).split('.').map(Number);
    for (let index = 0; index < Math.max(left.length, right.length); index++) {
      if ((left[index] || 0) !== (right[index] || 0)) return (left[index] || 0) > (right[index] || 0);
    }
    return false;
  }

  async function check(ext, browserName, force = false) {
    const stored = await ext.storage.local.get('wwmUpdateStatus');
    const cached = stored.wwmUpdateStatus;
    if (!force && cached?.browser === browserName && Date.now() - cached.checkedAt < CHECK_INTERVAL) return cached;
    try {
      const response = await fetch(`${METADATA_URL}?check=${Math.floor(Date.now() / CHECK_INTERVAL)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
      const metadata = await response.json();
      const latest = metadata?.latest?.[browserName];
      if (!latest?.version || !latest?.releaseUrl) throw new Error('Invalid update metadata');
      const installedVersion = ext.runtime.getManifest().version;
      const status = { browser: browserName, installedVersion, latestVersion: latest.version, releaseUrl: latest.releaseUrl, available: newer(latest.version, installedVersion), checkedAt: Date.now() };
      await ext.storage.local.set({ wwmUpdateStatus: status });
      return status;
    } catch (error) {
      console.info('[WWM Patch] Update check unavailable.', error);
      return cached || { browser: browserName, available: false, checkedAt: Date.now() };
    }
  }

  return { check };
})();
