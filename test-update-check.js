'use strict';

const fs = require('fs');
const vm = require('vm');
const metadata = JSON.parse(fs.readFileSync('update.json', 'utf8'));

async function run(browserName, installedVersion, latestVersion, expectedAvailable) {
  let saved = {};
  const ext = {
    runtime: { getManifest: () => ({ version: installedVersion }) },
    storage: { local: {
      get: async key => ({ [key]: saved[key] }),
      set: async update => { saved = { ...saved, ...update }; }
    } }
  };
  const context = {
    console,
    fetch: async () => ({ ok: true, json: async () => ({ ...metadata, latest: { ...metadata.latest, [browserName]: { ...metadata.latest[browserName], version: latestVersion } } }) })
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync('firefox/update-check.js', 'utf8'), context);
  const result = await context.WWMUpdateCheck.check(ext, browserName, true);
  if (result.available !== expectedAvailable) throw new Error(`${browserName} ${installedVersion} -> ${latestVersion}: expected ${expectedAvailable}, got ${result.available}`);
}

Promise.all([
  run('firefox', '3.3.16', '3.3.16', false),
  run('firefox', '3.3.16', '3.3.17', true),
  run('chrome', '2.3.16', '2.4.0', true),
  run('chrome', '2.3.16', '2.3.15', false)
]).then(() => console.log('Update checker tests passed.'));
