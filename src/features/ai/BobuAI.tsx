import {
  Bot,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuthSession } from "../../core/auth/useAuthSession";
import { useLanguage } from "../../core/language";
import { bobuAIService } from "./BobuAIService";
import type {
  BobuAIMessage,
  BobuAIRequestMessage,
} from "./types";
import "./BobuAI.css";

const createMessage = (
  role: BobuAIMessage["role"],
  content: string,
): BobuAIMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
});

interface BobuAILabels {
  subtitle: string;
  online: string;
  analyzing: string;
  placeholder: string;
  signInRequired: string;
  messageTooLong: string;
  builderLabel: string;
  closeLabel: string;
  openLabel: string;
  sendLabel: string;
}

const aiLabels: Record<string, BobuAILabels> = {
  en: {
    subtitle: "Builder Intelligence",
    online: "BUILDER INTELLIGENCE ONLINE",
    analyzing: "Analyzing your Builder journey...",
    placeholder: "Ask BOBU AI...",
    signInRequired: "Please sign in to use BOBU AI.",
    messageTooLong: "Messages are limited to 1,200 characters.",
    builderLabel: "BUILDER",
    closeLabel: "Close BOBU AI",
    openLabel: "Open BOBU AI",
    sendLabel: "Send message",
  },
  tr: {
    subtitle: "Builder Intelligence",
    online: "BUILDER INTELLIGENCE AKTİF",
    analyzing: "Builder yolculuğun analiz ediliyor...",
    placeholder: "BOBU AI'ya bir şey sor...",
    signInRequired: "BOBU AI kullanmak için giriş yapmalısın.",
    messageTooLong: "Mesaj en fazla 1.200 karakter olabilir.",
    builderLabel: "BUILDER",
    closeLabel: "BOBU AI'yı kapat",
    openLabel: "BOBU AI'yı aç",
    sendLabel: "Mesaj gönder",
  },
  de: {
    subtitle: "Builder Intelligence",
    online: "BUILDER INTELLIGENCE ONLINE",
    analyzing: "Deine Builder-Reise wird analysiert...",
    placeholder: "Frage BOBU AI...",
    signInRequired: "Bitte melde dich an, um BOBU AI zu verwenden.",
    messageTooLong: "Nachrichten sind auf 1.200 Zeichen begrenzt.",
    builderLabel: "BUILDER",
    closeLabel: "BOBU AI schließen",
    openLabel: "BOBU AI öffnen",
    sendLabel: "Nachricht senden",
  },
  fr: {
    subtitle: "Builder Intelligence",
    online: "BUILDER INTELLIGENCE EN LIGNE",
    analyzing: "Analyse de votre parcours Builder...",
    placeholder: "Demandez à BOBU AI...",
    signInRequired: "Connectez-vous pour utiliser BOBU AI.",
    messageTooLong: "Les messages sont limités à 1 200 caractères.",
    builderLabel: "BUILDER",
    closeLabel: "Fermer BOBU AI",
    openLabel: "Ouvrir BOBU AI",
    sendLabel: "Envoyer le message",
  },
  es: {
    subtitle: "Builder Intelligence",
    online: "BUILDER INTELLIGENCE EN LÍNEA",
    analyzing: "Analizando tu recorrido Builder...",
    placeholder: "Pregunta a BOBU AI...",
    signInRequired: "Inicia sesión para usar BOBU AI.",
    messageTooLong: "Los mensajes están limitados a 1.200 caracteres.",
    builderLabel: "BUILDER",
    closeLabel: "Cerrar BOBU AI",
    openLabel: "Abrir BOBU AI",
    sendLabel: "Enviar mensaje",
  },
  ar: {
    subtitle: "ذكاء Builder",
    online: "ذكاء BUILDER متصل",
    analyzing: "جارٍ تحليل رحلة Builder الخاصة بك...",
    placeholder: "اسأل BOBU AI...",
    signInRequired: "يرجى تسجيل الدخول لاستخدام BOBU AI.",
    messageTooLong: "الحد الأقصى للرسالة هو 1200 حرف.",
    builderLabel: "BUILDER",
    closeLabel: "إغلاق BOBU AI",
    openLabel: "فتح BOBU AI",
    sendLabel: "إرسال الرسالة",
  },
  zh: {
    subtitle: "Builder Intelligence",
    online: "BUILDER INTELLIGENCE 在线",
    analyzing: "正在分析你的 Builder 旅程...",
    placeholder: "询问 BOBU AI...",
    signInRequired: "请先登录以使用 BOBU AI。",
    messageTooLong: "消息最多为 1,200 个字符。",
    builderLabel: "BUILDER",
    closeLabel: "关闭 BOBU AI",
    openLabel: "打开 BOBU AI",
    sendLabel: "发送消息",
  },
  ja: {
    subtitle: "Builder Intelligence",
    online: "BUILDER INTELLIGENCE オンライン",
    analyzing: "Builder ジャーニーを分析しています...",
    placeholder: "BOBU AI に質問...",
    signInRequired: "BOBU AIを利用するにはログインしてください。",
    messageTooLong: "メッセージは1,200文字までです。",
    builderLabel: "BUILDER",
    closeLabel: "BOBU AIを閉じる",
    openLabel: "BOBU AIを開く",
    sendLabel: "メッセージを送信",
  },
};

