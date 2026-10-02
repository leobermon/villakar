-- Momento en que se envió al cliente el correo de confirmación de la reserva.
-- NULL: aún no se envía (o falló y hay que reintentar).
ALTER TABLE reservations
  ADD COLUMN confirmation_email_sent_at DATETIME NULL AFTER expires_at;
