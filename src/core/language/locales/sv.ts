import type { TranslationDictionary } from "../types";
import { en } from "./en";

/**
 * Swedish locale.
 *
 * English fallback values are used temporarily until each
 * user-facing module is translated and reviewed.
 */
export const sv: TranslationDictionary = {
  ...en,

  "identity.eyebrow": "BOBU GENESIS-ÅTKOMST",
  "identity.title": "Slutför Genesis-kontrollpunkten",
  "identity.description": "Gå med i BOBUs officiella communitykanaler för att låsa upp ditt Builder Passport, aktivera GP och få tillgång till uppdrag.",
  "identity.progress": "Communityframsteg",
  "identity.telegram.label": "Gå med i BOBU Telegram",
  "identity.telegram.description": "Gå med i den officiella BOBU Telegram-communityn för att komma in i Genesis-nätverket.",
  "identity.telegram.join": "Gå med i Telegram",
  "identity.telegram.connect": "Anslut Telegram",
  "identity.telegram.check": "Kontrollera Telegram-status",
  "identity.telegram.retry": "Försök med Telegram igen",
  "identity.x.label": "Följ BOBU på X",
  "identity.x.description": "Följ det officiella BOBU-kontot för meddelanden, uppdrag och lanseringsnyheter.",
  "identity.x.connect": "Anslut X",
  "identity.x.retry": "Försök med X igen",
  "identity.instagram.label": "Följ BOBU på Instagram",
  "identity.instagram.description": "Följ BOBU på Instagram och bli en del av den visuella Universe-resan.",
  "identity.instagram.connect": "Anslut Instagram",
  "identity.instagram.retry": "Försök med Instagram igen",
  "identity.wallet.label": "Solana-plånbok",
  "identity.wallet.description": "Plånboksanslutning blir tillgänglig för framtida on-chain-belöningar och uttag.",
  "identity.status.completed": "Slutförd",
  "identity.status.completedCheck": "Slutförd ✓",
  "identity.status.required": "Obligatorisk",
  "identity.status.inProgress": "Pågår",
  "identity.status.actionRequired": "Åtgärd krävs",
  "identity.status.checking": "Kontrollerar...",
  "identity.status.comingSoon": "Kommer snart",
  "identity.unlock.passport": "Builder Passport",
  "identity.unlock.gp": "BOBU GP",
  "identity.unlock.missions": "Uppdrag",
  "identity.unlock.unlocked": "Upplåst",
  "identity.unlock.locked": "Låst",
  "identity.unlock.active": "Aktiv",
};
