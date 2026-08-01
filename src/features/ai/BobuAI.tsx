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
      setErrorMessage(
        language === "tr"
          ? "BOBU AI kullanmak için giriş yapmalısın."
          : "Please sign in to use BOBU AI.",
      );
      return;
    }

    if (question.length > 1200) {
      setErrorMessage(
        language === "tr"
          ? "Mesaj en fazla 1.200 karakter olabilir."
          : "Messages are limited to 1,200 characters.",
      );
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
                  Builder Intelligence
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="bobu-ai-close"
              aria-label="Close BOBU AI"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className="bobu-ai-status">
            <i />
            <span>UNIVERSE GUIDE ONLINE</span>
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
                    ? "BUILDER"
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
                  <p>Analyzing the Universe...</p>
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
              placeholder={
                language === "tr"
                  ? "BOBU AI'ya bir şey sor..."
                  : "Ask BOBU AI..."
              }
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
              aria-label="Send message"
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
          open ? "Close BOBU AI" : "Open BOBU AI"
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
