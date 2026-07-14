// 방문 예약 이메일 템플릿
// 기존 templates.ts(한국어 관리자 전용)와 분리. 고객용은 5개 언어를 이 파일에 내장한다.
// (이메일 발송은 next-intl 렌더 컨텍스트 밖에서 일어나므로 messages/*.json을 쓰지 않는다)

import type { Locale } from '@/i18n/config'

// 프로그램 한국어 라벨 — 캘린더 이벤트 제목/노션/관리자 메일 공용
export const RESERVATION_PROGRAM_LABELS_KO: Record<string, string> = {
  'idol-image': 'AI 이미지 분석 퍼퓸',
  personal: '퍼스널 센트',
  chemistry: '레이어링 퍼퓸 (케미)',
}

const PROGRAM_LABELS: Record<Locale, Record<string, string>> = {
  ko: RESERVATION_PROGRAM_LABELS_KO,
  en: {
    'idol-image': 'AI Image Analysis Perfume',
    personal: 'Personal Scent',
    chemistry: 'Layering Perfume (Chemistry)',
  },
  ja: {
    'idol-image': 'AI画像分析パフューム',
    personal: 'パーソナルセント',
    chemistry: 'レイヤリングパフューム（ケミ）',
  },
  zh: {
    'idol-image': 'AI图像分析香水',
    personal: '个人定制香水',
    chemistry: '叠加香水（Chemistry）',
  },
  es: {
    'idol-image': 'Perfume de Análisis de Imagen IA',
    personal: 'Personal Scent',
    chemistry: 'Perfume de Capas (Chemistry)',
  },
}

export function getReservationProgramLabel(program: string, locale: Locale): string {
  return PROGRAM_LABELS[locale]?.[program] || RESERVATION_PROGRAM_LABELS_KO[program] || program
}

const STORE_ADDRESS: Record<Locale, string> = {
  ko: '서울 마포구 와우산로 112-1 1층 (AC\'SCENT ID)',
  en: "AC'SCENT ID — 1F, 112-1 Wausan-ro, Mapo-gu, Seoul, Korea",
  ja: "AC'SCENT ID — ソウル市麻浦区ワウサン路112-1 1階",
  zh: "AC'SCENT ID — 首尔麻浦区卧牛山路112-1 1层",
  es: "AC'SCENT ID — 1F, 112-1 Wausan-ro, Mapo-gu, Seúl, Corea",
}

const MAP_URL = "https://maps.google.com/?q=AC'SCENT+ID+112-1+Wausan-ro+Mapo-gu+Seoul"

const INTL_LOCALE: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
  es: 'es-ES',
}

