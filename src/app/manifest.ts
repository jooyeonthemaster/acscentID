import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AC'SCENT IDENTITY - AI 맞춤 퍼퓸 추천",
    short_name: 'ACSCENT',
    description: 'AI 이미지 분석으로 나만의 맞춤 퍼퓸을 찾아드립니다',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFDF5',
    theme_color: '#FCD34D',
    icons: [
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
