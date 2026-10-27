"""Read access to the design tokens, already resolved by the JavaScript build.

tokens.resolved.json is copied from dist/ by npm run build:django. Python
never parses design-tokens.json or re-derives anything. With LOOSELEAF_THEME
set, the theme's own tokens.resolved.json is read first and the package's
fills any token the theme lacks (e.g. one added after the theme was exported).
"""

import json
from functools import lru_cache
from pathlib import Path

from . import theme

TOKENS_PATH = Path(__file__).with_name("tokens.resolved.json")
SCHEMES = ("light", "dark")


def _read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load():
    """The package's default tokens."""
    return _read(TOKENS_PATH)


@lru_cache(maxsize=1)
def load_theme():
    """The project theme's tokens, or {} without a theme (or without its JSON file)."""
    path = theme.find(theme.TOKENS)
    return _read(path) if path else {}


def get(path, scheme="light"):
    """Resolved literal for a token path such as "color.action" (light by default)."""
    if scheme not in SCHEMES:
        raise ValueError(f"Unknown scheme {scheme!r}; use 'light' or 'dark'.")
    for source in (load_theme(), load()):
        token = source.get(path)
        if isinstance(token, dict):  # "$version" and other metadata keys are not tokens
            return token[scheme]
    raise KeyError(f"Unknown LooseLeaf token {path!r}")
