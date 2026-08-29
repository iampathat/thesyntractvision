from __future__ import annotations

import argparse
import json
from typing import Sequence

from .domain_lab import DomainLabService


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="List or start isolated Logical Robot expert-domain starter spaces."
    )
    parser.add_argument("domain", nargs="?", help="Domain id to start, e.g. materials or biology")
    parser.add_argument("--store", default="./intelligence_store", help="Persistent intelligence-store root")
    parser.add_argument("--list", action="store_true", help="List built-in domain packs")
    args = parser.parse_args(argv)

    service = DomainLabService(args.store)
    if args.list or not args.domain:
        print(json.dumps(service.catalog(), ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    try:
        result = service.start(args.domain)
    except ValueError as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
