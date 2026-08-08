# Privacy Policy — Unofficial WWM Calculator Data Patch

Effective date: August 7, 2026

The extension does not collect, transmit, sell, or share personal data, browsing history, authentication information, communications, or analytics.

The extension operates only on `https://wherewindsmath.pages.dev/`. It locally reads and modifies the calculator's JavaScript responses to apply user-configured gear levels and skill coefficients. These responses and their contents are not transmitted to the developer or any third party.

Configuration entered by the user is stored only in the browser's extension-local storage. The extension has no developer-operated server, telemetry, advertising, subscription, login, or cloud-sync service. Removing the extension deletes its locally stored configuration according to the browser's normal extension-data behavior.

The Chrome version uses the Debugger API only after the user selects **Enable WWM Patch**, and only for the active Where Winds Math calculator tab. It uses that API to intercept and locally modify the calculator's relevant JavaScript resources. It does not inspect other tabs or transmit intercepted content.

## Permission explanations

- **Storage:** saves the user's patch configuration locally in the browser.
- **Host access to `wherewindsmath.pages.dev`:** restricts the patch to the calculator website.
- **Firefox Web Request and Web Request Blocking:** intercept the calculator's relevant script responses so the configured data can be applied locally.
- **Chrome Debugger:** intercepts and locally modifies the calculator's relevant script responses after the user explicitly enables the patch for that tab.

This is an unofficial community utility and is not affiliated with or endorsed by the calculator website or the game publisher.

Questions about this policy can be submitted through this repository's GitHub Issues page.
