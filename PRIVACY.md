# Privacy Policy — Unofficial WWM Calculator Data Patch

Effective date: August 9, 2026

The extension does not collect, transmit, sell, or share personal data, browsing history, authentication information, communications, or analytics.

The extension operates only on `https://wherewindsmath.pages.dev/`. It locally reads and modifies the calculator's JavaScript responses to apply user-configured gear levels and skill coefficients. These responses and their contents are not transmitted to the developer or any third party.

At most once every 24 hours, the extension requests the public `update.json` file from `raw.githubusercontent.com` to determine whether a newer browser-specific version is available. The response contains only version numbers and a GitHub release link. The extension does not send configuration, calculator content, browsing history, or other user data with this request, and it never downloads or executes remote code. As with any normal web request, GitHub may receive standard connection information such as the user's IP address and user agent under GitHub's own privacy policy.

Configuration entered by the user is stored only in the browser's extension-local storage. The extension has no developer-operated server, telemetry, advertising, subscription, login, or cloud-sync service. Removing the extension deletes its locally stored configuration according to the browser's normal extension-data behavior.

The Chrome version uses the Debugger API only after the user selects **Enable WWM Patch**, and only for the active Where Winds Math calculator tab. It uses that API to intercept and locally modify the calculator's relevant JavaScript resources. It does not inspect other tabs or transmit intercepted content.

## Permission explanations

- **Storage:** saves the user's patch configuration locally in the browser.
- **Host access to `wherewindsmath.pages.dev`:** restricts the patch to the calculator website.
- **Host access to `raw.githubusercontent.com/Ginebra-cazador/WWMath-Add-on`:** reads the static update metadata file at most once every 24 hours.
- **Firefox Web Request and Web Request Blocking:** intercept the calculator's relevant script responses so the configured data can be applied locally.
- **Chrome Debugger:** intercepts and locally modifies the calculator's relevant script responses after the user explicitly enables the patch for that tab.

This is an unofficial community utility and is not affiliated with or endorsed by the calculator website or the game publisher.

Questions about this policy can be submitted through this repository's GitHub Issues page.
