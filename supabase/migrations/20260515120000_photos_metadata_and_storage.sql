-- Trazabilidad y reintentos del pipeline de fotos.
-- A partir de esta migración:
--   - photo_url contiene URLs servidas por nuestro bucket de Supabase Storage
--     (politician-photos), nunca URLs de terceros.
--   - photo_source identifica la fuente original (wikidata, congreso_oficial, ...).
--   - wikidata_qid permite matching estable cross-source para futuros niveles
--     (senadores, autonómicos, alcaldes...).
--   - diputados.py deja de tocar photo_url; solo lo escribe etl.src.photos.

ALTER TABLE politicians
  ADD COLUMN IF NOT EXISTS wikidata_qid text,
  ADD COLUMN IF NOT EXISTS photo_source text,
  ADD COLUMN IF NOT EXISTS photo_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_attempts int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS politicians_wikidata_qid_idx
  ON politicians (wikidata_qid)
  WHERE wikidata_qid IS NOT NULL;

-- Limpiar URLs del Congreso que rompen en el navegador (404/hotlink). El pipeline
-- de fotos repoblará desde Wikidata + descarga oficial y subirá a Storage.
UPDATE politicians
SET photo_url = NULL,
    photo_source = NULL,
    photo_updated_at = NULL
WHERE photo_url LIKE '%congreso.es%';
