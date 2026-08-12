import argparse
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--test-suffix")
args = parser.parse_args()

RELEASES = ROOT / ("test-builds" if args.test_suffix else "release")
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

suffix = f"-{args.test_suffix}" if args.test_suffix else ""
package("firefox", f"Unofficial-WWM-Patch-Firefox-v3.4.0{suffix}.zip")
package("chrome", f"Unofficial-WWM-Patch-Chrome-v2.4.0{suffix}.zip")
