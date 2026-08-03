import Logo from "@/components/shared/Logo";
import { Shield } from "lucide-react";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield size={15} className="text-emerald-500" />
            <span className="font-medium">Secure Checkout</span>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
