ALTER TABLE snapshots
ADD COLUMN extracted_value NUMERIC NULL;
 
COMMENT ON COLUMN snapshots.extracted_value IS
  'Valor numérico extraído del contenido (ej. precio). NULL si el monitor no extrae un número.';
 