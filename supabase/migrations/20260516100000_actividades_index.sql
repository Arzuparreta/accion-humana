-- Index to support queries like "get the actividades declaration for a deputy"
-- since actividades has no declaration_date, lookups filter by raw_data->>'type'.
CREATE INDEX IF NOT EXISTS economic_declarations_type_politician_idx
  ON economic_declarations ((raw_data->>'type'), politician_id);
