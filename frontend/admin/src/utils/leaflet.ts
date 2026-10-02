/**
 * Leaflet listo para usar con Geoman. Geoman se registra sobre la variable
 * global `L`, que con módulos ES no existe: este módulo la define y después
 * carga Geoman. Importar Leaflet siempre desde aquí, no desde 'leaflet'.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

(globalThis as unknown as { L: typeof L }).L = L;

// Import dinámico: se evalúa después de definir `L` (los imports estáticos se evalúan antes).
await import('@geoman-io/leaflet-geoman-free');
await import('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css');

export default L;
