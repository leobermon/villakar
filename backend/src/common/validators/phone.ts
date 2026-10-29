import { ValidationOptions, registerDecorator } from 'class-validator';
import { getCountries, getCountryCallingCode, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

/** Códigos ISO de país que reconoce libphonenumber (MX, US, GB…). */
export const PHONE_COUNTRIES: string[] = getCountries();

const E164 = /^\+[1-9]\d{6,14}$/;

/** Teléfono en formato internacional E.164 (+529981234567) y válido para su país. */
export function IsInternationalPhone(options?: ValidationOptions): PropertyDecorator {
  return (object, propertyName) =>
    registerDecorator({
      name: 'isInternationalPhone',
      target: object.constructor,
      propertyName: propertyName as string,
      options: { message: 'Please enter a valid phone number with its country code.', ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && E164.test(value) && isValidPhoneNumber(value),
      },
    });
}

/** true si el número (E.164) usa la clave del país indicado; +1 lo comparten EE. UU., Canadá y el Caribe. */
export function phoneMatchesCountry(phone: string, country: string): boolean {
  return phone.startsWith(`+${getCountryCallingCode(country as CountryCode)}`);
}
