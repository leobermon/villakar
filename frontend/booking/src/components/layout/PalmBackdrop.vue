<script setup lang="ts">
/**
 * Dibujos playeros en blanco y negro para el fondo general del sitio: palmeras,
 * cocos, estrellas de mar, sol y peces. De tamaños y giros distintos, revueltos sin
 * orden aparente (posiciones fijas para que no cambien entre visitas). Van detrás del
 * contenido y sin interacción.
 */
type Kind = 'palm' | 'coconut' | 'star' | 'sun' | 'fish';

interface Item {
  kind: Kind;
  /** Posición horizontal en % del ancho de la página (el dibujo se centra en ese punto). */
  x: number;
  /** Posición vertical en % de la altura de la página. */
  top: number;
  /** Ancho en px (el alto sigue la proporción del dibujo). */
  size: number;
  rotate: number;
  flip?: boolean;
  /** Solo en pantallas anchas, para no cargar el móvil. */
  wideOnly?: boolean;
}

/** Proporción alto/ancho de cada dibujo (según su viewBox). */
const RATIO: Record<Kind, number> = { palm: 165 / 140, coconut: 1, star: 1, sun: 1, fish: 0.7 };
const VIEWBOX: Record<Kind, string> = {
  palm: '0 0 140 165',
  coconut: '0 0 100 100',
  star: '0 0 100 100',
  sun: '0 0 100 100',
  fish: '0 0 100 70',
};

const ITEMS: Item[] = [
  { kind: 'palm', x: 4, top: 15, size: 170, rotate: -14 },
  { kind: 'fish', x: 38, top: 19, size: 84, rotate: 24, flip: true },
  { kind: 'sun', x: 91, top: 22, size: 120, rotate: 31, wideOnly: true },
  { kind: 'star', x: 22, top: 27, size: 70, rotate: 52, wideOnly: true },
  { kind: 'coconut', x: 66, top: 31, size: 56, rotate: -37 },
  { kind: 'fish', x: 8, top: 38, size: 100, rotate: -22 },
  { kind: 'palm', x: 83, top: 41, size: 150, rotate: 19, flip: true, wideOnly: true },
  { kind: 'star', x: 51, top: 46, size: 88, rotate: -63 },
  { kind: 'coconut', x: 30, top: 52, size: 50, rotate: 41, wideOnly: true },
  { kind: 'fish', x: 74, top: 57, size: 112, rotate: -9, flip: true },
  { kind: 'sun', x: 12, top: 63, size: 84, rotate: -28, wideOnly: true },
  { kind: 'palm', x: 47, top: 68, size: 120, rotate: 33 },
  { kind: 'coconut', x: 93, top: 72, size: 62, rotate: -52 },
  { kind: 'star', x: 18, top: 79, size: 96, rotate: 17 },
  { kind: 'fish', x: 60, top: 85, size: 78, rotate: 38, flip: true, wideOnly: true },
  { kind: 'palm', x: 90, top: 88, size: 140, rotate: -21, wideOnly: true },
  { kind: 'coconut', x: 40, top: 93, size: 54, rotate: 63 },
  { kind: 'fish', x: 5, top: 95, size: 88, rotate: -31, flip: true },
];

// --- Palmera: hojas de pluma (nervadura curva + foliolos) ---
const r = (n: number) => Math.round(n * 10) / 10;

/** Una hoja que apunta a la derecha y cae en la punta: nervadura + foliolos a ambos lados. */
function frond(): { spine: string; leaflets: string } {
  const spine = 'M0 0Q30-30 64 10';
  let leaflets = '';
  for (let i = 1; i <= 14; i++) {
    const t = 0.06 + i * 0.065;
    const x = 2 * (1 - t) * t * 30 + t * t * 64;
    const y = 2 * (1 - t) * t * -30 + t * t * 10;
    const dx = 2 * (1 - t) * 30 + 2 * t * 34;
    const dy = 2 * (1 - t) * -30 + 2 * t * 40;
    const len = Math.hypot(dx, dy);
    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;
    const l = 17 * (1 - 0.6 * t);
    for (const s of [1, -1]) {
      const vx = tx * 0.55 + nx * s * 0.85;
      const vy = ty * 0.55 + ny * s * 0.85;
      const vl = Math.hypot(vx, vy);
      leaflets += `M${r(x)} ${r(y)}L${r(x + (vx / vl) * l)} ${r(y + (vy / vl) * l)}`;
    }
  }
  return { spine, leaflets };
}
const FROND = frond();
/** Hojas de la derecha (las de la izquierda son el espejo). */
const FROND_ANGLES = [-68, -42, -16, 12];

// --- Estrella de mar: cinco brazos redondeados con puntitos blancos ---
const STAR_ARMS = [0, 1, 2, 3, 4].map((k) => -90 + k * 72);
const STAR_PATH = (() => {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (-90 + k * 36) * (Math.PI / 180);
    const rad = k % 2 === 0 ? 40 : 15;
    pts.push(`${r(50 + Math.cos(a) * rad)} ${r(50 + Math.sin(a) * rad)}`);
  }
  return `M${pts.join('L')}Z`;
})();

