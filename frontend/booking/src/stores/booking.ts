import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import {
  requestQuote,
  type QuoteLocation,
  type QuoteRequest,
  type QuoteResult,
  type RouteType,
  type TripType,
} from '@/api/booking';
import { ApiError } from '@/api/client';
import { SITE } from '@/config';

/** Hotel elegido en el buscador. */
export interface SelectedPlace {
  googlePlaceId: string;
  mainText: string;
  secondaryText: string | null;
  sessionToken: string;
}

export interface SearchForm {
  route: RouteType;
  tripType: TripType;
  /** Hotel principal (destino si se llega del aeropuerto, origen en los demás casos). */
  hotel: SelectedPlace | null;
  /** Solo en HOTEL_HOTEL: hotel de destino. */
  secondHotel: SelectedPlace | null;
  date: string;
  returnDate: string;
  passengers: number;
}

function hotelLocation(place: SelectedPlace): QuoteLocation {
  return { googlePlaceId: place.googlePlaceId, sessionToken: place.sessionToken };
}

/** Vehículo preseleccionado en los resultados: el Transporter, o el primero si no está disponible. */
const DEFAULT_VEHICLE_CODE = 'TRANSPORTER';

function defaultRateId(result: QuoteResult): number | null {
  const preferred = result.options.find((option) => option.vehicleType.code === DEFAULT_VEHICLE_CODE);
  return (preferred ?? result.options[0])?.rateId ?? null;
}

export const useBookingStore = defineStore('booking', () => {
  const search = reactive<SearchForm>({
    route: 'AIRPORT_HOTEL',
    tripType: 'ROUND_TRIP',
    hotel: null,
    secondHotel: null,
    date: '',
    returnDate: '',
    passengers: 1,
  });

  const quote = ref<QuoteResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedRateId = ref<number | null>(null);

  const selectedOption = computed(
    () => quote.value?.options.find((option) => option.rateId === selectedRateId.value) ?? null,
  );

  function buildQuoteRequest(): QuoteRequest {
    const airport: QuoteLocation = { airportCode: SITE.airport.code };
    const hotel = hotelLocation(search.hotel!);

    const [origin, destination] =
      search.route === 'AIRPORT_HOTEL'
        ? [airport, hotel]
        : search.route === 'HOTEL_AIRPORT'
          ? [hotel, airport]
          : [hotel, hotelLocation(search.secondHotel!)];

    return {
      tripType: search.tripType,
      origin,
      destination,
      date: search.date,
      returnDate: search.tripType === 'ROUND_TRIP' ? search.returnDate : undefined,
      passengers: search.passengers,
    };
  }

  /** Cotiza con los datos del buscador. Devuelve true si se obtuvo respuesta. */
  async function fetchQuote(): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      quote.value = await requestQuote(buildQuoteRequest());
      selectedRateId.value = defaultRateId(quote.value);
      return true;
    } catch (e) {
      if (!(e instanceof ApiError)) console.error(e);
      error.value = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function selectOption(rateId: number) {
    selectedRateId.value = rateId;
  }

  return {
    search,
    quote,
    loading,
    error,
    selectedRateId,
    selectedOption,
    buildQuoteRequest,
    fetchQuote,
    selectOption,
  };
});
