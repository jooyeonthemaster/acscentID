import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ivcjjrzvmmtwkvxcajrg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
    ];
    return [
      {
        // POST! 우체통 기기 화면(/booth/post)만 빼고 전부
        source: '/((?!booth/post(?:/|$)).*)',
        headers: [
          ...common,
          // 일부 PG사(특히 모바일 카드결제 경로)가 자사 결제 UI를 iframe으로
          // 동일 오리진에 렌더링하는 케이스가 있어 DENY→SAMEORIGIN으로 완화.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // POST! 우체통 — 3D 광장 데모(neander-booth-idea)의 우체통 화면 속에 iframe 으로 띄운다(카메라 · 마이크는 iframe allow 로 넘김)
        source: '/booth/post/:path*',
        headers: [
          ...common,
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://neander-booth-idea.vercel.app http://localhost:* http://127.0.0.1:*" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
