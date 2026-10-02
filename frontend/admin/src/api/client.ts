const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/** Error del backend con mensaje listo para mostrar. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Se llama cuando el backend responde 401 (sesión vencida): el router manda al login. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  /** No avisar del 401 (p. ej. al comprobar si hay sesión al abrir el panel). */
  silent401?: boolean;
}

/** fetch al backend con la cookie de sesión del panel. */
export async function api<T>(path: string, { json, headers, silent401, ...init }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa que el backend esté encendido.', 0);
  }

  if (response.status === 401 && !silent401) onUnauthorized?.();
  if (!response.ok) throw new ApiError(await errorMessage(response), response.status);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
  if (response.status >= 500) return 'Error del servidor. Intenta de nuevo.';
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    return message || 'No se pudo completar la operación.';
  } catch {
    return 'No se pudo completar la operación.';
  }
}