// --- Sol: rayos alrededor de un círculo con carita sonriente ---
const SUN_RAYS = Array.from({ length: 12 }, (_, k) => k * 30);
</script>

<template>
  <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <svg width="0" height="0" class="absolute">
      <defs>
        <!-- Palmera -->
        <symbol id="deco-palm" viewBox="0 0 140 165">
          <path d="M64 66C57 102 82 124 70 162L85 162C94 124 70 100 77 66Z" fill="#000" />
          <path d="M65 86l13-2M65 103l15 1M71 121l14 3M72 139l14 3" stroke="#fff" stroke-width="2" stroke-linecap="round" />
          <g transform="translate(70 62)">
            <g v-for="a in FROND_ANGLES" :key="`r${a}`" :transform="`rotate(${a})`">
              <path :d="FROND.leaflets" stroke="#000" stroke-width="2.6" stroke-linecap="round" fill="none" />
              <path :d="FROND.spine" stroke="#000" stroke-width="3.4" stroke-linecap="round" fill="none" />
            </g>
            <g transform="scale(-1 1)">
              <g v-for="a in FROND_ANGLES" :key="`l${a}`" :transform="`rotate(${a})`">
                <path :d="FROND.leaflets" stroke="#000" stroke-width="2.6" stroke-linecap="round" fill="none" />
                <path :d="FROND.spine" stroke="#000" stroke-width="3.4" stroke-linecap="round" fill="none" />
              </g>
            </g>
            <!-- Racimo de cocos -->
            <circle cx="-5" cy="6" r="7" fill="#000" stroke="#fff" stroke-width="1.6" />
            <circle cx="6" cy="7" r="7" fill="#000" stroke="#fff" stroke-width="1.6" />
            <circle cx="0" cy="14" r="7" fill="#000" stroke="#fff" stroke-width="1.6" />
          </g>
        </symbol>

        <!-- Coco con sus tres "ojitos" y brillo -->
        <symbol id="deco-coconut" viewBox="0 0 100 100">
          <path d="M50 8C78 8 92 30 92 56C92 80 74 94 50 94C26 94 8 80 8 56C8 30 22 8 50 8Z" fill="#000" />
          <path d="M22 40C24 28 32 21 42 18" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" />
          <circle cx="40" cy="58" r="5" fill="#fff" />
          <circle cx="60" cy="58" r="5" fill="#fff" />
          <circle cx="50" cy="74" r="5" fill="#fff" />
        </symbol>

        <!-- Estrella de mar -->
        <symbol id="deco-star" viewBox="0 0 100 100">
          <path :d="STAR_PATH" fill="#000" stroke="#000" stroke-width="12" stroke-linejoin="round" />
          <g v-for="a in STAR_ARMS" :key="a" :transform="`rotate(${a + 90} 50 50)`">
            <circle cx="50" cy="26" r="2.6" fill="#fff" />
            <circle cx="50" cy="16" r="2.2" fill="#fff" />
            <circle cx="50" cy="35" r="2.2" fill="#fff" />
          </g>
          <circle cx="50" cy="50" r="4" fill="#fff" />
        </symbol>

        <!-- Sol sonriente -->
        <symbol id="deco-sun" viewBox="0 0 100 100">
          <g v-for="a in SUN_RAYS" :key="a" :transform="`rotate(${a} 50 50)`">
            <path d="M50 4L56 20L44 20Z" fill="#000" />
          </g>
          <circle cx="50" cy="50" r="27" fill="#000" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="#fff" stroke-width="2" />
          <circle cx="41" cy="45" r="3.4" fill="#fff" />
          <circle cx="59" cy="45" r="3.4" fill="#fff" />
          <path d="M38 55C43 65 57 65 62 55" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" />
        </symbol>

        <!-- Pez -->
        <symbol id="deco-fish" viewBox="0 0 100 70">
          <path d="M6 35C20 12 52 10 72 30L94 12C89 26 89 44 94 58L72 40C52 60 20 58 6 35Z" fill="#000" />
          <path d="M38 17L50 5L60 20Z" fill="#000" />
          <circle cx="24" cy="31" r="5" fill="#fff" />
          <circle cx="25" cy="31" r="2.2" fill="#000" />
          <path d="M38 22C33 30 33 40 38 48" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" />
          <path d="M50 28q4 3 0 7M58 31q4 3 0 7M66 33q3 2 0 5" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" />
          <path d="M12 38Q18 41 24 39" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" />
        </symbol>
      </defs>
    </svg>

    <svg
      v-for="(item, i) in ITEMS"
      :key="i"
      :viewBox="VIEWBOX[item.kind]"
      class="absolute text-black opacity-[0.03]"
      :class="item.wideOnly ? 'hidden md:block' : ''"
      :style="{
        left: `${item.x}%`,
        top: `${item.top}%`,
        width: `${item.size}px`,
        height: `${item.size * RATIO[item.kind]}px`,
        transform: `translateX(-50%) rotate(${item.rotate}deg) scaleX(${item.flip ? -1 : 1})`,
      }"
    >
      <use :href="`#deco-${item.kind}`" />
    </svg>
  </div>
</template>
