-- Historial de movimientos del panel de administración (órdenes y pagos). Solo lectura para superadministradores.
CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NULL,
  user_name   VARCHAR(120)    NOT NULL,
  user_email  VARCHAR(190)    NOT NULL,
  action      VARCHAR(40)     NOT NULL,
  entity_type VARCHAR(30)     NOT NULL,
  entity_id   BIGINT UNSIGNED NULL,
  order_code  VARCHAR(20)     NULL,
  summary     VARCHAR(500)    NOT NULL,
  details     JSON            NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_created (created_at),
  KEY idx_audit_logs_user (user_id),
  KEY idx_audit_logs_order (order_code),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
