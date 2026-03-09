import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/seo/schemas";
import { SetHtmlLang } from "./SetHtmlLang";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.acscent.co.kr";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    ko: "AC'SCENT IDENTITY - AI 맞춤 퍼퓸 추천 서비스",
    en: "AC'SCENT IDENTITY - AI Custom Perfume Recommendation",
    ja: "AC'SCENT IDENTITY - AIカスタムパフューム推薦サービス",
    zh: "AC'SCENT IDENTITY - AI定制香水推荐服务",
    es: "AC'SCENT IDENTITY - Servicio de Recomendación de Perfumes con IA",
  };

  const descriptions: Record<string, string> = {
    ko: "AI 이미지 분석으로 나만의 맞춤 퍼퓸을 찾아드립니다. 이미지 분석 퍼퓸, 피규어 화분 디퓨저, 졸업 기념 퍼퓸. 10,000건 이상 분석, 만족도 95%.",
    en: "Find your perfect custom perfume with AI image analysis. Image analysis perfume, figure pot diffuser, graduation perfume. Over 10,000 analyses, 95% satisfaction.",
    ja: "AI画像分析であなただけのカスタムパフュームを見つけます。画像分析パフューム、フィギュア鉢ディフューザー、卒業記念パフューム。10,000件以上分析、満足度95%。",
    zh: "通过AI图像分析为您找到专属定制香水。图像分析香水、人偶花盆扩香器、毕业纪念香水。分析超过10,000次，满意度95%。",
    es: "Encuentra tu perfume personalizado perfecto con análisis de imagen IA. Perfume de análisis de imagen, difusor de figura, perfume de graduación. Más de 10,000 análisis, 95% de satisfacción.",
  };

  const ogLocales: Record<string, string> = {
    ko: "ko_KR",
    en: "en_US",
    ja: "ja_JP",
    zh: "zh_CN",
    es: "es_ES",
  };

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      template: "%s | AC'SCENT IDENTITY",
      default: titles[locale] || titles.ko,
    },
    description: descriptions[locale] || descriptions.ko,
    authors: [{ name: "AC'SCENT IDENTITY", url: BASE_URL }],
    creator: "주식회사 네안더",
    publisher: "AC'SCENT IDENTITY",
    openGraph: {
      type: "website",
      siteName: "AC'SCENT IDENTITY",
      locale: ogLocales[locale] || "ko_KR",
      url: BASE_URL,
      title: titles[locale] || titles.ko,
      description: descriptions[locale] || descriptions.ko,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "AC'SCENT IDENTITY",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titles[locale] || titles.ko,
      description: descriptions[locale] || descriptions.ko,
      images: ["/opengraph-image"],
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || "",
      other: {
        "naver-site-verification": [
          process.env.NAVER_SITE_VERIFICATION || "",
        ],
      },
    },
    alternates: {
      canonical: locale === "ko" ? BASE_URL : `${BASE_URL}/${locale}`,
      languages: {
        ko: BASE_URL,
        en: `${BASE_URL}/en`,
        ja: `${BASE_URL}/ja`,
        zh: `${BASE_URL}/zh`,
        es: `${BASE_URL}/es`,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // locale 유효성 검사
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <SetHtmlLang locale={locale} />
      <JsonLd data={organizationSchema(locale as Locale)} />
      <JsonLd data={webSiteSchema(locale as Locale)} />
      <div className="w-full min-h-screen bg-[#FEF9E7] relative flex flex-col">
        <div className="w-full max-w-[455px] mx-auto min-h-screen bg-[#FFFDF5] shadow-xl relative flex flex-col">
          <main className="flex-1 md:pb-0 relative z-10 bg-[#FFFDF5]">
            {children}
          </main>
          <Footer />
          <MobileBottomNav />
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
