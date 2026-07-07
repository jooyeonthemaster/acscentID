// ============================================================
// 사주 결과 페이지 — 섹션 공유 prop 계약 (UI-SPEC §5)
// 이 파일이 섹션 간 계약의 SSOT다. (소유: 결과 셸 에이전트 / Task B3)
// 章 컴포넌트(序~처방)와 SajuBottomActions는 전부 여기 정의된
// 인터페이스만 받는다 — 섹션이 추가 데이터가 필요하면 이 파일에
// 필드를 추가하지 말고 result(SajuAnalysisResult)에서 꺼낸다.
//
// 렌더 공통 규칙 (UI-SPEC §5.0):
// - 섹션 루트는 자기 px-6 / py-24(序·五章 제외)를 스스로 가진다.
// - 각 장 시작: VerticalLabel 장 번호(gold) 좌상단 + BrushDivider(width 200) 중앙,
//   킥커 = label 스타일 금색(11px/600/tracking 0.14em), 헤드라인 = display(34px/900).
// - 모든 서사 텍스트 break-keep + 전문 노출(§5.9 클램프 표의 예외만 클램프).
// - sticky 스크롤 연동은 序(이 폴더)와 五章(ChapterYongsin) 딱 2개(§5.10).
// ============================================================

import type { SajuAnalysisResult } from '@/types/analysis';

export type SajuTargetType = 'idol' | 'self';

/** 모든 章 섹션의 기본 계약 */
export interface SajuSectionBaseProps {
  /** 유니버설 코어 + sajuChart/sajuAnalysis(+sajuCompatibility) — 절대 재가공 없이 원본 전달 */
  result: SajuAnalysisResult;
  /** idol = 최애의 사주 / self = 나의 사주 (카피 분기용) */
  targetType: SajuTargetType;
  /** 현재 로케일 (ko/en/ja/zh/es) */
  locale: string;
}

/** 序 — 밤하늘 별 응집 (sticky 스크롤 연동 #1) */
export type PrologueStarsProps = SajuSectionBaseProps;

/** 一章 — 명식표. userName은 궁합 모드 명식 카드 이름 라벨용 */
export interface ChapterMyeongsikProps extends SajuSectionBaseProps {
  userName: string | null;
}

/** 二章 — 일간 대서사 */
export type ChapterIlganProps = SajuSectionBaseProps;

/** 三章 — 오행의 흐름 */
export type ChapterElementFlowProps = SajuSectionBaseProps;

/**
 * 四章 — 소망의 운(궁합 시 §5.5-B 완전 대체).
 * userName은 perfumeBasisNote({name} 님의 용신…) 용 — 없으면 캡션 생략.
 * ※ 구현 파일(ChapterPurpose.tsx)이 동일 시그니처의 인라인 인터페이스를 갖는다(동시 작업 산물).
 */
export interface ChapterPurposeProps extends SajuSectionBaseProps {
  userName?: string;
}

/** 五章 — 용신의 계시 (sticky 스크롤 연동 #2 — 마지막 sticky) */
export type ChapterYongsinProps = SajuSectionBaseProps;

/**
 * 終章 — 운명의 향 공개.
 * 향수명은 섹션이 result.matchingPerfumes[0]에서 직접 읽는다.
 * (로케일 향수명이 필요해지면 useLocalizedPerfumes를 섹션 내부에서 사용할 것 — 핸드오프 노트)
 */
export type ChapterRevealProps = SajuSectionBaseProps;

/** 처방전 — 리츄얼 (크림 반전 섹션) */
export type PrescriptionProps = SajuSectionBaseProps;

/**
 * 하단 고정 액션 바 — 기존 ResultBottomActions 계약 미러(§5.8 S8).
 * 사주는 시향지 CTA 없음(canBuyScentPaper false)이므로 onScentPaperCheckout 제외.
 * online: 공유/장바구니/바로구매, offline: 공유/피드백/기록.
 */
export interface SajuBottomActionsProps {
  onShare: () => void;
  onAddToCart: () => void;
  onCheckout: () => void;
  onFeedback?: () => void;
  onFeedbackHistory?: () => void;
  isShareSaving?: boolean;
  isAddingToCart?: boolean;
  serviceMode: 'online' | 'offline';
}
