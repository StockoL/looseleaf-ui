"""The package's static files must be exactly what the npm build produced.

Fails when someone changed src/ or design-tokens.json and forgot to run
npm run build (which syncs dist/ into the package).
"""

import hashlib
from pathlib import Path

import pytest

PACKAGE_DIR = Path(__file__).resolve().parents[1] / "src" / "django_looseleaf"
REPO_DIST = Path(__file__).resolve().parents[3] / "dist"

SYNCED = {
    "looseleaf.css": PACKAGE_DIR / "static" / "looseleaf" / "looseleaf.css",
    "looseleaf.js": PACKAGE_DIR / "static" / "looseleaf" / "looseleaf.js",
    "theme.js": PACKAGE_DIR / "static" / "looseleaf" / "theme.js",
    "tokens.resolved.json": PACKAGE_DIR / "tokens.resolved.json",
}


def digest(path):
    # Git may check either copy out with CRLF; compare content, not line endings.
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


@pytest.mark.skipif(not REPO_DIST.is_dir(), reason="not running inside the looseleaf-ui repository")
@pytest.mark.parametrize("name", sorted(SYNCED))
def test_static_matches_the_npm_build(name):
    assert digest(SYNCED[name]) == digest(REPO_DIST / name), f"{name} is stale: run npm run build"
