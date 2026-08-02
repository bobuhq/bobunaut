import type { TranslationDictionary } from "../types";
import { en } from "./en";

/**
 * Finnish locale.
 *
 * English fallback values are used temporarily until each
 * user-facing module is translated and reviewed.
 */
export const fi: TranslationDictionary = {
  ...en,

  "identity.eyebrow": "BOBU GENESIS -PÄÄSY",
  "identity.title": "Suorita Genesis-tarkistuspiste",
  "identity.description": "Liity BOBUn virallisiin yhteisökanaviin avataksesi Builder Passportin, aktivoidaksesi GP:n ja päästäksesi tehtäviin.",
  "identity.progress": "Yhteisön edistyminen",
  "identity.telegram.label": "Liity BOBU Telegramiin",
  "identity.telegram.description": "Liity viralliseen BOBU Telegram -yhteisöön päästäksesi Genesis-verkostoon.",
  "identity.telegram.join": "Liity Telegramiin",
  "identity.telegram.connect": "Yhdistä Telegram",
  "identity.telegram.check": "Tarkista Telegramin tila",
  "identity.telegram.retry": "Yritä Telegramia uudelleen",
  "identity.x.label": "Seuraa BOBUa X:ssä",
  "identity.x.description": "Seuraa virallista BOBU-tiliä saadaksesi ilmoituksia, tehtäviä ja julkaisu-uutisia.",
  "identity.x.connect": "Yhdistä X",
  "identity.x.retry": "Yritä X:ää uudelleen",
  "identity.instagram.label": "Seuraa BOBUa Instagramissa",
  "identity.instagram.description": "Seuraa BOBUa Instagramissa ja liity visuaaliseen Universe-matkaan.",
  "identity.instagram.connect": "Yhdistä Instagram",
  "identity.instagram.retry": "Yritä Instagramia uudelleen",
  "identity.wallet.label": "Solana-lompakko",
  "identity.wallet.description": "Lompakkoyhteys tulee myöhemmin käyttöön lohkoketjupalkintoja ja lunastuksia varten.",
  "identity.status.completed": "Valmis",
  "identity.status.completedCheck": "Valmis ✓",
  "identity.status.required": "Pakollinen",
  "identity.status.inProgress": "Käynnissä",
  "identity.status.actionRequired": "Toimenpide vaaditaan",
  "identity.status.checking": "Tarkistetaan...",
  "identity.status.comingSoon": "Tulossa pian",
  "identity.unlock.passport": "Builder Passport",
  "identity.unlock.gp": "BOBU GP",
  "identity.unlock.missions": "Tehtävät",
  "identity.unlock.unlocked": "Avattu",
  "identity.unlock.locked": "Lukittu",
  "identity.unlock.active": "Aktiivinen",

  "home.hero.eyebrow": "ENSIMMÄINEN VALO ON AKTIIVINEN",
  "home.hero.titlePrefix": "Me",
  "home.hero.titleHighlight": "rakennamme avaruutta.",
  "home.hero.description": "Tapaa BUBO, hylätyn universumin ensimmäinen tutkimusmatkailija. Suorita tehtäviä, löydä kadonneita sektoreita ja auta rakentamaan uusi digitaalinen sivilisaatio.",
  "home.hero.primaryAction": "Avaa tehtäväkeskus",
  "home.hero.secondaryAction": "Tutki galaksia",
  "home.hero.liveSignal": "LIVE-SIGNAALI · GENESIS-SEKTORI 01",
  "home.hero.planetLabel": "GENESIS",
  "home.hero.transmissionLabel": "SAAPUVA LÄHETYS",
  "home.hero.transmissionTitle": "BUBO ON SAAPUNUT SEKTORILLE",
  "home.hero.transmissionText": "Hei, Builder. Löysin hylätyn universumin. Autatko minua rakentamaan sen?",
  "home.hero.transmissionAlt": "Lähetys BUBOlta",
  "home.hero.signalStable": "Signaali vakaa",
  "home.hero.sectorOnline": "Sektori verkossa",
  "home.hero.sectorStatus": "GENESIS-SEKTORI VERKOSSA",
};
