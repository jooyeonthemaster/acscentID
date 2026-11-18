/* eslint-disable @next/next/no-img-element -- 장면 그림 견본 */
import Link from 'next/link'
import { VIDEO_PROGRAMS } from './plans'
import './stage.css'

// 키오스크 영상판 미리보기 목록 — /kiosk/video
export const metadata = { title: '키오스크 영상판 미리보기', robots: { index: false, follow: false } }

export default function KioskVideoIndex() {
  return (
    <main className="kv-index">
      <h1>키오스크 영상판 미리보기</h1>
      <p>길잡이 인물 영상이 단계마다 끊김 없이 이어지는지 보는 화면이에요. 카메라 · AI 는 부르지 않아요.</p>
      <ul>
        {Object.values(VIDEO_PROGRAMS).map((p) => (
          <li key={p.id}>
            <Link href={`/kiosk/video/${p.id}`}>
              <img src={`${p.plan.base}/${p.first}.webp`} alt="" />
              <b>{p.tag} {p.name}</b>
              <span>{p.guide}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
