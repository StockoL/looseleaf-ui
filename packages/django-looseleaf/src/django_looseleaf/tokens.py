"""Read access to the design tokens, already resolved by the JavaScript build.

tokens.resolved.json is copied from dist/ by npm run build:django. Python
never parses design-tokens.json or re-derives anything.
"""

import json
from functools import lru_cache
from pathlib import Path

TOKENS_PATH = Path(__file__).with_name("tokens.resolved.json")
SCHEMES = ("light", "dark")


@lru_cache(maxsize=1)
def load():
    return json.loads(TOKENS_PATH.read_text(encoding="utf-8"))


def get(path, scheme="light"):
    """Resolved literal for a token path such as "color.action" (light by default)."""
    if scheme not in SCHEMES:
        raise ValueError(f"Unknown scheme {scheme!r}; use 'light' or 'dark'.")
    try:
        token = load()[path]
    except KeyError:
        raise KeyError(f"Unknown LooseLeaf token {path!r}") from None
    return token[scheme]
