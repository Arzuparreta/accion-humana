"""Smoke tests for ine.bde (offline — no network)."""

import json
from pathlib import Path

from ine.bde import BDE_INDICATORS, parse_deuda_records

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture() -> list[dict]:
    return json.loads((FIXTURES / "bde_response.json").read_text())


def test_indicators_dict_has_deuda_code():
    assert "DEUDA_PUBLICA" in BDE_INDICATORS


def test_indicators_have_required_fields():
    for key, meta in BDE_INDICATORS.items():
        assert "code" in meta, f"{key} missing 'code'"
        assert "name" in meta, f"{key} missing 'name'"
        assert "unit" in meta, f"{key} missing 'unit'"
        assert "source" in meta, f"{key} missing 'source'"


def test_fixture_parses_records():
    data = _load_fixture()
    records = parse_deuda_records(data)
    assert len(records) == 5


def test_fixture_records_have_correct_shape():
    data = _load_fixture()
    records = parse_deuda_records(data)
    period, value = records[0]
    assert isinstance(period, str)
    assert isinstance(value, float)
    assert value > 0


def test_fixture_records_sorted_by_period():
    data = _load_fixture()
    records = parse_deuda_records(data)
    periods = [r[0] for r in records]
    assert periods == sorted(periods)


def test_fixture_latest_value():
    data = _load_fixture()
    records = parse_deuda_records(data)
    _, latest_value = records[-1]
    assert latest_value == 1635000.0


def test_parse_ignores_null_values():
    data = [
        {"periodo": "2024-Q1", "valor": 1000.0},
        {"periodo": None, "valor": 2000.0},
        {"periodo": "2024-Q2", "valor": None},
        {"periodo": "2024-Q3", "valor": "bad"},
    ]
    records = parse_deuda_records(data)
    assert len(records) == 1
    assert records[0][0] == "2024-Q1"
