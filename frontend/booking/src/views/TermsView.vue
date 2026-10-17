<script setup lang="ts">
import SiteHeader from '@/components/layout/SiteHeader.vue';
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <article class="rounded-3xl border border-brand-100 bg-white p-6 text-[15px] leading-relaxed text-brand-950 sm:p-10">
        <h1 class="font-display text-2xl font-semibold sm:text-3xl">VillaKar Terms and Conditions</h1>
        <p class="mt-1 text-sm font-semibold tracking-wide text-brand-600 uppercase">
          Intermediary services, limitation of liability and force majeure
        </p>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">1. Intermediary role</h2>
          <p>
            VillaKarShuttle acts solely as an intermediary / booking agent for ground transportation and tour services
            provided by third-party suppliers. We are not an airline, hotel, park, or government entity. We do not own or
            operate aircraft, airports, or archaeological sites.
          </p>
          <p>Our obligation is limited to arranging the reservation as requested by the client.</p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">2. Flight changes, delays and no-shows – no liability</h2>
          <p>
            Client is responsible for providing correct flight information. VillaKarShuttle is not responsible for and
            shall not be liable for:
          </p>
          <ol class="list-[lower-alpha] space-y-1 pl-6">
            <li>Flight delays, cancellations, rescheduling, or missed connections caused by airlines.</li>
            <li>Client missing their transfer due to flight changes.</li>
            <li>Any additional costs incurred by the client due to airline changes.</li>
          </ol>
          <p>
            In case of flight delay, we will make reasonable efforts to adjust the pickup time subject to availability and
            upon notification by the client. A waiting fee or rescheduling fee may apply. No refund will be issued for
            missed transfers due to incorrect flight info or airline changes not notified at least 5 hours in advance.
          </p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">3. Force majeure and weather conditions</h2>
          <p>
            VillaKarShuttle shall not be liable for failure or delay in performing services due to circumstances beyond
            our reasonable control (Force Majeure), including but not limited to: adverse weather conditions (hurricane,
            tropical storm, heavy rain), natural disasters, sargassum alerts, government orders, road closures, accidents,
            traffic, airport closures, strikes, pandemics, or acts of authorities at archaeological sites or parks.
          </p>
          <p>In such Force Majeure events:</p>
          <ul class="list-disc space-y-1 pl-6">
            <li>No refund will be provided for services that are delayed but still rendered.</li>
            <li>
              If the service cannot be performed, client may reschedule subject to availability within 12 months, or
              receive a partial credit. No cash refund for the Force Majeure portion.
            </li>
            <li>
              Parks and archaeological sites may close without prior notice. This is outside our control and no refund is
              due from us. Claims must be directed to the park/site operator.
            </li>
          </ul>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">4. Services provided by third parties</h2>
          <p>
            Tours to parks (Xcaret, Xel-Ha, etc.), archaeological zones (Chichen Itza, Tulum, etc.) are operated by
            independent third parties. All park rules, closures, capacity limits, and itinerary changes are decided by
            those operators. VillaKarShuttle is not responsible for their actions, closures, or changes.
          </p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">5. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, VillaKarShuttle's total liability shall not exceed the total amount
            paid by the client for the specific service booked. We shall not be liable for any indirect, incidental,
            consequential damages, lost flights, lost hotel nights, or loss of enjoyment.
          </p>
          <p>Client acknowledges that ground transportation involves road risks and agrees to travel with travel insurance.</p>
        </section>

        <section class="mt-8 space-y-3">
          <h2 class="font-display text-lg font-semibold">6. Client responsibility</h2>
          <p>
            Client must have valid travel insurance, travel documents, and be at the lobby/meeting point at the scheduled
            time. A no-show after 10 minutes of waiting time for tours and 90 minutes after landing for airport arrivals
            (or after last notification) will be considered as service rendered with no refund.
          </p>
        </section>
      </article>
    </main>
  </div>
</template>
