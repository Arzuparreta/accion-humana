# Pipeline de puertas giratorias

Investigación → revisión humana → publicación. Nada se publica automáticamente.

## Modelo de datos (3 tablas, 1 vista)

- `revolving_door_candidates` — staging. Cada candidato lleva `status` (`needs_review` → `published` | `rejected`) y `confidence` (0–1).
- `revolving_door_sources` — fuentes asociadas (`primary` / `secondary` / `discovery`), reutilizadas tras publicar.
- `revolving_door` — casos verificados. Solo aquí lee el frontend.
- `v_revolving_door_public` — vista de lectura para anon: case + fuentes ordenadas.

Política RLS: anon ve solo casos verificados y sus fuentes; `authenticated` puede mirar candidatos en investigación.

## Flujo

### 1. Ingest

**CSV** (caso normal — investigación manual):

```bash
PYTHONPATH=src python -m src.puertas_giratorias.ingest --csv data.csv --dry-run
PYTHONPATH=src python -m src.puertas_giratorias.ingest --csv data.csv
```

Columnas aceptadas (con alias en español):

```
person_name, political_party, public_role, public_organization,
public_exit_date, private_role, private_organization,
private_start_date, authorization_date, sector,
source_url, source_name, source_type, title, published_at,
evidence_text, confidence, discovered_by, discovery_method
```

`source_type` debe ser `primary`, `secondary` o `discovery`. Para publicar, hace falta al menos una fuente `primary`.

**BORME** (descubrimiento, baja confianza):

```bash
PYTHONPATH=src python -m src.puertas_giratorias.ingest \
  --borme-date 2026-05-13 \
  --names "Nombre Apellido" "Otro Nombre"
```

Genera candidatos con `confidence=0.35`, `private_role=Pendiente de revisar`. Requiere revisión humana antes de poder publicar nada.

### 2. Revisión

```bash
PYTHONPATH=src python -m src.puertas_giratorias.review list                # status=needs_review
PYTHONPATH=src python -m src.puertas_giratorias.review list --status published
PYTHONPATH=src python -m src.puertas_giratorias.review reject <id> --notes "..."
PYTHONPATH=src python -m src.puertas_giratorias.review publish <id> --reviewed-by ruben
```

`publish` valida:
- Al menos una fuente `primary` asociada.
- `public_role` y `public_organization` presentes.
- `private_role` y `private_organization` distintos de `Pendiente de revisar`.

Y entonces inserta en `revolving_door` con `verification_status='verified'`, copia las fuentes y marca el candidato como `published`.

## Por qué hay tres fases

La investigación toma tiempo y produce material inseguro. El staging permite:

- Ingresar pistas (BORME, OSINT, periodismo) sin contaminar la tabla pública.
- Adjuntar fuentes incrementalmente hasta tener una `primary`.
- Revisión auditable (`reviewed_by`, `reviewed_at`, `review_notes`).
- Rechazo explícito (las pistas falsas también se documentan).

## Pendientes

- Cron automático de BORME: necesita una lista de "personas a vigilar" curada (no escanear los 350 diputados todos los días — demasiado ruido). Mientras tanto, ejecutar `ingest --borme-date` manualmente cuando se quiera muestrear un día concreto.
- Backfill desde fuentes secundarias documentadas (Wikipedia "Puerta giratoria (política)" tiene listado).
