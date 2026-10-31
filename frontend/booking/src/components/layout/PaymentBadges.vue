<!-- Insignias de los medios de pago aceptados (tarjeta, Visa, Mastercard, Apple Pay, Google Pay, Stripe, PayPal). -->
<template>
  <ul class="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
    <li title="Credit and debit cards">
      <svg viewBox="0 0 48 32" class="h-8 w-12" role="img" aria-label="Credit and debit cards">
        <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
        <rect x="9" y="8" width="30" height="17" rx="2.5" fill="none" stroke="#023e8a" stroke-width="1.6" />
        <rect x="9" y="11.5" width="30" height="3" fill="#023e8a" />
        <rect x="12" y="19" width="8" height="2" rx="1" fill="#0077b6" />
      </svg>
    </li>
    <li title="Visa">
      <svg viewBox="0 0 48 32" class="h-8 w-12" role="img" aria-label="Visa">
        <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
        <text x="24" y="20.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="900" font-style="italic" fill="#1a1f71">VISA</text>
      </svg>
    </li>
    <li title="Mastercard">
      <svg viewBox="0 0 48 32" class="h-8 w-12" role="img" aria-label="Mastercard">
        <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
        <circle cx="19.5" cy="16" r="8" fill="#eb001b" />
        <circle cx="28.5" cy="16" r="8" fill="#f79e1b" />
        <path d="M24 9.4a8 8 0 0 1 0 13.2 8 8 0 0 1 0-13.2Z" fill="#ff5f00" />
      </svg>
    </li>
    <li title="Apple Pay" class="flex h-8 w-12 items-center justify-center rounded border border-brand-100 bg-white">
      <img src="/payments/apple-pay.svg" alt="Apple Pay" width="512" height="210" class="h-3.5 w-auto" />
    </li>
    <li title="Google Pay" class="flex h-8 w-12 items-center justify-center rounded border border-brand-100 bg-white">
      <img src="/payments/google-pay.svg" alt="Google Pay" width="64" height="24" class="h-3.5 w-auto" />
    </li>
    <li title="Stripe">
      <svg viewBox="0 0 48 32" class="h-8 w-12" role="img" aria-label="Stripe">
        <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#635bff" />
        <text x="24" y="20.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="#fff">stripe</text>
      </svg>
    </li>
    <li title="PayPal">
      <svg viewBox="0 0 48 32" class="h-8 w-12" role="img" aria-label="PayPal">
        <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
        <text x="24" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="900" font-style="italic">
          <tspan fill="#003087">Pay</tspan><tspan fill="#009cde">Pal</tspan>
        </text>
      </svg>
    </li>
  </ul>
</template>
