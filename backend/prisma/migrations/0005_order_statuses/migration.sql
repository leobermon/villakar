-- Estados de la orden: se quitan ASSIGNED (asignada) e IN_PROGRESS (en curso).
-- Quedan PENDING (por defecto al reservar), CONFIRMED, COMPLETED, CANCELLED y NO_SHOW.
-- El chofer sigue capturándose por tramo, pero ya no es un estado.

-- Las órdenes que estaban asignadas o en curso siguen siendo servicios confirmados.
UPDATE reservations SET status = 'CONFIRMED' WHERE status IN ('ASSIGNED', 'IN_PROGRESS');

-- El historial guarda los estados como texto: se corrige igual para que no apunte a estados que ya no existen.
UPDATE reservation_status_history SET from_status = 'CONFIRMED' WHERE from_status IN ('ASSIGNED', 'IN_PROGRESS');
UPDATE reservation_status_history SET to_status = 'CONFIRMED' WHERE to_status IN ('ASSIGNED', 'IN_PROGRESS');

ALTER TABLE reservations
  MODIFY COLUMN status ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW') NOT NULL DEFAULT 'PENDING';
