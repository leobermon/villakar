-- =====================================================================
--  MOTOR DE RESERVAS - TRANSPORTACIÓN TURÍSTICA CANCÚN / RIVIERA MAYA
--  Migración inicial (esquema v2): tarifas por GEOFENCE + rango de pasajeros
--  Requiere MySQL 8.0.30+ (soporte espacial geográfico SRID 4326)
--
--  Orden de ejes: con SRID 4326 MySQL interpreta el WKT como "lat lng" por
--  defecto. En todo el proyecto se usa SIEMPRE 'axis-order=long-lat'
--  ("lng lat"), el mismo orden que GeoJSON.
-- =====================================================================

-- ---------------------------------------------------------------------
-- USUARIOS DEL PANEL
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120)  NOT NULL,
  email           VARCHAR(190)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('SUPER_ADMIN','ADMIN','OPERATOR') NOT NULL DEFAULT 'OPERATOR',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  last_login_at   DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- CLIENTES (checkout como invitado)
-- ---------------------------------------------------------------------
CREATE TABLE customers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(80)   NOT NULL,
  last_name       VARCHAR(80)   NOT NULL,
  email           VARCHAR(190)  NOT NULL,
  phone           VARCHAR(30)   NULL,
  country_code    CHAR(2)       NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- TIPOS DE VEHÍCULO
