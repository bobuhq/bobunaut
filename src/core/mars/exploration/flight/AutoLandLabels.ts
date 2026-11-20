type Labels = {
  action: string;
  prompt: string;
  active: string;
  complete: string;
};

const labels: Record<string, Labels> = {
  en: {
    action: "AUTO LAND · F",
    prompt: "Press F to land",
    active: "AUTO LANDING",
    complete: "LANDED",
  },
  tr: {
    action: "OTOMATİK İNİŞ · F",
    prompt: "İniş için F’ye bas",
    active: "OTOMATİK İNİŞ",
    complete: "İNİŞ TAMAMLANDI",
  },
  de: {
    action: "AUTO-LANDUNG · F",
    prompt: "F zum Landen drücken",
    active: "AUTOMATISCHE LANDUNG",
    complete: "GELANDET",
  },
  es: {
    action: "ATERRIZAJE AUTO · F",
    prompt: "Pulsa F para aterrizar",
    active: "ATERRIZANDO",
    complete: "ATERRIZAJE COMPLETO",
  },
  fr: {
    action: "ATTERRISSAGE AUTO · F",
    prompt: "Appuyez sur F pour atterrir",
    active: "ATTERRISSAGE EN COURS",
    complete: "ATTERRISSAGE TERMINÉ",
  },
  fi: {
    action: "AUTOMAATTILASKU · F",
    prompt: "Paina F laskeutuaksesi",
    active: "LASKEUTUMINEN KÄYNNISSÄ",
    complete: "LASKEUTUNUT",
  },
  pt: {
    action: "POUSO AUTOMÁTICO · F",
    prompt: "Pressione F para pousar",
    active: "POUSO EM ANDAMENTO",
    complete: "POUSO CONCLUÍDO",
  },
  ru: {
    action: "АВТОПОСАДКА · F",
    prompt: "Нажмите F для посадки",
    active: "ИДЁТ ПОСАДКА",
    complete: "ПОСАДКА ЗАВЕРШЕНА",
  },
  ar: {
    action: "هبوط تلقائي · F",
    prompt: "اضغط F للهبوط",
    active: "جارٍ الهبوط",
    complete: "اكتمل الهبوط",
  },
  ja: {
    action: "自動着陸 · F",
    prompt: "着陸するにはFを押す",
    active: "自動着陸中",
    complete: "着陸完了",
  },
  ko: {
    action: "자동 착륙 · F",
    prompt: "착륙하려면 F를 누르세요",
    active: "자동 착륙 중",
    complete: "착륙 완료",
  },
  zh: {
    action: "自动着陆 · F",
    prompt: "按 F 着陆",
    active: "正在自动着陆",
    complete: "着陆完成",
  },
  sv: {
    action: "AUTOLANDNING · F",
    prompt: "Tryck F för att landa",
    active: "AUTOLANDNING PÅGÅR",
    complete: "LANDNING KLAR",
  },
};

export function autoLandLabels(language: string): Labels {
  return labels[language.toLowerCase().split("-")[0]] ?? labels.en;
}
