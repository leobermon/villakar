-- Fecha elegida para el servicio (llegada o salida) y fecha de regreso en viajes redondos.
ALTER TABLE site_events
  ADD COLUMN service_date DATE NULL AFTER passengers,
  ADD COLUMN return_date DATE NULL AFTER service_date,
  ADD KEY idx_site_events_service_date (service_date);
