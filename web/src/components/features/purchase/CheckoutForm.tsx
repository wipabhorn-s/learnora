"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkoutAction } from "@/lib/actions/purchase.action";
import type {
  CheckoutInput,
  MobileBank,
  PaymentMethod,
} from "@/lib/api/purchase.api";
import {
  cardLengths,
  formatCardNumber,
  formatExpiry,
  passesLuhn,
} from "@/lib/card";
import { formatBaht } from "@/lib/format";
import { createCardToken } from "@/lib/omise";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { CreditCard, QrCode, Smartphone, Wallet } from "lucide-react";
import { useState, useTransition } from "react";

/** Opn เก็บเงินขั้นต่ำ ฿20 ทุกช่องทาง (API ก็เช็กซ้ำ) */
const MIN_PAYMENT = 20;

const METHODS: {
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** ยอดสูงสุดต่อครั้งที่ช่องทางนี้รับ (บาท) ไม่มี = ไม่จำกัดฝั่งเรา */
  maxAmount?: number;
}[] = [
  {
    value: "CARD",
    label: "Credit / debit card",
    hint: "Visa, Mastercard, JCB",
    icon: CreditCard,
  },
  {
    value: "PROMPTPAY",
    label: "PromptPay QR",
    hint: "Scan with any banking app",
    icon: QrCode,
  },
  {
    value: "MOBILE_BANKING",
    label: "Mobile banking",
    hint: "K PLUS, SCB Easy and more",
    icon: Smartphone,
  },
  {
    value: "TRUEMONEY",
    label: "TrueMoney Wallet",
    hint: "Pay with your wallet balance",
    icon: Wallet,
    // เพดานของ Opn สำหรับ TrueMoney (API ก็เช็กซ้ำ)
    maxAmount: 100_000,
  },
];

const BANKS: { value: MobileBank; label: string }[] = [
  { value: "kbank", label: "Kasikorn Bank (K PLUS)" },
  { value: "scb", label: "SCB (SCB Easy)" },
  { value: "ktb", label: "Krungthai (Krungthai NEXT)" },
  { value: "bbl", label: "Bangkok Bank (Bualuang mBanking)" },
  { value: "bay", label: "Krungsri (KMA)" },
];

type FieldName = "name" | "number" | "expiry" | "cvc" | "phone" | "bank";
type FieldErrors = Partial<Record<FieldName, string>>;

