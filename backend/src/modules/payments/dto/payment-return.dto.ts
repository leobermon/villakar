import { Matches } from 'class-validator';

export class StripeConfirmDto {
  @Matches(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/, { message: 'Invalid session id' })
  sessionId: string;
}

export class PaypalCaptureDto {
  @Matches(/^[A-Z0-9]{10,40}$/, { message: 'Invalid order id' })
  orderId: string;
}
