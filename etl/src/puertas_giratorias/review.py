"""Review and publish revolving-door candidates.

Usage:
    PYTHONPATH=src python -m src.puertas_giratorias.review list
    PYTHONPATH=src python -m src.puertas_giratorias.review reject <candidate_id> --notes "..."
    PYTHONPATH=src python -m src.puertas_giratorias.review publish <candidate_id> --reviewed-by ruben
"""

import argparse

import psycopg2.extras

from common.db import get_pg_conn


def list_candidates(status: str, limit: int) -> None:
    with get_pg_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, person_name, private_role, private_organization,
                       confidence, discovered_by, created_at
                FROM revolving_door_candidates
                WHERE status = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (status, limit),
            )
            for row in cur.fetchall():
                print(
                    f"{row['id']} | {row['person_name']} | {row['private_role']} "
                    f"en {row['private_organization']} | confianza={row['confidence']} "
                    f"| {row['discovered_by']} | {row['created_at']}"
                )


def reject_candidate(candidate_id: str, reviewed_by: str | None, notes: str | None) -> None:
    with get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE revolving_door_candidates
                SET status = 'rejected',
                    reviewed_at = now(),
                    reviewed_by = %s,
                    review_notes = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (reviewed_by, notes, candidate_id),
            )
            if cur.rowcount == 0:
                raise SystemExit(f"Candidate not found: {candidate_id}")
            conn.commit()
    print(f"Rejected candidate {candidate_id}")


def publish_candidate(candidate_id: str, reviewed_by: str | None, notes: str | None) -> None:
    with get_pg_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM revolving_door_candidates
                WHERE id = %s
                FOR UPDATE
                """,
                (candidate_id,),
            )
            candidate = cur.fetchone()
            if not candidate:
                raise SystemExit(f"Candidate not found: {candidate_id}")
            if candidate["status"] == "published":
                raise SystemExit(f"Candidate already published: {candidate_id}")

            cur.execute(
                """
                SELECT *
                FROM revolving_door_sources
                WHERE candidate_id = %s
                ORDER BY CASE source_type WHEN 'primary' THEN 0 WHEN 'secondary' THEN 1 ELSE 2 END
                """,
                (candidate_id,),
            )
            sources = cur.fetchall()
            primary = next((s for s in sources if s["source_type"] == "primary"), None)
            if not primary:
                raise SystemExit("Publishing requires at least one primary public source")
            if not candidate["public_role"] or not candidate["public_organization"]:
                raise SystemExit("Publishing requires public_role and public_organization")
            if candidate["private_organization"] == "Pendiente de revisar":
                raise SystemExit("Publishing requires a resolved private_organization")
            if candidate["private_role"] == "Pendiente de revisar":
                raise SystemExit("Publishing requires a resolved private_role")

            cur.execute(
                """
                INSERT INTO revolving_door (
                  person_id, person_name, political_party,
                  public_role, public_organization, public_exit_date,
                  private_role, private_organization, organization_id,
                  sector, start_date, private_start_date, authorization_date,
                  cooling_off_months, source_url, primary_source_url,
                  verification_status, verification_method, verified_at, raw_data
                )
                VALUES (
                  %s, %s, %s,
                  %s, %s, %s,
                  %s, %s, %s,
                  %s, %s, %s, %s,
                  CASE
                    WHEN %s IS NOT NULL AND coalesce(%s, %s) IS NOT NULL
                    THEN (
                      date_part('year', age(coalesce(%s, %s), %s)) * 12
                      + date_part('month', age(coalesce(%s, %s), %s))
                    )::int
                    ELSE NULL
                  END,
                  %s, %s,
                  'verified', 'primary_source_review', now(), %s
                )
                RETURNING id
                """,
                (
                    candidate["person_id"],
                    candidate["person_name"],
                    candidate["political_party"],
                    candidate["public_role"],
                    candidate["public_organization"],
                    candidate["public_exit_date"],
                    candidate["private_role"],
                    candidate["private_organization"],
                    candidate["organization_id"],
                    candidate["sector"],
                    candidate["private_start_date"],
                    candidate["private_start_date"],
                    candidate["authorization_date"],
                    candidate["public_exit_date"],
                    candidate["private_start_date"],
                    candidate["authorization_date"],
                    candidate["private_start_date"],
                    candidate["authorization_date"],
                    candidate["public_exit_date"],
                    candidate["private_start_date"],
                    candidate["authorization_date"],
                    candidate["public_exit_date"],
                    primary["source_url"],
                    primary["source_url"],
                    psycopg2.extras.Json(candidate["raw_data"] or {}),
                ),
            )
            revolving_door_id = cur.fetchone()["id"]

            for source in sources:
                cur.execute(
                    """
                    INSERT INTO revolving_door_sources (
                      revolving_door_id, source_type, source_name, source_url,
                      title, published_at, evidence_text, raw_data
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        revolving_door_id,
                        source["source_type"],
                        source["source_name"],
                        source["source_url"],
                        source["title"],
                        source["published_at"],
                        source["evidence_text"],
                        psycopg2.extras.Json(source["raw_data"] or {}),
                    ),
                )

            cur.execute(
                """
                UPDATE revolving_door_candidates
                SET status = 'published',
                    reviewed_at = now(),
                    reviewed_by = %s,
                    review_notes = %s,
                    published_revolving_door_id = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (reviewed_by, notes, revolving_door_id, candidate_id),
            )
            conn.commit()
    print(f"Published candidate {candidate_id} as revolving_door {revolving_door_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    list_parser = sub.add_parser("list")
    list_parser.add_argument("--status", default="needs_review")
    list_parser.add_argument("--limit", type=int, default=25)

    reject_parser = sub.add_parser("reject")
    reject_parser.add_argument("candidate_id")
    reject_parser.add_argument("--reviewed-by")
    reject_parser.add_argument("--notes")

    publish_parser = sub.add_parser("publish")
    publish_parser.add_argument("candidate_id")
    publish_parser.add_argument("--reviewed-by")
    publish_parser.add_argument("--notes")

    args = parser.parse_args()
    if args.command == "list":
        list_candidates(args.status, args.limit)
    elif args.command == "reject":
        reject_candidate(args.candidate_id, args.reviewed_by, args.notes)
    elif args.command == "publish":
        publish_candidate(args.candidate_id, args.reviewed_by, args.notes)


if __name__ == "__main__":
    main()
