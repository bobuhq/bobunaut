import { useContext } from "react";
import {
  LanguageContext,
  type LanguageContextValue,
} from "./LanguageProvider";

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider",
    );
  }

  return context;
}
