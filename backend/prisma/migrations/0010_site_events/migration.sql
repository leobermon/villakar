-- Analítica propia del sitio de reservas: eventos anónimos (sin cookies, sin IP, sin datos personales).
CREATE TABLE site_events (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sid        VARCHAR(36)     NOT NULL,
  name       VARCHAR(40)     NOT NULL,
  path       VARCHAR(190)    NULL,
  route      VARCHAR(20)     NULL,
  trip_type  VARCHAR(12)     NULL,
  hotel      VARCHAR(190)    NULL,
  label      VARCHAR(80)     NULL,
  amount     DECIMAL(10,2)   NULL,
  passengers TINYINT UNSIGNED NULL,
  device     VARCHAR(10)     NULL,
  source     VARCHAR(80)     NULL,
  props      JSON            NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_site_events_created (created_at),
  KEY idx_site_events_name (name, created_at),
  KEY idx_site_events_sid (sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
