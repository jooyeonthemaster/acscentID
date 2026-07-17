import type { Metadata, Viewport } from "next";
import { Outfit, Jua, Kirang_Haerang, Noto_Serif_KR } from "next/font/google";
import localFont from "next/font/local";
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

// 에스코어드림 — 한글 본문 서체 (self-host).
// Outfit 은 라틴 전용이라 한글이 OS 기본 폰트(Apple SD Gothic Neo / 맑은 고딕)로 폴백되던 문제를 해결한다.
// 위계에 필요한 굵기만 선별 로드: 3 Light / 4 Regular / 5 Medium / 6 Bold / 7 ExtraBold
const scoreDream = localFont({
  variable: "--font-score-dream",
  display: "swap",
  src: [
    { path: "../../public/fonts/score-dream/SCoreDream-3Light.woff", weight: "300", style: "normal" },
    { path: "../../public/fonts/score-dream/SCoreDream-4Regular.woff", weight: "400", style: "normal" },
    { path: "../../public/fonts/score-dream/SCoreDream-5Medium.woff", weight: "500", style: "normal" },
    { path: "../../public/fonts/score-dream/SCoreDream-6Bold.woff", weight: "600", style: "normal" },
    { path: "../../public/fonts/score-dream/SCoreDream-7ExtraBold.woff", weight: "700", style: "normal" },
  ],
});

// Wanted Sans — 한글 본문 서체 (self-host, 가변 폰트 단일 파일).
// 기하학적이면서 획이 곧고 끝이 날카로워 클래식 세리프 로고와 호응한다. (에스코어드림 대체)
const wantedSans = localFont({
  variable: "--font-wanted",
  display: "swap",
  src: [
    { path: "../../public/fonts/wanted-sans/WantedSansVariable.woff2", weight: "400 800", style: "normal" },
  ],
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

// 홈 섹션 제목용 — 프리텐다드 (self-host 가변 폰트, 적당히 굵은 SemiBold로 사용)
const headingSerif = localFont({
  variable: "--font-heading-serif",
  display: "swap",
  src: [
    { path: "../../public/fonts/pretendard/PretendardVariable.woff2", weight: "400 900", style: "normal" },
  ],
});

// 사주 분석 퍼퓸 전용 세리프 (UI-SPEC §1.2)
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],           // 한글 서브셋은 next/font가 unicode-range 분할로 자동 처리
  variable: "--font-noto-serif-kr",
  weight: ["400", "600", "900"],
  display: "swap",
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
  themeColor: "#08090F",
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
        className={`${outfit.variable} ${wantedSans.variable} ${scoreDream.variable} ${jua.variable} ${kirangHaerang.variable} ${headingSerif.variable} ${notoSerifKR.variable} antialiased bg-[#0C0E16] min-h-screen font-wanted selection:bg-[#232838] selection:text-[#E9E2D0]`}
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
