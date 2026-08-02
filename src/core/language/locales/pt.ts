import type { TranslationDictionary } from "../types";
import { en } from "./en";

/**
 * Portuguese locale.
 *
 * English fallback values are used temporarily until each
 * user-facing module is translated and reviewed.
 */
export const pt: TranslationDictionary = {
  ...en,

  "identity.eyebrow": "ACESSO BOBU GENESIS",
  "identity.title": "Conclua o ponto de controle Genesis",
  "identity.description": "Entre nos canais oficiais da comunidade BOBU para desbloquear seu Builder Passport, ativar GP e acessar missões.",
  "identity.progress": "Progresso da comunidade",
  "identity.telegram.label": "Entrar no BOBU Telegram",
  "identity.telegram.description": "Entre na comunidade oficial BOBU no Telegram para acessar a rede Genesis.",
  "identity.telegram.join": "Entrar no Telegram",
  "identity.telegram.connect": "Conectar Telegram",
  "identity.telegram.check": "Verificar status do Telegram",
  "identity.telegram.retry": "Tentar Telegram novamente",
  "identity.x.label": "Seguir BOBU no X",
  "identity.x.description": "Siga a conta oficial BOBU para anúncios, missões e atualizações de lançamento.",
  "identity.x.connect": "Conectar X",
  "identity.x.retry": "Tentar X novamente",
  "identity.instagram.label": "Seguir BOBU no Instagram",
  "identity.instagram.description": "Siga BOBU no Instagram e faça parte da jornada visual do Universe.",
  "identity.instagram.connect": "Conectar Instagram",
  "identity.instagram.retry": "Tentar Instagram novamente",
  "identity.wallet.label": "Carteira Solana",
  "identity.wallet.description": "A conexão da carteira ficará disponível para futuras recompensas e resgates on-chain.",
  "identity.status.completed": "Concluído",
  "identity.status.completedCheck": "Concluído ✓",
  "identity.status.required": "Obrigatório",
  "identity.status.inProgress": "Em andamento",
  "identity.status.actionRequired": "Ação necessária",
  "identity.status.checking": "Verificando...",
  "identity.status.comingSoon": "Em breve",
  "identity.unlock.passport": "Builder Passport",
  "identity.unlock.gp": "BOBU GP",
  "identity.unlock.missions": "Missões",
  "identity.unlock.unlocked": "Desbloqueado",
  "identity.unlock.locked": "Bloqueado",
  "identity.unlock.active": "Ativo",
};
