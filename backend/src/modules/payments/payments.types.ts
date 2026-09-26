export interface CreateIntentInput {
  orderId: string;
}

export interface CreateIntentResponse {
  clientSecret: string;
  paymentId: string;
  amount: number;
  currency: string;
}
