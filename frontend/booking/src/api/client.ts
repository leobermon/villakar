const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
}

export async function apiRequest<T>(path: string, { json, headers, ...init }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('We could not reach our servers. Check your connection and try again.', 0);
  }

  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);
  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  if (response.status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (response.status >= 500) return GENERIC_ERROR;
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    return message || GENERIC_ERROR;
  } catch {
    return GENERIC_ERROR;
  }
}
