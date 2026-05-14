"""Idempotently create the `politician-photos` Supabase Storage bucket.

Usage (from the etl/ directory):
    PYTHONPATH=src python scripts/create_photos_bucket.py

Requires SUPABASE_SERVICE_ROLE_KEY in the environment. The bucket is public-read
and accepts WebP/JPEG/PNG up to 10 MB. Run this once per environment before the
first execution of `src.photos.run` against that environment.
"""

import sys

from photos.storage import BUCKET, ensure_bucket


def main() -> int:
    print(f"Ensuring Supabase Storage bucket exists: {BUCKET}")
    ensure_bucket(public=True)
    print(f"OK: bucket {BUCKET!r} is ready (public).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
