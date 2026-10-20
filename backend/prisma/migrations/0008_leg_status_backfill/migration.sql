-- Estado por tramo en las órdenes de ida y vuelta: cada tramo se completa o cancela por separado.
-- Las órdenes que ya estaban cerradas dejan sus tramos en el mismo estado que la orden
-- (antes el estado solo vivía en la orden y los tramos quedaban en SCHEDULED).
UPDATE reservation_legs l
JOIN reservations r ON r.id = l.reservation_id
SET l.status = r.status
WHERE r.status IN ('COMPLETED', 'CANCELLED', 'NO_SHOW')
  AND l.status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS');
