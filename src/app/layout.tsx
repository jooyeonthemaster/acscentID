import type { Metadata } from "next";
import { Outfit, Jua, Kirang_Haerang } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { CouponProvider } from "@/contexts/CouponContext";
import { TransitionProvider } from "@/contexts/TransitionContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <Script
          src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          strategy="lazyOnload"
        />
      </head>
      <body
        className={`${outfit.variable} ${jua.variable} ${kirangHaerang.variable} antialiased bg-[#FAFAFA] min-h-screen font-sans selection:bg-yellow-200 selection:text-yellow-900`}
      >
        <AuthProvider>
          <AnalyticsProvider>
            <CouponProvider>
              <TransitionProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </TransitionProvider>
            </CouponProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
