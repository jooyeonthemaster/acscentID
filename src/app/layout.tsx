import type { Metadata } from "next";
import { Outfit, Jua, Kirang_Haerang } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { CouponProvider } from "@/contexts/CouponContext";
import { TransitionProvider } from "@/contexts/TransitionContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/seo/schemas";

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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acscent.co.kr';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: "%s | AC'SCENT IDENTITY",
    default: "AC'SCENT IDENTITY - AI 맞춤 퍼퓸 추천 서비스",
  },
  description:
    "AI 이미지 분석으로 나만의 맞춤 퍼퓸을 찾아드립니다. 이미지 분석 퍼퓸, 피규어 화분 디퓨저, 졸업 기념 퍼퓸. 10,000건 이상 분석, 만족도 95%.",
  keywords: [
    "맞춤 향수", "AI 퍼퓸", "향수 추천", "커스텀 향수", "이미지 분석 향수",
    "퍼스널 퍼퓸", "피규어 디퓨저", "졸업 선물", "덕후 향수", "아이돌 향수",
  ],
  authors: [{ name: "AC'SCENT IDENTITY", url: BASE_URL }],
  creator: "주식회사 네안더",
  publisher: "AC'SCENT IDENTITY",
  openGraph: {
    type: "website",
    siteName: "AC'SCENT IDENTITY",
    locale: "ko_KR",
    url: BASE_URL,
    title: "AC'SCENT IDENTITY - AI 맞춤 퍼퓸 추천 서비스",
    description: "이미지 분석으로 당신만의 향기를 찾아드립니다. AI 퍼퓸, 피규어 디퓨저, 졸업 기념 퍼퓸.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AC'SCENT IDENTITY - AI 맞춤 퍼퓸",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AC'SCENT IDENTITY - AI 맞춤 퍼퓸 추천 서비스",
    description: "이미지 분석으로 당신만의 향기를 찾아드립니다",
    images: ["/opengraph-image"],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "",
    other: {
      "naver-site-verification": [process.env.NAVER_SITE_VERIFICATION || ""],
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
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
        <JsonLd data={organizationSchema()} />
        <JsonLd data={webSiteSchema()} />
        <AuthProvider>
          <AnalyticsProvider>
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
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