/** 예약 일시를 KST 기준으로 로케일 포맷 (KST 표기 포함) */
export function formatSlotKst(slotStartIso: string, locale: Locale): string {
  const formatted = new Date(slotStartIso).toLocaleString(INTL_LOCALE[locale], {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${formatted} (KST)`
}

export interface ReservationAdminEmailData {
  reservationCode: string
  name: string
  email: string
  phone: string | null
  program: string
  partySize: number
  slotStartIso: string
  notes: string | null
  locale: string
  calendarRegistered: boolean
  createdAt: string
}

// 관리자용 (한국어)
export function reservationAdminTemplate(data: ReservationAdminEmailData) {
  const programLabel = RESERVATION_PROGRAM_LABELS_KO[data.program] || data.program
  const slotText = formatSlotKst(data.slotStartIso, 'ko')
  const row = (label: string, value: string, highlight = false) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 600; width: 30%;">${label}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe;${highlight ? ' font-weight: 700; color: #0369a1;' : ''}">${value}</td>
    </tr>`

  return {
    subject: `[ACSCENT] 📅 새 방문 예약: ${data.reservationCode} (${slotText})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">📅 새 방문 예약이 접수되었습니다</h2>
        ${
          data.calendarRegistered
            ? ''
            : `<p style="background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px 16px; border-radius: 8px; font-weight: 700;">
                ⚠️ 구글 캘린더 등록 실패 — 캘린더에 수동으로 입력해주세요. (더블부킹 위험)
              </p>`
        }
        <table style="width: 100%; border-collapse: collapse; background: #f0f9ff; border-radius: 8px;">
          ${row('예약번호', data.reservationCode, true)}
          ${row('예약일시', slotText, true)}
          ${row('이름', data.name)}
          ${row('이메일', data.email)}
          ${row('전화', data.phone || '미제공')}
          ${row('프로그램', programLabel)}
          ${row('인원', `${data.partySize}명`)}
          ${row('요청사항', data.notes || '없음')}
          ${row('언어', data.locale)}
          ${row('접수일시', data.createdAt)}
        </table>
      </div>
    `,
  }
}

export interface ReservationCustomerEmailData {
  reservationCode: string
  name: string
  program: string
  partySize: number
  slotStartIso: string
}

interface CustomerCopy {
  subject: (code: string) => string
  greeting: (name: string) => string
  intro: string
  codeLabel: string
  dateLabel: string
  programLabel: string
  partyLabel: string
  party: (n: number) => string
  addressLabel: string
  mapLabel: string
  payment: string
  cancel: string
  footer: string
}

const CUSTOMER_COPY: Record<Locale, CustomerCopy> = {
  ko: {
    subject: (code) => `[AC'SCENT] 방문 예약이 확정되었습니다 (${code})`,
    greeting: (name) => `${name}님, 안녕하세요!`,
    intro: "AC'SCENT ID 방문 예약이 확정되었습니다. 예약 정보를 확인해주세요.",
    codeLabel: '예약번호',
    dateLabel: '예약일시',
    programLabel: '프로그램',
    partyLabel: '인원',
    party: (n) => `${n}명`,
    addressLabel: '매장 주소',
    mapLabel: '지도에서 보기',
    payment: '결제는 방문 당일 매장에서 진행됩니다. (현장 결제)',
    cancel: '예약 변경이나 취소가 필요하시면 이 메일에 회신해주세요.',
    footer: '방문을 기다리고 있을게요. 감사합니다!',
  },
  en: {
    subject: (code) => `[AC'SCENT] Your visit reservation is confirmed (${code})`,
    greeting: (name) => `Hello ${name},`,
    intro: "Your reservation at AC'SCENT ID has been confirmed. Please check the details below.",
    codeLabel: 'Reservation code',
    dateLabel: 'Date & time',
    programLabel: 'Program',
    partyLabel: 'Party size',
    party: (n) => `${n} ${n === 1 ? 'person' : 'people'}`,
    addressLabel: 'Store address',
    mapLabel: 'View on map',
    payment: 'Payment is made in-store on the day of your visit. (Pay on site)',
    cancel: 'To change or cancel your reservation, simply reply to this email.',
    footer: 'We look forward to seeing you. Thank you!',
  },
  ja: {
    subject: (code) => `[AC'SCENT] ご来店予約が確定しました（${code}）`,
    greeting: (name) => `${name}様`,
    intro: 'AC\'SCENT IDのご来店予約が確定しました。以下の予約内容をご確認ください。',
    codeLabel: '予約番号',
    dateLabel: '予約日時',
    programLabel: 'プログラム',
    partyLabel: '人数',
    party: (n) => `${n}名`,
    addressLabel: '店舗住所',
    mapLabel: '地図で見る',
    payment: 'お支払いはご来店当日、店舗にてお願いいたします。（現地決済）',
    cancel: '予約の変更・キャンセルはこのメールにご返信ください。',
    footer: 'ご来店を心よりお待ちしております。',
  },
  zh: {
    subject: (code) => `[AC'SCENT] 您的到店预约已确认（${code}）`,
    greeting: (name) => `${name}您好！`,
    intro: '您在AC\'SCENT ID的到店预约已确认，请查看以下预约信息。',
    codeLabel: '预约编号',
    dateLabel: '预约时间',
    programLabel: '项目',
    partyLabel: '人数',
    party: (n) => `${n}人`,
    addressLabel: '门店地址',
    mapLabel: '在地图上查看',
    payment: '费用于到店当天在门店支付。（现场付款）',
    cancel: '如需更改或取消预约，请直接回复此邮件。',
    footer: '期待您的光临，谢谢！',
  },
  es: {
    subject: (code) => `[AC'SCENT] Tu reserva de visita está confirmada (${code})`,
    greeting: (name) => `Hola ${name},`,
    intro: 'Tu reserva en AC\'SCENT ID ha sido confirmada. Revisa los detalles a continuación.',
    codeLabel: 'Código de reserva',
    dateLabel: 'Fecha y hora',
    programLabel: 'Programa',
    partyLabel: 'Personas',
    party: (n) => `${n} ${n === 1 ? 'persona' : 'personas'}`,
    addressLabel: 'Dirección de la tienda',
    mapLabel: 'Ver en el mapa',
    payment: 'El pago se realiza en la tienda el día de tu visita. (Pago en el local)',
    cancel: 'Para cambiar o cancelar tu reserva, responde a este correo.',
    footer: '¡Te esperamos. Gracias!',
  },
}

// 고객용 (고객 언어)
export function reservationCustomerTemplate(
  data: ReservationCustomerEmailData,
  locale: Locale
) {
  const copy = CUSTOMER_COPY[locale] || CUSTOMER_COPY.en
  const programLabel = getReservationProgramLabel(data.program, locale)
  const slotText = formatSlotKst(data.slotStartIso, locale)
  const row = (label: string, value: string, highlight = false) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #fde68a; font-weight: 600; width: 38%;">${label}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #fde68a;${highlight ? ' font-weight: 700; color: #92400e;' : ''}">${value}</td>
    </tr>`

  return {
    subject: copy.subject(data.reservationCode),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">${copy.greeting(data.name)}</h2>
        <p style="color: #374151; margin-bottom: 20px;">${copy.intro}</p>
        <table style="width: 100%; border-collapse: collapse; background: #fffbeb; border-radius: 8px;">
          ${row(copy.codeLabel, data.reservationCode, true)}
          ${row(copy.dateLabel, slotText, true)}
          ${row(copy.programLabel, programLabel)}
          ${row(copy.partyLabel, copy.party(data.partySize))}
          ${row(copy.addressLabel, `${STORE_ADDRESS[locale] || STORE_ADDRESS.en}<br/><a href="${MAP_URL}" style="color: #0369a1;">${copy.mapLabel} →</a>`)}
        </table>
        <p style="margin-top: 20px; color: #374151;">💳 ${copy.payment}</p>
        <p style="color: #374151;">✉️ ${copy.cancel}</p>
        <p style="margin-top: 24px; color: #6b7280;">${copy.footer}</p>
        <p style="margin-top: 8px; color: #9ca3af; font-size: 12px;">AC'SCENT IDENTITY</p>
      </div>
    `,
  }
}
