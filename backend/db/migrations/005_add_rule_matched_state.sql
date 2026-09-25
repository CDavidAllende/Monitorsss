ALTER TABLE monitors
  ADD COLUMN last_rule_matched BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN monitors.last_rule_matched IS 'Último resultado de evaluateRule() — usado para detectar transición false→true y evitar notificar en cada check mientras la condición se mantiene activa';