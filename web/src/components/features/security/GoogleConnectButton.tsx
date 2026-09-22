"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/**
 * ใช้ Google Identity Services ตรง ๆ แทนการเรียก signIn("google") ของ NextAuth
 *
 * เพราะ NextAuth flow ออกแบบมาเพื่อ "ล็อกอิน" — ถ้าเรียกตอนที่ผู้ใช้ล็อกอิน
 * อยู่แล้ว มันจะสลับ session ไปเป็นบัญชี Google ที่เพิ่งเลือก ซึ่งไม่ใช่สิ่งที่
 * ต้องการตรงนี้ เราอยากได้แค่ id token มาผูกกับบัญชีที่ล็อกอินค้างอยู่เท่านั้น
 *
 * ใช้ renderButton ของ GSI แทน prompt() (One Tap) เพราะ One Tap ถูกเบราว์เซอร์
 * หรือผู้ใช้ปิดไว้ได้ แล้วจะกดปุ่มไปเงียบ ๆ โดยไม่มีอะไรเกิดขึ้น
 */
type GoogleCredentialResponse = { credential?: string };

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "small" | "medium" | "large";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          width?: number;
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

export default function GoogleConnectButton({
  onToken,
  disabled,
}: {
  onToken: (idToken: string) => void;
  disabled?: boolean;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // GIS เก็บ callback ที่ส่งตอน initialize ไว้ตัวเดียว การ re-render ของ React
  // ไม่ควรทำให้มันชี้ไปที่ของเก่า จึงอ่านผ่าน ref เสมอ
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const google = window.google;

    if (!scriptLoaded || !clientId || !google || !containerRef.current) {
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          onTokenRef.current(response.credential);
        }
      },
    });

    google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
    });
  }, [scriptLoaded, clientId]);

  if (!clientId) {
    return (
      <p className="text-sm text-muted-foreground">
        Google sign-in is not configured on this environment.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <div
        ref={containerRef}
        aria-busy={disabled}
        className={disabled ? "pointer-events-none opacity-60" : undefined}
      />
    </>
  );
}
