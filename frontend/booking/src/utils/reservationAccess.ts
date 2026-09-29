// Recuerda en esta pestaña el email de cada reserva, para que al volver de
// Stripe / PayPal la página de la reserva cargue sin pedirlo y sin ponerlo en
// la URL. Si el navegador bloquea el almacenamiento, la página lo pide.

const key = (code: string) => `vc:reservation:${code}`;

export function rememberReservationEmail(code: string, email: string): void {
  try {
    sessionStorage.setItem(key(code), email);
  } catch {
    // Almacenamiento no disponible: se pedirá el email al volver.
  }
}

export function recallReservationEmail(code: string): string | null {
  try {
    return sessionStorage.getItem(key(code));
  } catch {
    return null;
  }
}
