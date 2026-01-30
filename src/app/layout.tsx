import type { Metadata } from "next";
import { Outfit, Jua, Kirang_Haerang } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { CouponProvider } from "@/contexts/CouponContext";
import { TransitionProvider } from "@/contexts/TransitionContext";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
// import { CouponSystem } from "@/components/coupon/CouponSystem";

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
  title: "AC'SCENT IDENTITY",
  description: "AI 기반 맞춤 퍼퓸 추천 서비스",
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
        className={`${outfit.variable} ${jua.variable} ${kirangHaerang.variable} antialiased bg-[#FAFAFA] min-h-screen font-sans selection:bg-yellow-200 selection:text-yellow-900`}
      >
        <AuthProvider>
          <CouponProvider>
            <TransitionProvider>
              <ToastProvider>
                <div className="w-full min-h-screen bg-[#FEF9E7] relative flex flex-col">
                  <div className="w-full max-w-[455px] mx-auto min-h-screen bg-[#FFFDF5] shadow-xl relative flex flex-col">
                    <main className="flex-1 md:pb-0 relative z-10 bg-[#FFFDF5]">
                      {children}
                    </main>
                    <Footer />
                    <MobileBottomNav />
                  </div>
                </div>
                {/* <CouponSystem /> */}
              </ToastProvider>
            </TransitionProvider>
          </CouponProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
