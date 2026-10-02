-- Datos que captura el equipo desde el panel de administración.

-- Pagos manuales (efectivo, transferencia) y verificación de cobros pendientes.
-- `reference` es la referencia bancaria o folio que escribe el equipo; va aparte
-- de provider_payment_id porque ese forma parte de una llave única.
ALTER TABLE payments
  ADD COLUMN reference   VARCHAR(120)    NULL AFTER provider_payment_id,
  ADD COLUMN received_by VARCHAR(120)    NULL AFTER reference,
  ADD COLUMN note        VARCHAR(255)    NULL AFTER failure_reason,
  ADD COLUMN recorded_by BIGINT UNSIGNED NULL AFTER note,
  ADD INDEX idx_payments_user (recorded_by),
  ADD CONSTRAINT fk_payments_user FOREIGN KEY (recorded_by) REFERENCES users (id) ON DELETE SET NULL;

-- Links de pago que el equipo envía por WhatsApp o correo.
-- EXPIRED no se guarda: se calcula al leer comparando expires_at.
CREATE TABLE payment_links (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token          VARCHAR(32)     NOT NULL,
  reservation_id BIGINT UNSIGNED NULL,
  customer_name  VARCHAR(160)    NOT NULL,
  customer_email VARCHAR(190)    NULL,
  customer_phone VARCHAR(30)     NULL,
  description    VARCHAR(255)    NOT NULL,
  amount         DECIMAL(10,2)   NOT NULL,
  currency       CHAR(3)         NOT NULL DEFAULT 'USD',
  status         ENUM('ACTIVE','PAID','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  expires_at     DATETIME        NOT NULL,
  paid_at        DATETIME        NULL,
  created_by     BIGINT UNSIGNED NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_links_token (token),
  KEY idx_payment_links_res (reservation_id),
  KEY idx_payment_links_user (created_by),
  CONSTRAINT fk_payment_links_res FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE SET NULL,
  CONSTRAINT fk_payment_links_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración del negocio editable desde el panel: una fila por sección
-- (company, booking, payments, notifications) con sus valores en JSON.
CREATE TABLE app_settings (
  setting_key VARCHAR(40)     NOT NULL,
  value       JSON            NOT NULL,
  updated_by  BIGINT UNSIGNED NULL,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  KEY idx_app_settings_user (updated_by),
  CONSTRAINT fk_app_settings_user FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
