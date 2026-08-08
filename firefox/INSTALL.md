# Temporary Firefox installation (v3.3.8)

1. Disable older Tampermonkey patches and remove the previous temporary add-on.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on** and choose this folder's `manifest.json`.
4. Close and reopen the Where Winds Math calculator.
5. In Settings > Player Level choose the website's native **Lv.100** for original data or **Lv.100 (Fixed)** for corrected data.

Original preserves the website's data. Fixed applies the confirmed 6% maximum to skills labeled `(attune)` and the supplied Stonesplit coefficients. Level 96 gear remains available; a Legendary weapon should show `Min Phys +65, Max Phys +151`.

Select **WWM Patch Settings** to edit four independent data sections: player/enemy levels, base tuning stats, skill coefficients, and base gear stats. User-friendly mode provides labeled fields; Advanced JSON mode permits complete structural edits. Save and reload the calculator. Temporary add-ons must be loaded again after Firefox restarts.
