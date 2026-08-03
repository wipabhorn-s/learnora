"use client";

import { Button } from "@/components/ui/button";
import { checkoutAction } from "@/lib/actions/purchase.action";
import { stripePromise } from "@/lib/stripe";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState, useTransition } from "react";

const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "14px",
      color: "#1a1523",
      "::placeholder": { color: "#6b6885" },
    },
  },
};

function CheckoutFormInner({ total }: { total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardName, setCardName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) return;

    setError(null);

    startTransition(async () => {
      const { paymentMethod, error: stripeError } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardNumberElement,
          billing_details: { name: cardName },
        });

      if (stripeError) {
        setError(stripeError.message ?? "Invalid card details");
        return;
      }

      await checkoutAction(paymentMethod.id);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Card Number</label>
        <div className="rounded-xl border border-border bg-muted px-4 py-3">
          <CardNumberElement options={ELEMENT_OPTIONS} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Expiry Date</label>
          <div className="rounded-xl border border-border bg-muted px-4 py-3">
            <CardExpiryElement options={ELEMENT_OPTIONS} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">CVV</label>
          <div className="rounded-xl border border-border bg-muted px-4 py-3">
            <CardCvcElement options={ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cardholder Name</label>
        <input
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder="Sarah Chen"
          required
          className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <Button
        type="submit"
        disabled={!stripe || isPending}
        className="h-12 w-full text-base font-semibold"
      >
        {isPending
          ? "Processing..."
          : `Confirm Payment — ฿${total.toLocaleString()}`}
      </Button>
    </form>
  );
}

export default function CheckoutForm({ total }: { total: number }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutFormInner total={total} />
    </Elements>
  );
}
