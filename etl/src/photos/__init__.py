"""Photos pipeline: multi-source, priority-ordered photo ingestion for politicians.

Public API:
    PYTHONPATH=src python -m src.photos.run [--dry-run] [--refresh-missing]
                                            [--max-age-days N] [--only <congress_id>]
                                            [--source <name>]

The pipeline is the only writer of `politicians.photo_url`. Other ETLs must not
touch that column (see CLAUDE.md / migration 20260515120000).
"""
