-- Ubicacion aproximada (pais y ciudad, calculada al recibir el evento; la IP no se guarda) y zona horaria del visitante.
ALTER TABLE site_events
  ADD COLUMN country CHAR(2) NULL AFTER source,
  ADD COLUMN city VARCHAR(80) NULL AFTER country,
  ADD COLUMN tz VARCHAR(40) NULL AFTER city;
