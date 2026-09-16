/** Custom data we attach at checkout, read back off every transaction/subscription event Paddle sends for it. */
export interface PaddleCustomData {
  email: string;
  inviterId?: string;
  toltReferralId?: string;
  signupOrigin?: string;
}

export interface PaddleTransactionPayload {
  id: string;
  userId: number | null;
  customer: string | null;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  paidAt: Date | null;
}
