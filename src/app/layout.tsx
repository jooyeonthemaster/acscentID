import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

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
      <body
        className={`${outfit.variable} antialiased bg-[#FAFAFA] flex justify-center min-h-screen font-sans selection:bg-yellow-200 selection:text-yellow-900`}
      >
        <ToastProvider>
          <div className="
            w-full min-h-screen bg-background relative overflow-x-hidden
            sm:max-w-[480px] sm:shadow-2xl
            md:max-w-[420px]
            lg:max-w-[380px]
          ">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
