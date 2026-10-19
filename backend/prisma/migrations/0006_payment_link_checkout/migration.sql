-- Links de pago: guardan con qué proveedor se intentó/realizó el cobro desde la página pública
-- (/pay/<token>): Stripe (tarjeta) o PayPal, y el id de la sesión u orden, para conciliar.
ALTER TABLE payment_links
  ADD COLUMN provider            ENUM('STRIPE','PAYPAL','CASH','TRANSFER') NULL AFTER status,
  ADD COLUMN provider_payment_id VARCHAR(191) NULL AFTER provider,
  ADD INDEX idx_payment_links_provider (provider, provider_payment_id);
