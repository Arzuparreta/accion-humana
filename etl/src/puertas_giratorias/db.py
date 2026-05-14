"""Database helpers for the revolving-door investigation pipeline."""

import re
import unicodedata
from datetime import date
from typing import Any

import psycopg2.extras
from thefuzz import fuzz

from common.db import get_pg_conn
from common.utils import normalize_name
from puertas_giratorias.model import RevolvingDoorCandidate, SourceEvidence

PRIMARY_SOURCE_TYPES = {"primary"}


def normalize_organization_name(name: str) -> str:
    cleaned = unicodedata.normalize("NFKD", name or "")
    cleaned = "".join(c for c in cleaned if not unicodedata.combining(c))
    cleaned = cleaned.lower()
    cleaned = re.sub(r"\b(s\.?a\.?|s\.?l\.?|sa|sl|plc|ltd|inc)\b", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9]+", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _json(value: dict[str, Any]) -> psycopg2.extras.Json:
    return psycopg2.extras.Json(value or {})


def _date(value: str | date | None) -> date | None:
    if isinstance(value, date):
        return value
    if not value:
        return None
    text = str(value).strip()
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            from datetime import datetime

            return datetime.strptime(text, pattern).date()
        except ValueError:
            continue
    return None


def parse_optional_date(value: str | date | None) -> date | None:
    return _date(value)


def match_politician(cur, person_name: str) -> tuple[str | None, str | None, float]:
    """Return best politician id, current party acronym and score for a name."""
    cur.execute(
        """
        SELECT p.id, p.full_name, par.acronym
        FROM politicians p
        LEFT JOIN politician_memberships pm ON pm.politician_id = p.id AND pm.is_active = true
        LEFT JOIN parties par ON par.id = pm.party_id
        """
    )
    target = normalize_name(person_name)
    best_id = None
    best_party = None
    best_score = 0.0
    for pid, full_name, party in cur.fetchall():
        score = fuzz.token_set_ratio(target, normalize_name(full_name)) / 100
        if score > best_score:
            best_id = pid
            best_party = party
            best_score = score
    if best_score < 0.92:
        return None, None, best_score
    return best_id, best_party, best_score


def upsert_organization(cur, name: str, sector: str | None, source_url: str | None) -> str:
    normalized = normalize_organization_name(name)
    cur.execute(
        """
        INSERT INTO organizations (name, normalized_name, organization_type, sector, source_url)
        VALUES (%s, %s, 'company', %s, %s)
        ON CONFLICT (normalized_name) DO UPDATE SET
          name = EXCLUDED.name,
          sector = coalesce(EXCLUDED.sector, organizations.sector),
          source_url = coalesce(EXCLUDED.source_url, organizations.source_url),
          updated_at = now()
        RETURNING id
        """,
        (name, normalized, sector, source_url),
    )
    return cur.fetchone()[0]


