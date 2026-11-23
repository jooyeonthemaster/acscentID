import os from 'node:os'
import { NextResponse } from 'next/server'

// 개발용 — 기기 화면이 localhost 로 열려 있으면 휴대폰이 찾아올 수 있는 같은 와이파이 주소(IPv4)를 알려 준다
export async function GET() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ ip: null })
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter((n): n is os.NetworkInterfaceInfo => Boolean(n && n.family === 'IPv4' && !n.internal))
    .map((n) => n.address)
  const ip = ips.find((a) => a.startsWith('192.168.')) ?? ips.find((a) => a.startsWith('10.')) ?? ips[0] ?? null
  return NextResponse.json({ ip })
}
