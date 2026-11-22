-- Cupones de descuento: monto fijo en USD por reserva completa (distinto para one way y round trip).
-- Las fechas son hora local de Cancún ("de pared"), igual que las de los servicios.
CREATE TABLE coupons (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                VARCHAR(30)     NOT NULL,
  description         VARCHAR(190)    NULL,
  discount_one_way    DECIMAL(10,2)   NOT NULL,
  discount_round_trip DECIMAL(10,2)   NOT NULL,
  valid_from          DATETIME        NOT NULL,
  valid_to            DATETIME        NOT NULL,
  max_uses            INT UNSIGNED    NULL,
  is_active           TINYINT(1)      NOT NULL DEFAULT 1,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un uso por reserva y por correo: el cupón se aparta al crear la reserva y se libera si esta se cancela o vence sin pagarse.
CREATE TABLE coupon_redemptions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id      BIGINT UNSIGNED NOT NULL,
  reservation_id BIGINT UNSIGNED NOT NULL,
  email          VARCHAR(190)    NOT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_redemptions_reservation (reservation_id),
  UNIQUE KEY uq_coupon_redemptions_email (coupon_id, email),
  CONSTRAINT fk_coupon_red_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE,
  CONSTRAINT fk_coupon_red_res FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Código del cupón aplicado (el monto ya queda en reservations.discount).
ALTER TABLE reservations ADD COLUMN coupon_code VARCHAR(30) NULL AFTER discount;

-- Black Friday 2026: del 21 al 28 de noviembre (todo el día), máximo 100 usos.
INSERT INTO coupons (code, description, discount_one_way, discount_round_trip, valid_from, valid_to, max_uses)
VALUES ('BFRIDAY', 'Black Friday 2026', 5.00, 10.00, '2026-11-21 00:00:00', '2026-11-28 23:59:59', 100);