def upsert_candidate(cur, candidate: RevolvingDoorCandidate) -> str:
    primary_source = next(
        (source.source_url for source in candidate.sources if source.source_type in PRIMARY_SOURCE_TYPES),
        candidate.sources[0].source_url if candidate.sources else None,
    )
    organization_id = upsert_organization(
        cur,
        candidate.private_organization,
        candidate.sector,
        primary_source,
    )
    person_id, matched_party, match_score = match_politician(cur, candidate.person_name)
    confidence = max(candidate.confidence, match_score)
    political_party = candidate.political_party or matched_party

    cur.execute(
        """
        INSERT INTO revolving_door_candidates (
          person_id, person_name, political_party,
          public_role, public_organization, public_exit_date,
          private_role, private_organization, organization_id,
          private_start_date, authorization_date, sector,
          confidence, discovered_by, discovery_method, raw_data
        )
        VALUES (
          %s, %s, %s,
          %s, %s, %s,
          %s, %s, %s,
          %s, %s, %s,
          %s, %s, %s, %s
        )
        ON CONFLICT (candidate_key) DO UPDATE SET
          person_id = coalesce(EXCLUDED.person_id, revolving_door_candidates.person_id),
          political_party = coalesce(EXCLUDED.political_party, revolving_door_candidates.political_party),
          public_role = coalesce(EXCLUDED.public_role, revolving_door_candidates.public_role),
          public_organization = coalesce(EXCLUDED.public_organization, revolving_door_candidates.public_organization),
          public_exit_date = coalesce(EXCLUDED.public_exit_date, revolving_door_candidates.public_exit_date),
          organization_id = EXCLUDED.organization_id,
          private_start_date = coalesce(EXCLUDED.private_start_date, revolving_door_candidates.private_start_date),
          authorization_date = coalesce(EXCLUDED.authorization_date, revolving_door_candidates.authorization_date),
          sector = coalesce(EXCLUDED.sector, revolving_door_candidates.sector),
          confidence = greatest(EXCLUDED.confidence, revolving_door_candidates.confidence),
          raw_data = revolving_door_candidates.raw_data || EXCLUDED.raw_data,
          updated_at = now()
        RETURNING id
        """,
        (
            person_id,
            candidate.person_name,
            political_party,
            candidate.public_role,
            candidate.public_organization,
            candidate.public_exit_date,
            candidate.private_role,
            candidate.private_organization,
            organization_id,
            candidate.private_start_date,
            candidate.authorization_date,
            candidate.sector,
            confidence,
            candidate.discovered_by,
            candidate.discovery_method,
            _json({**candidate.raw_data, "politician_match_score": match_score}),
        ),
    )
    candidate_id = cur.fetchone()[0]
    for source in candidate.sources:
        upsert_source(cur, source, candidate_id=candidate_id)
    return candidate_id


def upsert_source(
    cur,
    source: SourceEvidence,
    candidate_id: str | None = None,
    revolving_door_id: str | None = None,
) -> None:
    cur.execute(
        """
        SELECT id
        FROM revolving_door_sources
        WHERE coalesce(revolving_door_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = coalesce(%s, '00000000-0000-0000-0000-000000000000'::uuid)
          AND coalesce(candidate_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = coalesce(%s, '00000000-0000-0000-0000-000000000000'::uuid)
          AND source_url = %s
        """,
        (revolving_door_id, candidate_id, source.source_url),
    )
    existing = cur.fetchone()
    if existing:
        cur.execute(
            """
            UPDATE revolving_door_sources
            SET source_type = %s,
                source_name = %s,
                title = coalesce(%s, title),
                published_at = coalesce(%s, published_at),
                evidence_text = coalesce(%s, evidence_text),
                raw_data = raw_data || %s
            WHERE id = %s
            """,
            (
                source.source_type,
                source.source_name,
                source.title,
                source.published_at,
                source.evidence_text,
                _json(source.raw_data),
                existing[0],
            ),
        )
        return

    cur.execute(
        """
        INSERT INTO revolving_door_sources (
          revolving_door_id, candidate_id, source_type, source_name, source_url,
          title, published_at, evidence_text, raw_data
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            revolving_door_id,
            candidate_id,
            source.source_type,
            source.source_name,
            source.source_url,
            source.title,
            source.published_at,
            source.evidence_text,
            _json(source.raw_data),
        ),
    )


def save_candidates(candidates: list[RevolvingDoorCandidate], dry_run: bool = False) -> int:
    if dry_run:
        for candidate in candidates:
            print(
                f"{candidate.person_name} -> {candidate.private_role} en "
                f"{candidate.private_organization} ({len(candidate.sources)} fuentes)"
            )
        return len(candidates)

    with get_pg_conn() as conn:
        with conn.cursor() as cur:
            count = 0
            for candidate in candidates:
                upsert_candidate(cur, candidate)
                count += 1
            conn.commit()
            return count
