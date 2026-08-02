import type { TranslationDictionary } from "../types";
import { en } from "./en";

/**
 * Russian locale.
 *
 * English fallback values are used temporarily until each
 * user-facing module is translated and reviewed.
 */
export const ru: TranslationDictionary = {
  ...en,

  "identity.eyebrow": "ДОСТУП BOBU GENESIS",
  "identity.title": "Пройдите контрольную точку Genesis",
  "identity.description": "Присоединяйтесь к официальным каналам BOBU, чтобы открыть Builder Passport, активировать GP и получить доступ к миссиям.",
  "identity.progress": "Прогресс сообщества",
  "identity.telegram.label": "Присоединиться к BOBU Telegram",
  "identity.telegram.description": "Вступите в официальное сообщество BOBU в Telegram, чтобы войти в сеть Genesis.",
  "identity.telegram.join": "Вступить в Telegram",
  "identity.telegram.connect": "Подключить Telegram",
  "identity.telegram.check": "Проверить статус Telegram",
  "identity.telegram.retry": "Повторить Telegram",
  "identity.x.label": "Подписаться на BOBU в X",
  "identity.x.description": "Подпишитесь на официальный аккаунт BOBU, чтобы получать объявления, миссии и новости запуска.",
  "identity.x.connect": "Подключить X",
  "identity.x.retry": "Повторить X",
  "identity.instagram.label": "Подписаться на BOBU в Instagram",
  "identity.instagram.description": "Подпишитесь на BOBU в Instagram и станьте частью визуального путешествия Universe.",
  "identity.instagram.connect": "Подключить Instagram",
  "identity.instagram.retry": "Повторить Instagram",
  "identity.wallet.label": "Кошелёк Solana",
  "identity.wallet.description": "Подключение кошелька станет доступно для будущих наград и заявок в блокчейне.",
  "identity.status.completed": "Завершено",
  "identity.status.completedCheck": "Завершено ✓",
  "identity.status.required": "Обязательно",
  "identity.status.inProgress": "В процессе",
  "identity.status.actionRequired": "Требуется действие",
  "identity.status.checking": "Проверка...",
  "identity.status.comingSoon": "Скоро",
  "identity.unlock.passport": "Builder Passport",
  "identity.unlock.gp": "BOBU GP",
  "identity.unlock.missions": "Миссии",
  "identity.unlock.unlocked": "Открыто",
  "identity.unlock.locked": "Заблокировано",
  "identity.unlock.active": "Активно",
};
