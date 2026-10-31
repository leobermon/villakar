import {
  ArrayMaxSize,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const PHONE = /^\+?[0-9 ()-]{6,30}$/;
const optional = (_: object, value: unknown) => value !== '';

export class CompanySettingsDto {
  @IsString() @IsNotEmpty({ message: 'El nombre comercial es obligatorio.' }) @MaxLength(120)
  name!: string;

  @IsString() @ValidateIf(optional) @Matches(PHONE, { message: 'Teléfono no válido. Incluye la clave de país: +52 998 …' })
  phone!: string;

  @IsString() @ValidateIf(optional) @Matches(PHONE, { message: 'WhatsApp no válido. Incluye la clave de país: +52 998 …' })
  whatsapp!: string;

  @IsString() @ValidateIf(optional) @IsEmail({}, { message: 'Correo de la empresa no válido.' }) @MaxLength(190)
  email!: string;

  @IsString() @MaxLength(255)
  address!: string;

  @IsString() @MaxLength(120)
  hours!: string;
}

export class BookingSettingsDto {
  @IsInt() @Min(0) @Max(168, { message: 'La anticipación mínima debe ser de 0 a 168 horas.' })
  minNoticeHours!: number;

  @IsInt() @Min(30, { message: 'El apartado debe ser de al menos 30 minutos (lo exige Stripe).' }) @Max(1440)
  holdMinutes!: number;

  @IsInt() @Min(1) @Max(50, { message: 'Máximo de pasajeros en línea: de 1 a 50.' })
  maxOnlinePassengers!: number;

  @IsNumber() @Min(1) @Max(6, { message: 'La recogida antes del vuelo debe ser de 1 a 6 horas.' })
  departurePickupLeadHours!: number;

  @IsNumber() @Min(1) @Max(2.5, { message: 'El factor de viaje redondo debe estar entre 1 y 2.5.' })
  roundTripFactor!: number;
}

export class PaymentSettingsDto {
  @IsBoolean() cardEnabled!: boolean;
  @IsBoolean() paypalEnabled!: boolean;
  @IsBoolean() cashEnabled!: boolean;

  @ValidateIf((_: object, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El tipo de cambio debe ser un número.' })
  @Min(1, { message: 'El tipo de cambio USD → MXN debe estar entre 1 y 100.' })
  @Max(100, { message: 'El tipo de cambio USD → MXN debe estar entre 1 y 100.' })
  usdToMxnRate!: number | null;
}

export class NotificationSettingsDto {
  @IsString() @IsNotEmpty({ message: 'Escribe el nombre del remitente.' }) @MaxLength(80)
  @Matches(/^[^"<>\r\n]*$/, { message: 'El nombre del remitente no puede llevar comillas ni < >.' })
  senderName!: string;

  @IsEmail({}, { message: 'Correo del remitente no válido.' }) @MaxLength(190)
  senderEmail!: string;

  @IsEmail({}, { each: true, message: 'Uno de los correos del equipo no es válido.' }) @ArrayMaxSize(20)
  teamEmails!: string[];

  @IsBoolean() notifyNewReservation!: boolean;
  @IsBoolean() notifyContactRequest!: boolean;
  @IsBoolean() notifyPaymentToVerify!: boolean;

  @IsIn(['en', 'es']) paymentLinkLanguage!: 'en' | 'es';
}

export const SECTION_DTO = {
  company: CompanySettingsDto,
  booking: BookingSettingsDto,
  payments: PaymentSettingsDto,
  notifications: NotificationSettingsDto,
} as const;

