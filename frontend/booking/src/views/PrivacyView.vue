<script setup lang="ts">
import SiteHeader from '@/components/layout/SiteHeader.vue';
import { reopenConsent } from '@/analytics';

const CONTACT_EMAIL = 'reservations@villakartransfers.com';
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <article class="rounded-3xl border border-brand-100 bg-white p-6 text-[15px] leading-relaxed text-brand-950 sm:p-10">
        <h1 class="font-display text-2xl font-semibold sm:text-3xl">VillaKar Privacy Policy</h1>
        <p class="mt-1 text-sm font-semibold tracking-wide text-brand-600 uppercase">What we collect, why, and your choices</p>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">1. Who we are</h2>
          <p>
            VillaKar Transfers ("we", "us") arranges private ground transportation in Cancun and the Riviera Maya through
            this website. You can reach us at
            <a :href="`mailto:${CONTACT_EMAIL}`" class="font-semibold underline underline-offset-2 hover:text-brand-800">{{ CONTACT_EMAIL }}</a>.
          </p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">2. Information we collect</h2>
          <ul class="list-disc space-y-1 pl-6">
            <li>
              <strong>Booking details:</strong> your name, email address and phone number; pickup and drop-off places,
              dates and times; number of passengers; flight information; and any special requests you write.
            </li>
            <li>
              <strong>Payment information:</strong> payments by card or PayPal are processed by Stripe and PayPal. We do
              not receive or store your full card number. We keep the payment status, amount and method.
            </li>
            <li>
              <strong>Messages:</strong> what you send us through the contact form or by email.
            </li>
            <li>
              <strong>Usage data (optional):</strong> if you accept cookies, Google Analytics tells us which pages are
              visited, from which country and device type, and whether a booking was completed. We do not use it to
              identify you personally.
            </li>
          </ul>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">3. How we use it</h2>
          <ul class="list-disc space-y-1 pl-6">
            <li>To confirm, manage and carry out your transfer, and to contact you about it.</li>
            <li>To take payment and prevent fraud.</li>
            <li>To answer your questions and quote requests.</li>
            <li>To keep our accounting and meet legal obligations.</li>
            <li>To understand how the site is used and improve it (only with your consent).</li>
          </ul>
          <p>We do not sell your personal information.</p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">4. Who we share it with</h2>
          <p>We share information only as needed to provide the service, with:</p>
          <ul class="list-disc space-y-1 pl-6">
            <li>The drivers and transportation partners who carry out your transfer.</li>
            <li>Stripe and PayPal, to process your payment.</li>
            <li>Our email provider, to send your confirmations and messages.</li>
            <li>Google, for hotel search suggestions (Google Maps) and, with your consent, for website analytics.</li>
            <li>Authorities, when the law requires it.</li>
          </ul>
          <p>
            Some of these providers are located outside Mexico, so your information may be processed in other countries,
            including the United States.
          </p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">5. Cookies</h2>
          <p>
            The booking itself does not need cookies. We ask for your permission before using Google Analytics cookies,
            which only help us measure and improve the site. Until you choose, no analytics cookies are stored. If you
            decline, the site works exactly the same.
          </p>
          <p>
            You can change your choice at any time:
            <button
              type="button"
              class="font-semibold underline underline-offset-2 hover:text-brand-800"
              @click="reopenConsent"
            >
              Cookie settings
            </button>
          </p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">6. How long we keep it</h2>
          <p>
            We keep booking and payment records for as long as needed to provide the service, handle any claim, and meet
            our accounting and legal obligations. After that we delete or anonymize them.
          </p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">7. Your rights</h2>
          <p>
            You may ask us to access, correct or delete your personal information, to limit how we use it, or to withdraw
            your consent for analytics. Write to us at
            <a :href="`mailto:${CONTACT_EMAIL}`" class="font-semibold underline underline-offset-2 hover:text-brand-800">{{ CONTACT_EMAIL }}</a>
            and we will reply as soon as we can. Some records we must keep by law.
          </p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">8. Security and changes</h2>
          <p>
            Our site uses HTTPS and access to booking data is limited to our team. No system is perfectly secure, but we
            take reasonable steps to protect your information. If we change this policy, we will post the new version on
            this page.
          </p>
        </section>
      </article>
    </main>
  </div>
</template>
