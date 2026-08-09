from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
RELEASES = ROOT / "release"
RELEASES.mkdir(exist_ok=True)

def package(folder: str, filename: str) -> None:
    source = ROOT / folder
    destination = RELEASES / filename
    with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(source).as_posix())
    with ZipFile(destination) as archive:
        names = archive.namelist()
        assert "manifest.json" in names
        assert all("\\" not in name for name in names)
    print(destination)

package("firefox", "Unofficial-WWM-Patch-Firefox-v3.3.17.zip")
package("chrome", "Unofficial-WWM-Patch-Chrome-v2.3.17.zip")
