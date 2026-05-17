"""ETL: ingest Spanish public debt data from Banco de España (BdE) API."""

import json
import subprocess
from common.db import get_pg_conn

# BdE Statistical Data Warehouse — time series codes
# BE_1_2.1: Deuda pública consolidada (% PIB) - quarterly
# For raw amount we use Eurostat/BdE series
BDE_INDICATORS = {
    "DEUDA_PUBLICA": {
        "code": "DEUDA_PUBLICA",
        "name": "Deuda pública consolidada (AA.PP.)",
        "unit": "millones EUR",
        "url": "https://www.bde.es/webbe/es/estadisticas/compartido/datos/be_series/be_1_2_1.csv",
        "source": "Banco de España",
    },
}

# BdE exposes data via a CSV/JSON API. We use the BdE Statistical Bulletin series.
# Series BE_1.2.1: Consolidated General Government debt (ESA 2010 methodology)
# URL format: https://www.bde.es/webbe/es/estadisticas/compartido/datos/be_series/<series>.csv
BDE_DEUDA_URL = "https://serviciosede.mineco.gob.es/Indeco/BDPNE/series?lang=es&formato=JSON&codSeries=DEUDA_AGG"


def fetch_deuda_json(url: str = BDE_DEUDA_URL) -> list[dict]:
    """Download and parse the public debt JSON from MINHAC/BdE."""
    result = subprocess.run(
        ["curl", "-sL", "--max-time", "30", url],
        capture_output=True, text=True, timeout=35,
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl failed: {result.stderr}")
    return json.loads(result.stdout)


def parse_deuda_records(raw: list[dict]) -> list[tuple[str, float]]:
    """Extract (period, value_millions_eur) pairs from MINHAC API response.

    Returns list of (period_str like '2024-Q4', value) sorted by period ascending.
    """
    records = []
    for item in raw:
        period = item.get("periodo") or item.get("period") or item.get("date")
        value = item.get("valor") or item.get("value")
        if period is None or value is None:
            continue
        try:
            records.append((str(period), float(value)))
        except (ValueError, TypeError):
            continue
    return sorted(records, key=lambda x: x[0])


def run():
    data = fetch_deuda_json()
    records = parse_deuda_records(data)
    if not records:
        print("No records parsed from BdE API — check URL or response format")
        return

    conn = get_pg_conn()
    cur = conn.cursor()
    inserted = 0
    for period_str, value in records:
        cur.execute("""
            INSERT INTO economic_indicators (indicator_code, indicator_name, period, value, unit, raw_data)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (indicator_code, period) DO UPDATE SET
                value = EXCLUDED.value,
                raw_data = EXCLUDED.raw_data
        """, (
            "DEUDA_PUBLICA",
            "Deuda pública consolidada (AA.PP.)",
            period_str,
            value,
            "millones EUR",
            json.dumps({"period": period_str, "value": value, "source": "BdE"}),
        ))
        inserted += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Done! Upserted {inserted} data points")


if __name__ == "__main__":
    run()