export default function CheckoutForm({
  total,
  replacePending = false,
}: {
  total: number;
  /** ผู้ใช้กดยืนยันจากหน้ารอจ่ายแล้วว่าจะยกเลิกรายการเดิม */
  replacePending?: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [card, setCard] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: "",
  });
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState<MobileBank | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const isFree = total === 0;
  const belowMinimum = !isFree && total < MIN_PAYMENT;

  // พิมพ์แก้ช่องไหน ข้อความแดงของช่องนั้นหายทันที
  const clearError = (field: FieldName) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const updateCard = (field: keyof typeof card, value: string) => {
    setCard((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};

    if (method === "CARD") {
      const [month, year] = card.expiry.split("/").map(Number);
      if (!card.name.trim()) found.name = "Enter the name on the card";
      const digits = card.number.replace(/\s/g, "");
      if (!cardLengths(digits).includes(digits.length)) {
        found.number = "Card number is incomplete";
      } else if (!passesLuhn(digits)) {
        found.number = "Check the card number and try again";
      }
      if (!month || month > 12 || !year || card.expiry.length !== 5) {
        found.expiry = "Use MM/YY";
      }
      if (!/^\d{3,4}$/.test(card.cvc)) found.cvc = "3 or 4 digits";
    }
    if (method === "TRUEMONEY" && !/^0\d{9}$/.test(phone)) {
      found.phone = "Enter a 10-digit number starting with 0";
    }
    if (method === "MOBILE_BANKING" && !bank) found.bank = "Choose your bank";

    return found;
  };

  const buildInput = async (): Promise<CheckoutInput> => {
    switch (method) {
      case "CARD": {
        const [month, year] = card.expiry.split("/").map(Number);
        const cardToken = await createCardToken({
          name: card.name.trim(),
          number: card.number.replace(/\s/g, ""),
          expirationMonth: month,
          expirationYear: 2000 + year,
          securityCode: card.cvc,
        });
        return { method, cardToken };
      }
      case "TRUEMONEY":
        return { method, phoneNumber: phone };
      case "MOBILE_BANKING":
        return { method, bank: bank! };
      default:
        return { method };
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isFree) {
      const found = validate();
      setErrors(found);
      if (Object.values(found).some(Boolean)) return;
    }

    startTransition(async () => {
      let input: CheckoutInput = { replacePending };
      if (!isFree) {
        try {
          input = { ...(await buildInput()), replacePending };
        } catch (error) {
          // Opn ปฏิเสธข้อมูลบัตรตั้งแต่ขั้นสร้างโทเค็น (เลขผิด บัตรหมดอายุ ฯลฯ)
          toast.error(
            error instanceof Error ? error.message : "Invalid card details",
          );
          return;
        }
      }

      // สำเร็จหรือต้องไปหน้าอื่น action จะ redirect เอง ถึงบรรทัดถัดไปแปลว่าไม่ผ่าน
      const result = await checkoutAction(input);
      if (result) toast.error(result.message);
    });
  };

  if (isFree) {
    return (
      <form method="post" onSubmit={handleSubmit}>
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="w-full text-base font-semibold"
        >
          {isPending ? "Processing..." : "Confirm order — Free"}
        </Button>
      </form>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="grid gap-5">
      <div
        role="radiogroup"
        aria-label="Payment method"
        className="grid gap-3 sm:grid-cols-2"
      >
        {METHODS.map(({ value, label, hint, icon: Icon, maxAmount }) => {
          const selected = method === value;
          // ยอดเกินเพดาน: ปิดตัวเลือกไว้เลย ดีกว่าให้กดจ่ายแล้วโดน Opn ปฏิเสธ
          const overLimit = maxAmount !== undefined && total > maxAmount;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setMethod(value);
                setErrors({});
              }}
              disabled={isPending || overLimit}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-primary bg-secondary"
                  : "border-border hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted-foreground">
                  {overLimit
                    ? `Up to ${formatBaht(maxAmount)} per payment`
                    : hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {method === "CARD" && (
        <div className="grid gap-4">
          <Field className="gap-1.5" data-invalid={!!errors.name}>
            <FieldLabel required htmlFor="card-name">
              Name on card
            </FieldLabel>
            <Input
              id="card-name"
              value={card.name}
              onChange={(event) => updateCard("name", event.target.value)}
              autoComplete="cc-name"
              placeholder="Enter name on card"
              aria-invalid={!!errors.name}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field className="gap-1.5" data-invalid={!!errors.number}>
            <FieldLabel required htmlFor="card-number">
              Card number
            </FieldLabel>
            <Input
              id="card-number"
              value={card.number}
              onChange={(event) =>
                updateCard("number", formatCardNumber(event.target.value))
              }
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              aria-invalid={!!errors.number}
            />
            <FieldError>{errors.number}</FieldError>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field className="gap-1.5" data-invalid={!!errors.expiry}>
              <FieldLabel required htmlFor="card-expiry">
                Expiry date
              </FieldLabel>
              <Input
                id="card-expiry"
                value={card.expiry}
                onChange={(event) =>
                  updateCard("expiry", formatExpiry(event.target.value))
                }
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                aria-invalid={!!errors.expiry}
              />
              <FieldError>{errors.expiry}</FieldError>
            </Field>

            <Field className="gap-1.5" data-invalid={!!errors.cvc}>
              <FieldLabel required htmlFor="card-cvc">
                CVC
              </FieldLabel>
              <Input
                id="card-cvc"
                value={card.cvc}
                onChange={(event) =>
                  updateCard(
                    "cvc",
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                aria-invalid={!!errors.cvc}
              />
              <FieldError>{errors.cvc}</FieldError>
            </Field>
          </div>

          <p className="text-sm text-muted-foreground">
            Your bank may ask you to confirm the payment (3-D Secure).
          </p>
        </div>
      )}

      {method === "PROMPTPAY" && (
        <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          We&apos;ll show a QR code on the next page. Scan it with any Thai
          banking app within 15 minutes. Your courses unlock as soon as the
          payment arrives.
        </p>
      )}

      {method === "MOBILE_BANKING" && (
        <Field className="gap-1.5" data-invalid={!!errors.bank}>
          <FieldLabel>Bank</FieldLabel>
          <Select
            value={bank}
            onValueChange={(value) => {
              setBank(value as MobileBank);
              clearError("bank");
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={!!errors.bank}>
              <SelectValue placeholder="Choose your bank">
                {(value) =>
                  BANKS.find((item) => item.value === value)?.label ??
                  "Choose your bank"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BANKS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{errors.bank}</FieldError>
          <p className="text-sm text-muted-foreground">
            Works best on your phone — we&apos;ll open your banking app to
            confirm.
          </p>
        </Field>
      )}

      {method === "TRUEMONEY" && (
        <Field className="gap-1.5" data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="truemoney-phone">
            TrueMoney phone number
          </FieldLabel>
          <Input
            id="truemoney-phone"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
              clearError("phone");
            }}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="0812345678"
            aria-invalid={!!errors.phone}
          />
          <FieldError>{errors.phone}</FieldError>
          <p className="text-sm text-muted-foreground">
            You&apos;ll confirm with a one-time code sent to this number.
          </p>
        </Field>
      )}

      {belowMinimum && (
        <p className="text-sm text-destructive">
          The minimum payment is ฿{MIN_PAYMENT}. Add another course to continue.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isPending || belowMinimum}
        className="w-full text-base font-semibold"
      >
        {isPending ? "Processing..." : `Pay ${formatBaht(total)}`}
      </Button>
    </form>
  );
}
