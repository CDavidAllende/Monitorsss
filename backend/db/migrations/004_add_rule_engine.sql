ALTER TABLE monitors
  ADD COLUMN rule_type TEXT NOT NULL DEFAULT 'hash_diff'
    CHECK (rule_type IN ('hash_diff', 'text_contains', 'text_not_contains', 'price_threshold', 'availability')),
  ADD COLUMN rule_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN monitors.rule_type IS 'Tipo de regla de comparación usada por evaluateRule()';
COMMENT ON COLUMN monitors.rule_config IS 'Parámetros específicos del rule_type (operator/value/extraction_regex/manual_value, etc.)';