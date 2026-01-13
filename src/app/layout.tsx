import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { CouponProvider } from "@/contexts/CouponContext";
import { Footer } from "@/components/layout/Footer";
import { CouponSystem } from "@/components/coupon/CouponSystem";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AC'SCENT IDENTITY",
  description: "AI 기반 맞춤 향수 추천 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          strategy="lazyOnload"
        />
      </head>
      <body
        className={`${outfit.variable} antialiased bg-[#FAFAFA] min-h-screen font-sans selection:bg-yellow-200 selection:text-yellow-900`}
      >
        <AuthProvider>
          <CouponProvider>
            <ToastProvider>
              <div className="w-full min-h-screen bg-background relative overflow-x-hidden flex flex-col">
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
              <CouponSystem />
            </ToastProvider>
          </CouponProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
