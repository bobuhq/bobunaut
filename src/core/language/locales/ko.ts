import type { TranslationDictionary } from "../types";
import { en } from "./en";

/**
 * Korean locale.
 *
 * English fallback values are used temporarily until each
 * user-facing module is translated and reviewed.
 */
export const ko: TranslationDictionary = {
  ...en,

  "identity.eyebrow": "BOBU GENESIS 액세스",
  "identity.title": "Genesis 체크포인트 완료",
  "identity.description": "BOBU 공식 커뮤니티 채널에 참여하여 Builder Passport를 잠금 해제하고 GP를 활성화하며 미션에 접근하세요.",
  "identity.progress": "커뮤니티 진행도",
  "identity.telegram.label": "BOBU Telegram 참여",
  "identity.telegram.description": "공식 BOBU Telegram 커뮤니티에 참여하여 Genesis 네트워크에 입장하세요.",
  "identity.telegram.join": "Telegram 참여",
  "identity.telegram.connect": "Telegram 연결",
  "identity.telegram.check": "Telegram 상태 확인",
  "identity.telegram.retry": "Telegram 다시 시도",
  "identity.x.label": "X에서 BOBU 팔로우",
  "identity.x.description": "공지, 미션 및 출시 업데이트를 위해 공식 BOBU 계정을 팔로우하세요.",
  "identity.x.connect": "X 연결",
  "identity.x.retry": "X 다시 시도",
  "identity.instagram.label": "Instagram에서 BOBU 팔로우",
  "identity.instagram.description": "Instagram에서 BOBU를 팔로우하고 시각적 Universe 여정에 참여하세요.",
  "identity.instagram.connect": "Instagram 연결",
  "identity.instagram.retry": "Instagram 다시 시도",
  "identity.wallet.label": "Solana 지갑",
  "identity.wallet.description": "지갑 연결은 향후 온체인 보상과 청구에 사용할 수 있습니다.",
  "identity.status.completed": "완료",
  "identity.status.completedCheck": "완료 ✓",
  "identity.status.required": "필수",
  "identity.status.inProgress": "진행 중",
  "identity.status.actionRequired": "작업 필요",
  "identity.status.checking": "확인 중...",
  "identity.status.comingSoon": "출시 예정",
  "identity.unlock.passport": "Builder Passport",
  "identity.unlock.gp": "BOBU GP",
  "identity.unlock.missions": "미션",
  "identity.unlock.unlocked": "잠금 해제됨",
  "identity.unlock.locked": "잠김",
  "identity.unlock.active": "활성",
};
