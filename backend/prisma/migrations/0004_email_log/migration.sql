-- Registro de los correos que envía el sistema al cliente (por ahora, la confirmación
-- de reserva): sirve para ver en el panel si llegó a enviarse y para reenviarlo.
CREATE TABLE email_logs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind           ENUM('RESERVATION_CONFIRMATION') NOT NULL,
  reservation_id BIGINT UNSIGNED NULL,
  to_email       VARCHAR(190)    NOT NULL,
  subject        VARCHAR(255)    NOT NULL,
  status         ENUM('SENT','FAILED') NOT NULL,
  error          VARCHAR(500)    NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_logs_created (created_at),
  KEY idx_email_logs_res (reservation_id),
  CONSTRAINT fk_email_logs_res FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
