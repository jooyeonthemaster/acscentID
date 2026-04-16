import type { Metadata, Viewport } from "next";
import { Outfit, Jua, Kirang_Haerang } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { CouponProvider } from "@/contexts/CouponContext";
import { TransitionProvider } from "@/contexts/TransitionContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { ClarityProvider } from "@/contexts/ClarityContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jua = Jua({
  subsets: ["latin"],
  variable: "--font-jua",
  weight: "400",
});

const kirangHaerang = Kirang_Haerang({
  subsets: ["latin"],
  variable: "--font-kirang",
  weight: "400",
});

export const metadata: Metadata = {
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

// 모바일 viewport 명시 — PG 결제창 호출 시 의도치 않은 줌/리사이즈 방지.
// maximumScale=5로 접근성(확대) 여지를 남긴다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#FEF9E7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        {/* Daum 우편번호 — afterInteractive로 로드해 모바일 첫 클릭에서
            스크립트가 준비되지 않아 발생하는 체감 지연을 방지한다. */}
        <Script
          src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${outfit.variable} ${jua.variable} ${kirangHaerang.variable} antialiased bg-[#FAFAFA] min-h-screen font-sans selection:bg-yellow-200 selection:text-yellow-900`}
      >
        <AuthProvider>
          <ClarityProvider>
            <AnalyticsProvider>
              <CouponProvider>
              <TransitionProvider>
                <ToastProvider>
                    {children}
                  </ToastProvider>
                </TransitionProvider>
              </CouponProvider>
            </AnalyticsProvider>
          </ClarityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