-- ---------------------------------------------------------------------
CREATE TABLE vehicle_types (
  id              SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30)   NOT NULL,
  name            VARCHAR(80)   NOT NULL,
  description     VARCHAR(255)  NULL,
  max_passengers  TINYINT UNSIGNED NOT NULL,
  max_luggage     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  image_url       VARCHAR(255)  NULL,
  sort_order      SMALLINT      NOT NULL DEFAULT 0,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicle_types_code (code),
  CONSTRAINT chk_vt_pax CHECK (max_passengers > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- VEHÍCULOS (inventario)
-- ---------------------------------------------------------------------
CREATE TABLE vehicles (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_type_id SMALLINT UNSIGNED NOT NULL,
  unit_number     VARCHAR(20)   NOT NULL,
  plate           VARCHAR(20)   NOT NULL,
  brand           VARCHAR(60)   NULL,
  model           VARCHAR(60)   NULL,
  year            SMALLINT      NULL,
  status          ENUM('ACTIVE','MAINTENANCE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  notes           VARCHAR(255)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_plate (plate),
  UNIQUE KEY uq_vehicles_unit (unit_number),
  KEY idx_vehicles_type_status (vehicle_type_id, status),
  CONSTRAINT fk_vehicles_type FOREIGN KEY (vehicle_type_id)
    REFERENCES vehicle_types(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle_blocks (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id      BIGINT UNSIGNED NOT NULL,
  starts_at       DATETIME      NOT NULL,
  ends_at         DATETIME      NOT NULL,
  reason          VARCHAR(255)  NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vblocks_range (vehicle_id, starts_at, ends_at),
  KEY idx_vblocks_user (created_by),
  CONSTRAINT fk_vblocks_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_vblocks_user FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_vblocks_range CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ZONAS (GEOFENCES) — se crean/editan desde el panel de admin
-- ---------------------------------------------------------------------
CREATE TABLE zones (
  id              SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,
  slug            VARCHAR(100)  NOT NULL,
  boundary        POLYGON       NOT NULL SRID 4326,
  color           CHAR(7)       NOT NULL DEFAULT '#3B82F6',
  priority        SMALLINT      NOT NULL DEFAULT 0,    -- si se traslapan, gana la mayor
  is_airport      TINYINT(1)    NOT NULL DEFAULT 0,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order      SMALLINT      NOT NULL DEFAULT 0,
  updated_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_zones_slug (slug),
  KEY idx_zones_user (updated_by),
  SPATIAL INDEX sx_zones_boundary (boundary),
  CONSTRAINT fk_zones_user FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- TARIFAS: zona origen × zona destino × vehículo × rango de pasajeros (USD)
--   Ej.: Aeropuerto→Tulum, Transporter, 1-4 pax = $X ; 5-7 pax = $Y
-- ---------------------------------------------------------------------
CREATE TABLE zone_rates (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  origin_zone_id       SMALLINT UNSIGNED NOT NULL,
  destination_zone_id  SMALLINT UNSIGNED NOT NULL,
  vehicle_type_id      SMALLINT UNSIGNED NOT NULL,
  min_pax              TINYINT UNSIGNED NOT NULL DEFAULT 1,
  max_pax              TINYINT UNSIGNED NOT NULL,
  price_one_way        DECIMAL(10,2) NOT NULL,
  price_round_trip     DECIMAL(10,2) NOT NULL,
  is_bidirectional     TINYINT(1)    NOT NULL DEFAULT 1,  -- A→B aplica también a B→A
  valid_from           DATE          NOT NULL,
  valid_to             DATE          NULL,
  is_active            TINYINT(1)    NOT NULL DEFAULT 1,
  updated_by           BIGINT UNSIGNED NULL,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_zone_rates (origin_zone_id, destination_zone_id, vehicle_type_id, min_pax, valid_from),
  KEY idx_zone_rates_lookup (origin_zone_id, destination_zone_id, is_active, valid_from),
  KEY idx_zone_rates_dest (destination_zone_id),
  KEY idx_zone_rates_vtype (vehicle_type_id),
  KEY idx_zone_rates_user (updated_by),
  CONSTRAINT fk_zr_origin FOREIGN KEY (origin_zone_id)
    REFERENCES zones(id) ON DELETE RESTRICT,
  CONSTRAINT fk_zr_dest   FOREIGN KEY (destination_zone_id)
    REFERENCES zones(id) ON DELETE RESTRICT,
  CONSTRAINT fk_zr_vtype  FOREIGN KEY (vehicle_type_id)
    REFERENCES vehicle_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_zr_user   FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_zr_prices CHECK (price_one_way >= 0 AND price_round_trip >= 0),
  CONSTRAINT chk_zr_pax    CHECK (min_pax >= 1 AND max_pax >= min_pax),
  CONSTRAINT chk_zr_dates  CHECK (valid_to IS NULL OR valid_to >= valid_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- LUGARES (caché de Google Places + puntos fijos como el aeropuerto)
--   google_place_id NULL = punto creado manualmente
--   code = identificador fijo de puntos propios (p. ej. 'CUN' para el aeropuerto)
-- ---------------------------------------------------------------------
CREATE TABLE places (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  google_place_id   VARCHAR(255)  NULL,
  code              VARCHAR(10)   NULL,
  place_type        ENUM('AIRPORT','HOTEL','OTHER') NOT NULL DEFAULT 'HOTEL',
  name              VARCHAR(190)  NOT NULL,
  formatted_address VARCHAR(255)  NULL,
  location          POINT         NOT NULL SRID 4326,
  google_types      JSON          NULL,
  is_featured       TINYINT(1)    NOT NULL DEFAULT 0,
  last_synced_at    DATETIME      NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_places_google (google_place_id),
  UNIQUE KEY uq_places_code (code),
  KEY idx_places_type (place_type),
  SPATIAL INDEX sx_places_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- RESERVAS (USD)
-- ---------------------------------------------------------------------
CREATE TABLE reservations (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(12)   NOT NULL,
  customer_id      BIGINT UNSIGNED NOT NULL,
  trip_type        ENUM('ONE_WAY','ROUND_TRIP') NOT NULL,
  route_type       ENUM('AIRPORT_HOTEL','HOTEL_AIRPORT','HOTEL_HOTEL') NOT NULL,
  vehicle_type_id  SMALLINT UNSIGNED NOT NULL,
  zone_rate_id     BIGINT UNSIGNED NULL,
  adults           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  children         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  infants          TINYINT UNSIGNED NOT NULL DEFAULT 0,
  subtotal         DECIMAL(10,2) NOT NULL,
  discount         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total            DECIMAL(10,2) NOT NULL,
  status           ENUM('PENDING','CONFIRMED','ASSIGNED','IN_PROGRESS',
                        'COMPLETED','CANCELLED','NO_SHOW') NOT NULL DEFAULT 'PENDING',
  payment_status   ENUM('UNPAID','PAID','PARTIALLY_REFUNDED','REFUNDED','FAILED')
                   NOT NULL DEFAULT 'UNPAID',
  special_requests TEXT          NULL,
  internal_notes   TEXT          NULL,
  source           ENUM('WEB','ADMIN','PHONE','AGENCY') NOT NULL DEFAULT 'WEB',
  expires_at       DATETIME      NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reservations_code (code),
  KEY idx_res_status (status, created_at),
  KEY idx_res_customer (customer_id),
  KEY idx_res_vtype (vehicle_type_id),
  KEY idx_res_rate (zone_rate_id),
  CONSTRAINT fk_res_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_vtype    FOREIGN KEY (vehicle_type_id)
    REFERENCES vehicle_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_rate     FOREIGN KEY (zone_rate_id)
    REFERENCES zone_rates(id) ON DELETE SET NULL,
  CONSTRAINT chk_res_pax     CHECK (adults >= 1),
  CONSTRAINT chk_res_amounts CHECK (subtotal >= 0 AND discount >= 0 AND total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- TRAMOS (1 = One Way, 2 = Round Trip) — zona y nombre congelados al reservar
-- ---------------------------------------------------------------------
CREATE TABLE reservation_legs (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id       BIGINT UNSIGNED NOT NULL,
  leg_number           TINYINT UNSIGNED NOT NULL,
  origin_place_id      BIGINT UNSIGNED NOT NULL,
  origin_zone_id       SMALLINT UNSIGNED NOT NULL,
  origin_name          VARCHAR(190)  NOT NULL,
  destination_place_id BIGINT UNSIGNED NOT NULL,
  destination_zone_id  SMALLINT UNSIGNED NOT NULL,
  destination_name     VARCHAR(190)  NOT NULL,
  pickup_at            DATETIME      NOT NULL,         -- hora local America/Cancun
  estimated_end_at     DATETIME      NULL,
  flight_number        VARCHAR(15)   NULL,
  airline              VARCHAR(60)   NULL,
  terminal             VARCHAR(5)    NULL,             -- T2 / T3 / T4 en CUN
  flight_time          DATETIME      NULL,
  vehicle_id           BIGINT UNSIGNED NULL,
  driver_name          VARCHAR(120)  NULL,
  driver_phone         VARCHAR(30)   NULL,
  status               ENUM('SCHEDULED','ASSIGNED','IN_PROGRESS','COMPLETED',
                            'CANCELLED','NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_leg (reservation_id, leg_number),
  KEY idx_legs_pickup (pickup_at),
  KEY idx_legs_vehicle_time (vehicle_id, pickup_at, estimated_end_at),
  KEY idx_legs_oplace (origin_place_id),
  KEY idx_legs_dplace (destination_place_id),
  KEY idx_legs_ozone (origin_zone_id),
  KEY idx_legs_dzone (destination_zone_id),
  CONSTRAINT fk_legs_res     FOREIGN KEY (reservation_id)
    REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_legs_oplace  FOREIGN KEY (origin_place_id)
    REFERENCES places(id) ON DELETE RESTRICT,
  CONSTRAINT fk_legs_dplace  FOREIGN KEY (destination_place_id)
    REFERENCES places(id) ON DELETE RESTRICT,
  CONSTRAINT fk_legs_ozone   FOREIGN KEY (origin_zone_id)
    REFERENCES zones(id) ON DELETE RESTRICT,
  CONSTRAINT fk_legs_dzone   FOREIGN KEY (destination_zone_id)
    REFERENCES zones(id) ON DELETE RESTRICT,
  CONSTRAINT fk_legs_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT chk_legs_number CHECK (leg_number IN (1,2)),
  CONSTRAINT chk_legs_route  CHECK (origin_place_id <> destination_place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PAGOS (Stripe / PayPal)
-- ---------------------------------------------------------------------
CREATE TABLE payments (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id      BIGINT UNSIGNED NOT NULL,
  provider            ENUM('STRIPE','PAYPAL','CASH','TRANSFER') NOT NULL,
  provider_payment_id VARCHAR(191)  NULL,
  type                ENUM('CHARGE','REFUND') NOT NULL DEFAULT 'CHARGE',
  amount              DECIMAL(10,2) NOT NULL,
  currency            CHAR(3)       NOT NULL DEFAULT 'USD',
  status              ENUM('PENDING','SUCCEEDED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  failure_reason      VARCHAR(255)  NULL,
  provider_payload    JSON          NULL,
  paid_at             DATETIME      NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payments_provider (provider, provider_payment_id, type),
  KEY idx_payments_res (reservation_id),
  CONSTRAINT fk_payments_res FOREIGN KEY (reservation_id)
    REFERENCES reservations(id) ON DELETE RESTRICT,
  CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_webhook_events (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider        ENUM('STRIPE','PAYPAL') NOT NULL,
  event_id        VARCHAR(191)  NOT NULL,
  event_type      VARCHAR(100)  NOT NULL,
  payload         JSON          NOT NULL,
  processed_at    DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_webhook_event (provider, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- AUDITORÍA DE ESTADOS
-- ---------------------------------------------------------------------
CREATE TABLE reservation_status_history (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reservation_id  BIGINT UNSIGNED NOT NULL,
  from_status     VARCHAR(20)   NULL,
  to_status       VARCHAR(20)   NOT NULL,
  changed_by      BIGINT UNSIGNED NULL,
  comment         VARCHAR(255)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rsh_res (reservation_id, created_at),
  KEY idx_rsh_user (changed_by),
  CONSTRAINT fk_rsh_res  FOREIGN KEY (reservation_id)
    REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsh_user FOREIGN KEY (changed_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- SOLICITUDES "CONTACT US" (hotel fuera de zona o sin tarifa)
-- ---------------------------------------------------------------------
CREATE TABLE contact_requests (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(120)  NOT NULL,
  email            VARCHAR(190)  NOT NULL,
  phone            VARCHAR(30)   NULL,
  hotel_name       VARCHAR(190)  NOT NULL,
  google_place_id  VARCHAR(255)  NULL,
  arrival_date     DATE          NULL,
  passengers       TINYINT UNSIGNED NULL,
  message          TEXT          NULL,
  status           ENUM('NEW','CONTACTED','CLOSED') NOT NULL DEFAULT 'NEW',
  internal_notes   TEXT          NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_contact_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
