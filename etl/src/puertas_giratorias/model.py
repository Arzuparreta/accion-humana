"""Shared data shapes for revolving-door candidate ingestion."""

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal

SourceType = Literal["primary", "secondary", "discovery"]


@dataclass
class SourceEvidence:
    source_type: SourceType
    source_name: str
    source_url: str
    title: str | None = None
    published_at: date | None = None
    evidence_text: str | None = None
    raw_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class RevolvingDoorCandidate:
    person_name: str
    private_role: str
    private_organization: str
    discovered_by: str
    public_role: str | None = None
    public_organization: str | None = None
    public_exit_date: date | None = None
    political_party: str | None = None
    private_start_date: date | None = None
    authorization_date: date | None = None
    sector: str | None = None
    confidence: float = 0.0
    discovery_method: str | None = None
    sources: list[SourceEvidence] = field(default_factory=list)
    raw_data: dict[str, Any] = field(default_factory=dict)

