-- Global full-text search across key entities.
-- Uses the 'simple' dictionary for proper nouns (names, orgs) and 'spanish'
-- for long-form text (voting titles). unaccent handles accent-insensitive matching.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Build a prefix tsquery from a free-text search string.
-- "pedro sanchez" → to_tsquery('simple', 'pedro:* & sanchez:*')
CREATE OR REPLACE FUNCTION _build_search_query(query_text text)
RETURNS tsquery AS $$
DECLARE
  words    text[];
  parts    text[];
  w        text;
  cleaned  text;
BEGIN
  IF trim(query_text) = '' THEN RETURN NULL; END IF;
  words := string_to_array(trim(query_text), ' ');
  parts := ARRAY[]::text[];

  FOREACH w IN ARRAY words LOOP
    cleaned := lower(unaccent(regexp_replace(w, '[^[:alnum:]]', '', 'g')));
    IF length(cleaned) >= 2 THEN
      parts := parts || (cleaned || ':*');
    END IF;
  END LOOP;

  IF array_length(parts, 1) IS NULL THEN RETURN NULL; END IF;
  RETURN to_tsquery('simple', array_to_string(parts, ' & '));
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


CREATE OR REPLACE FUNCTION search_global(query_text text, max_per_type int DEFAULT 5)
RETURNS TABLE (
  entity_type text,
  id          uuid,
  title       text,
  subtitle    text,
  url         text
) AS $$
DECLARE
  ts_q tsquery;
BEGIN
  ts_q := _build_search_query(query_text);
  IF ts_q IS NULL THEN RETURN; END IF;

  RETURN QUERY

  -- Politicians — match on full_name
  SELECT * FROM (
    SELECT
      'politician'::text,
      p.id,
      p.full_name,
      coalesce(par.acronym, 'Sin partido')::text,
      ('/diputados/' || p.id::text)
    FROM politicians p
    LEFT JOIN politician_memberships pm
      ON pm.politician_id = p.id AND pm.is_active = true
    LEFT JOIN parties par ON par.id = pm.party_id
    WHERE to_tsvector('simple', unaccent(p.full_name)) @@ ts_q
    LIMIT max_per_type
  ) _pol

  UNION ALL

  -- Organizations — match on name
  SELECT * FROM (
    SELECT
      'organization'::text,
      o.id,
      o.name,
      coalesce(o.sector, '')::text,
      ('/organizaciones/' || o.id::text)
    FROM organizations o
    WHERE to_tsvector('simple', unaccent(o.name)) @@ ts_q
    LIMIT max_per_type
  ) _org

  UNION ALL

  -- Voting sessions — match on title (Spanish stemming)
  SELECT * FROM (
    SELECT
      'voting_session'::text,
      vs.id,
      vs.title,
      coalesce(to_char(vs.date, 'DD/MM/YYYY'), '')::text,
      ('/votaciones/' || vs.id::text)
    FROM voting_sessions vs
    WHERE to_tsvector('spanish', unaccent(vs.title)) @@ ts_q
    ORDER BY vs.date DESC
    LIMIT max_per_type
  ) _vs

  UNION ALL

  -- Contracts — match on title
  SELECT * FROM (
    SELECT
      'contract'::text,
      c.id,
      c.title,
      coalesce(c.awarding_body_normalized, c.awarding_body, '')::text,
      '/contratos'
    FROM contracts c
    WHERE to_tsvector('spanish', unaccent(c.title)) @@ ts_q
    ORDER BY c.date DESC NULLS LAST
    LIMIT max_per_type
  ) _con

  UNION ALL

  -- Revolving door — match on person name or private organization
  SELECT * FROM (
    SELECT
      'revolving_door'::text,
      rd.id,
      rd.person_name,
      (coalesce(rd.public_role, '') || ' → ' || coalesce(rd.private_organization, ''))::text,
      '/puertas-giratorias'
    FROM revolving_door rd
    WHERE to_tsvector('simple', unaccent(
      rd.person_name || ' ' || coalesce(rd.private_organization, '')
    )) @@ ts_q
    LIMIT max_per_type
  ) _rd;

END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION _build_search_query(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_global(text, int) TO anon, authenticated;
