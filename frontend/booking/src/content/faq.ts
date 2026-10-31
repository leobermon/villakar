/**
 * Preguntas frecuentes de la página /faq (en inglés, como todo el sitio).
 * Las respuestas salen de lo que realmente ofrece el servicio (precios en USD, vehículos,
 * pagos, horario, términos). Si cambia alguna regla del negocio, se actualiza aquí.
 * El mismo texto alimenta la página y los datos estructurados (FAQPage) para Google.
 */
import { SITE } from '@/config';

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is the transfer private or shared?',
    answer:
      'All our transfers are 100% private. The vehicle is just for you and your group: no shared shuttles, no waiting for other passengers and no stops at other hotels.',
  },
  {
    question: 'How will I find my driver at Cancun Airport?',
    answer:
      'Your driver waits for you at arrivals in Terminals 2, 3 and 4, holding a sign with your name. Please enter your flight number when you book so we know when you land.',
  },
  {
    question: 'How much does a transfer cost and what is included?',
    answer:
      'You see the final price for your route and group before you pay. Prices are in US dollars and are per vehicle, so the whole group is included: you do not pay per person. The price you see when you book is the price you pay.',
  },
  {
    question: 'How long is the drive from Cancun Airport to my hotel?',
    answer:
      'Approximate driving times without traffic: Cancun Hotel Zone about 20 minutes, Puerto Morelos about 25 minutes, Playa del Carmen about 45 minutes, Akumal about 1 hour 15 minutes and Tulum about 1 hour 30 minutes. Traffic and weather can add some time.',
  },
  {
    question: 'What happens if my flight is delayed?',
    answer:
      'Give us your correct flight number when you book. If your flight is delayed we will make reasonable efforts to adjust your pickup time, subject to availability and as long as we are notified. A waiting fee or rescheduling fee may apply. For airport arrivals, we wait up to 90 minutes after your flight lands. Please read our Terms and Conditions for details.',
  },
  {
    question: 'Which vehicle do I need for my group and luggage?',
    answer:
      'Our Sedan fits up to 2 passengers and 2 suitcases, the V.I.P fits up to 4 passengers and 4 suitcases, and the Transit fits up to 7 passengers and 7 suitcases. The booking form shows the vehicles that fit your group. If you are traveling with more than 7 people, contact us for a group quote.',
  },
  {
    question: 'How can I pay for my transfer?',
    answer:
      'You can pay online with a credit or debit card (Visa, Mastercard, American Express), with Apple Pay or Google Pay when your device supports them, or with PayPal. You can also choose to pay your driver in cash after the service. Card payments are processed securely by Stripe and charged in Mexican pesos (MXN). If your pickup is less than 8 hours away, payment must be made online to guarantee your reservation.',
  },
  {
    question: 'Can I book a round trip or a transfer from my hotel to the airport?',
    answer:
      `Yes. You can book airport to hotel, hotel to airport, ${SITE.hotelToHotelEnabled ? 'hotel to hotel, ' : ''}and round trips in a single reservation. Pickups are available from 5:00 am to 8:00 pm (Cancun time). For departures, we suggest a pickup about 3 hours before an international flight (2 hours before a domestic one).`,
  },
  {
    question: 'Which areas do you serve?',
    answer:
      'We take you from Cancun Airport to Cancun and the Hotel Zone, Puerto Juarez, Playa Mujeres, Costa Mujeres, Puerto Morelos, Playa del Carmen, Puerto Aventuras, Akumal and Tulum. If your hotel is outside our online booking zones, send us a message and we will reply with a personalized quote.',
  },
  {
    question: 'How do I get my confirmation, and what if I need to change my booking?',
    answer:
      'Once your reservation is confirmed, you receive an email with your reservation code and trip details, and you can open and print it at any time from the reservation page. If you need to change something, such as your flight or the number of passengers, contact us as soon as possible through our Contact page.',
  },
];
