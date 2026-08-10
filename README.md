# Unofficial WWM Calculator Data Patch

This repository contains the Firefox and Chrome editions of an unofficial, locally operated data patch for the [Where Winds Math calculator](https://wherewindsmath.pages.dev/).

The extension adds configurable gear levels (currently Level 96) and updated Stonesplit Might skill coefficients. It has no Discord login, subscription check, analytics, advertising, or cloud-sharing service. Configuration stays in the browser's extension-local storage.

Once per day, the extension may read the repository's static `update.json` file from GitHub. When a newer browser-specific version is listed, it displays a link to the GitHub release; installation remains manual.

## Downloads

Use the ZIP files attached to the latest entry on the repository's **Releases** page:

- `Unofficial-WWM-Patch-Firefox-v3.3.17.zip`
- `Unofficial-WWM-Patch-Chrome-v2.3.17.zip`

The `firefox/` and `chrome/` folders contain the matching readable source code.

## Firefox installation (Manual And Temporary)

1. Download and extract the Firefox ZIP from **Releases**.
2. Disable older WWM Tampermonkey patches and remove older temporary copies of this add-on.
3. Open `about:debugging#/runtime/this-firefox`.
4. Select **Load Temporary Add-on**.
5. Select `manifest.json` from the extracted folder.
6. Close all open Where Winds Math tabs.
7. Reopen the calculator and hard-refresh once.

Temporary add-ons are removed when Firefox closes. Install the signed Mozilla Add-ons edition when it becomes available if you want a permanent installation.

## Chrome installation (Manual)

1. Download and extract the Chrome ZIP from **Releases** to a permanent folder.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder.
5. Open the Where Winds Math calculator.
6. Select **WWM Patch: OFF - Click to Enable** at the lower-right of the page.
7. Accept Chrome's debugging notice and allow the automatic reload.

Chrome displays its standard debugging banner while response interception is active. Closing the calculator tab ends that session; enable the patch again in a new tab.

## Using the patch

After activation, import your profile, then open the calculator website's **Settings** tab (next to **Profile**). Use **Player Level** and **Enemy Level** there to change the levels used by the live calculation. Enable **Show other enemy levels** when you need to select an enemy level other than the website's default.
<img width="1404" height="837" alt="image" src="https://github.com/user-attachments/assets/bcc9e5bd-c86b-4b82-bb5e-7edbc0060c9b" />


Choose **Lv.100 (Fixed)** or any custom under **Player Level** to use the verified Stonesplit coefficients and the confirmed 6% cap (3.6%-6% range) for every skill entry marked `(attune)`. The website's native **Lv.100** option preserves the calculator developer's original data. These live selections belong to the website's Settings page; Patch Settings is used to edit or add the data tables that supply those choices.

Level 96 gear remains available. For a Legendary Level 96 weapon, the base line should display `Min Phys +65, Max Phys +151`, and those base values should contribute to Character Stats and DPS.

To edit values or prepare a future gear level:

1. Open the extension's **Options** page. In Chrome, clicking **WWM Patch: ON** also opens it.
2. Use **User-friendly mode** to expand compact level, gear, and coefficient rows and edit labeled values. Guided buttons can add player profiles, enemy levels, tuning tables, coefficient tables, and coefficient rules. Use **Advanced JSON mode** for unrestricted structural edits.
3. Choose one of the four sections: **Player & enemy levels**, **Base tuning stats**, **Skill coefficients**, or **Base gear stats**.
4. Save the configuration.
5. Close and reopen, or reload, the calculator.

To add a future player level such as 105, add a profile under `levels.playerProfiles`, then point its `tuningTable` and `coefficientTable` fields to entries in the matching sections. To add a future enemy level, add its level, defense, and resistance under `levels.enemyLevels`. To add future gear, copy the complete `96` object under `baseGearStats`, rename its key, and replace its values with verified data. Existing data is not a template for guessing future values.

## Included updates

- Configurable additional gear-level base-stat tables.
- Level 96 gear selection and DPS contribution.
- Relay eligibility controls for added gear levels.
- Configurable Stonesplit Might skill coefficients.
- Separate original and corrected Level 100 player profiles.
- Configurable player levels, enemy defense, and enemy resistance.
- Corrected 6% maximum for all skill entries labeled `(attune)` in fixed mode.
- Local JSON editor with validation and reset support.
- User-friendly Martial Arts Skill Data combining damage replacements with timing, hit-count, and notes fields.
- Import, export, automatic pre-save backups, rollback, and save-change previews.
- Configurable relay multiplier.
- Website bundle-version and patch compatibility warnings.
- Editable Stonesplit Inner Way values, including the updated Exquisite Scenery and Battle Anthem bonuses.
- Player-profile-linked Level 100 Arsenal attack table; the calculator applies the shared values as Path or General attack according to its Arsenal selection.
- Corrected Level 96 Bow Set Precision, Critical, and Affinity rates.
- Editable corrected two-piece values for Rainwhisper (8%), Ivorybloom (9%), Hawkwing (4.5%), and Shattered Ridge/Cleftpeak (+78).
- Arsenal tables expose only attack values currently consumed by the patch; unsupported Arsenal HP metadata is intentionally omitted.
- User-friendly mode hides original bundle-matching values and internal patch metadata, and treats Inner Way names and keys as fixed identifiers.
- Skill identifiers and the verified app version are read-only in user-friendly mode; guided controls can copy known skills and Inner Ways into another Martial Arts table.
- The guided Add Skill and Add Inner Way dialogs can also create a new locked identifier from an existing data template.
- Per-slot gear-level display memory keeps added levels selected when the calculator redraws its original 71–91-only selector markup.
- Website Settings remains the sole owner of active Player and Enemy level selections; native levels are no longer forced back to the corrected profile.
- User-friendly configuration edits now update the correct underlying JSON section immediately, including dropdown changes.
- Guarded enemy-level synchronization repairs a visible/internal level mismatch without repeatedly overriding the website setting.

Enemy Level 96 defense (`405`) and resistance (`65%`) remain separate from the player's gear level. Attribute damage is configured as zero for the current Stonesplit rotation data.

## Troubleshooting

- Disable older Tampermonkey scripts before testing this extension.
- Make sure the browser-specific version is being used.
- Reload the calculator after saving configuration changes.
- If Level 96 appears but does not affect DPS, fully close the calculator tab and reopen it after enabling the patch.
- Firefox diagnostics are available from the extension's **Inspect** button under `about:debugging`.
- Chrome requires the patch button to show **WWM Patch: ON** for the current calculator tab.
- If On the Chrome version, the Addon fails to attach to the tables correctly It will require a full Refresh (CTRL+SHIFT+R)
- <img width="147" height="56" alt="image" src="https://github.com/user-attachments/assets/9af32ebd-1be8-4ce2-8651-1f688b778364" />
- <img width="940" height="238" alt="image" src="https://github.com/user-attachments/assets/55d66b85-bba0-499a-aff0-701109c41277" />



## Privacy and permissions

See [PRIVACY.md](PRIVACY.md) for the source policy and the [hosted privacy policy](https://ginebra-cazador.github.io/WWMath-Add-on/privacy-policy.html) for the public URL required by browser extension stores.

## Disclaimer

This is an unofficial community utility. It is not affiliated with or endorsed by the Where Winds Math website or the game publisher. Game data can change; verify important values in-game.