const welcomeMessages: Record<string, string> = {
  tr: "Merhaba Builder. BOBU Universe, Mining, GP, Wallet, Passport, Missions ve Galaxy hakkında sana rehberlik edebilirim.",
  en: "Welcome Builder. I can guide you through BOBU Universe, Mining, GP, Wallet, Passport, Missions and Galaxy.",
  de: "Willkommen Builder. Ich kann dich durch BOBU Universe, Mining, GP, Wallet, Passport, Missions und Galaxy führen.",
  fr: "Bienvenue Builder. Je peux vous guider dans BOBU Universe, Mining, GP, Wallet, Passport, Missions et Galaxy.",
  es: "Bienvenido Builder. Puedo guiarte por BOBU Universe, Mining, GP, Wallet, Passport, Missions y Galaxy.",
  ar: "مرحبًا أيها الـ Builder. يمكنني إرشادك في BOBU Universe والتعدين وGP والمحفظة والجواز والمهام والمجرة.",
  zh: "欢迎 Builder。我可以帮助你了解 BOBU Universe、Mining、GP、Wallet、Passport、Missions 和 Galaxy。",
  ja: "ようこそ Builder。BOBU Universe、Mining、GP、Wallet、Passport、Missions、Galaxyをご案内します。",
};

export function BobuAI() {
  const { session } = useAuthSession();
  const { language, direction } = useLanguage();

  const labels =
    aiLabels[language] ??
    aiLabels.en;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const initialMessage = useMemo(
    () =>
      createMessage(
        "assistant",
        welcomeMessages[language] ??
          welcomeMessages.en,
      ),
    [language],
  );

  const [messages, setMessages] =
    useState<BobuAIMessage[]>([initialMessage]);

  const scrollAnchorRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, busy]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length > 1) {
        return current;
      }

      return [initialMessage];
    });
  }, [initialMessage]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const question = input.trim();

    if (!question || busy) {
      return;
    }

    if (!session) {
      setErrorMessage(labels.signInRequired);
      return;
    }

    if (question.length > 1200) {
      setErrorMessage(labels.messageTooLong);
      return;
    }

    const userMessage = createMessage(
      "user",
      question,
    );

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    setErrorMessage(null);

    try {
      const requestMessages: BobuAIRequestMessage[] =
        nextMessages
          .filter(
            (message) =>
              message !== initialMessage,
          )
          .map((message) => ({
            role: message.role,
            content: message.content,
          }));

      const answer = await bobuAIService.ask({
        messages: requestMessages,
        language,
        pathname: window.location.pathname,
      });

      setMessages((current) => [
        ...current,
        createMessage("assistant", answer),
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "BOBU AI request failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="bobu-ai"
      dir={direction}
    >
      {open && (
        <aside
          className="bobu-ai-panel"
          aria-label="BOBU AI"
        >
          <header className="bobu-ai-header">
            <div className="bobu-ai-identity">
              <div className="bobu-ai-avatar">
                <Bot size={21} />
              </div>

              <div>
                <span>BOBU AI</span>
                <strong>
                  {labels.subtitle}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="bobu-ai-close"
              aria-label={labels.closeLabel}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className="bobu-ai-status">
            <i />
            <span>{labels.online}</span>
          </div>

          <div className="bobu-ai-messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "user"
                    ? "bobu-ai-message is-user"
                    : "bobu-ai-message is-assistant"
                }
              >
                <span>
                  {message.role === "user"
                    ? labels.builderLabel
                    : "BOBU AI"}
                </span>

                <p>{message.content}</p>
              </article>
            ))}

            {busy && (
              <article className="bobu-ai-message is-assistant">
                <span>BOBU AI</span>

                <div className="bobu-ai-typing">
                  <LoaderCircle
                    size={16}
                    className="bobu-ai-spinner"
                  />
                  <p>{labels.analyzing}</p>
                </div>
              </article>
            )}

            <div ref={scrollAnchorRef} />
          </div>

          {errorMessage && (
            <div className="bobu-ai-error">
              {errorMessage}
            </div>
          )}

          <form
            className="bobu-ai-composer"
            onSubmit={handleSubmit}
          >
            <textarea
              value={input}
              maxLength={1200}
              rows={1}
              disabled={busy}
              placeholder={labels.placeholder}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  event.currentTarget.form
                    ?.requestSubmit();
                }
              }}
            />

            <button
              type="submit"
              disabled={
                busy || input.trim().length === 0
              }
              aria-label={labels.sendLabel}
            >
              <Send size={17} />
            </button>
          </form>
        </aside>
      )}

      <button
        type="button"
        className="bobu-ai-trigger"
        aria-label={
          open ? labels.closeLabel : labels.openLabel
        }
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <X size={21} />
        ) : (
          <>
            <MessageCircle size={21} />
            <Sparkles
              size={13}
              className="bobu-ai-spark"
            />
          </>
        )}
      </button>
    </div>
  );
}
