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
import {
  BobuAIServiceError,
  bobuAIService,
} from "./BobuAIService";
import type {
  BobuAIMessage,
  BobuAIRequestMessage,
} from "./types";
import "./BobuAI.css";

const createClientId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
};

const createMessage = (
  role: BobuAIMessage["role"],
  content: string,
): BobuAIMessage => ({
  id: createClientId(),
  role,
  content,
  createdAt: new Date().toISOString(),
});

export function BobuAI() {
  const { session } = useAuthSession();
  const { language, direction, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const initialMessage = useMemo(
    () =>
      createMessage(
        "assistant",
        t("ai.welcome"),
      ),
    [language, t],
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
    const openFromNavigation = () => {
      setOpen(true);
    };

    window.addEventListener(
      "bobu-ai:open",
      openFromNavigation,
    );

    return () => {
      window.removeEventListener(
        "bobu-ai:open",
        openFromNavigation,
      );
    };
  }, []);

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
      setErrorMessage(t("ai.signInRequired"));
      return;
    }

    if (question.length > 1200) {
      setErrorMessage(t("ai.messageTooLong"));
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
        if (error instanceof BobuAIServiceError) {
          const errorKeys = {
            session_failed: "ai.sessionFailed",
            sign_in_required: "ai.signInRequired",
            request_failed: "ai.requestFailed",
            response_unavailable:
              "ai.responseUnavailable",
          } as const;

          setErrorMessage(t(errorKeys[error.code]));
        } else {
          console.error(
            "Unexpected BOBU AI error:",
            error,
          );

          setErrorMessage(t("ai.requestFailed"));
        }
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
          aria-label={t("ai.aria")}
        >
          <header className="bobu-ai-header">
            <div className="bobu-ai-identity">
              <div className="bobu-ai-avatar">
                <Bot size={21} />
              </div>

              <div>
                <span>{t("ai.name")}</span>
                <strong>
                  {t("ai.subtitle")}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="bobu-ai-close"
              aria-label={t("ai.closeLabel")}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className="bobu-ai-status">
            <i />
            <span>{t("ai.online")}</span>
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
                    ? t("ai.builderLabel")
                    : t("ai.name")}
                </span>

                <p>{message.content}</p>
              </article>
            ))}

            {busy && (
              <article className="bobu-ai-message is-assistant">
                <span>{t("ai.name")}</span>

                <div className="bobu-ai-typing">
                  <LoaderCircle
                    size={16}
                    className="bobu-ai-spinner"
                  />
                  <p>{t("ai.analyzing")}</p>
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
              placeholder={t("ai.placeholder")}
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
              aria-label={t("ai.sendLabel")}
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
          open ? t("ai.closeLabel") : t("ai.openLabel")
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
