-- Historial de correos por reserva: nuevos tipos de correo al cliente.
--   RESERVATION_PENDING    reserva recibida, pendiente de confirmar (al reservar en el sitio)
--   RESERVATION_COMPLETED  agradecimiento al marcar la orden como completada
--   RESERVATION_CANCELLED  aviso de cancelación
ALTER TABLE email_logs
  MODIFY COLUMN kind ENUM('RESERVATION_CONFIRMATION','RESERVATION_PENDING','RESERVATION_COMPLETED','RESERVATION_CANCELLED') NOT NULL;
