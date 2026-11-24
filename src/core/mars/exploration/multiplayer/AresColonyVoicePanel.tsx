import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AresColonyVoiceEngine,
  type VoiceBackendClient,
} from "./AresColonyVoiceEngine";

type VoiceStatus =
  | "offline"
  | "connecting"
  | "connected"
  | "error";

interface Props {
  accessToken: string | null | undefined;
  builderId: string | null | undefined;
  backend?: VoiceBackendClient;
}

export function AresColonyVoicePanel({
  accessToken,
  builderId,
  backend,
}: Props) {
  const hasAccessToken = Boolean(accessToken);
  const engineRef = useRef<AresColonyVoiceEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AresColonyVoiceEngine(backend);
  }

  const engine = engineRef.current;

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("offline");
  const [microphone, setMicrophone] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [muted, setMuted] = useState<string[]>([]);

  const [speakers, setSpeakers] = useState<string[]>([]);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const actionRef = useRef(false);
  const lifecycleRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const connected = engine.isConnected;

      setSpeakers(
        connected ? engine.getSpeakingBuilderIds() : [],
      );

      setAudioBlocked(
        connected && engine.audioPlaybackBlocked,
      );

      if (connected) {
        setMicrophone(engine.microphoneEnabled);
      }

      setMembers(
        connected ? engine.getConnectedBuilderIds() : [],
      );

      if (!connected) {
        setMicrophone(false);
        setMuted([]);

        if (engine.connectionError) {
          setStatus((current) =>
            current === "connected" ? "error" : current
          );

          setErrorMessage(engine.connectionError);
        } else {
          setStatus((current) =>
            current === "connected" ? "offline" : current
          );
        }
      }
    }, 500);

    return () => {
      window.clearInterval(timer);
      lifecycleRef.current++;
      void engine.leave();
    };
  }, [engine]);

  useEffect(() => {
    lifecycleRef.current++;
    actionRef.current = false;
    setStatus('offline');
    setMicrophone(false);
    setMembers([]);
    setMuted([]);
    setErrorMessage('');
    void engine.leave();
  }, [builderId, hasAccessToken, engine]);

  useEffect(() => {
    const disconnectVoice = () => {
      lifecycleRef.current++;
      actionRef.current = false;

      void engine.leave();

      setStatus("offline");
      setMicrophone(false);
      setMembers([]);
      setMuted([]);
      setSpeakers([]);
      setAudioBlocked(false);
      setErrorMessage("");
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        disconnectVoice();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    window.addEventListener(
      "pagehide",
      disconnectVoice,
    );

    window.addEventListener(
      "bobu:ares-voice-suspend",
      disconnectVoice,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      window.removeEventListener(
        "pagehide",
        disconnectVoice,
      );

      window.removeEventListener(
        "bobu:ares-voice-suspend",
        disconnectVoice,
      );
    };
  }, [engine]);

  async function joinVoice(): Promise<void> {
    if (actionRef.current || !accessToken || !builderId) return;

    actionRef.current = true;
    const lifecycle = lifecycleRef.current;
    setStatus("connecting");
    setErrorMessage("");

    try {
      await engine.join(accessToken);

      if (lifecycle !== lifecycleRef.current) {
        return;
      }

      if (!engine.isConnected) {
        throw new Error("VOICE_CONNECTION_CANCELLED");
      }

      try {
        await engine.unlockAudio();
      } catch {
        // Browser may require another user interaction.
      }

      if (lifecycle !== lifecycleRef.current) return;

      if (!engine.isConnected) {
        throw new Error(
          engine.connectionError ??
          "VOICE_CONNECTION_CANCELLED"
        );
      }

      setMicrophone(false);
      setStatus("connected");
      setMembers(engine.getConnectedBuilderIds());
    } catch (error) {
      if (lifecycle !== lifecycleRef.current) return;
      await engine.leave();
      if (lifecycle !== lifecycleRef.current) return;
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "VOICE_CONNECTION_FAILED",
      );
    } finally {
      if (lifecycle === lifecycleRef.current) {
        actionRef.current = false;
      }
    }
  }

  async function leaveVoice(): Promise<void> {
    lifecycleRef.current++;
    actionRef.current = false;
    const lifecycle = lifecycleRef.current;

    await engine.leave();

    if (lifecycle !== lifecycleRef.current) return;

    setMicrophone(false);
    setMembers([]);
    setMuted([]);
    setStatus("offline");
    setErrorMessage("");
  }

  async function toggleMicrophone(): Promise<void> {
    if (!engine.isConnected || actionRef.current) return;

    const lifecycle = lifecycleRef.current;

    actionRef.current = true;

    try {
      const next = !engine.microphoneEnabled;

      await engine.setMicrophoneEnabled(next);

      if (lifecycle !== lifecycleRef.current) return;

      setMicrophone(engine.microphoneEnabled);
      setErrorMessage("");

    } catch {
      if (lifecycle !== lifecycleRef.current) return;

      setMicrophone(engine.microphoneEnabled);

      setErrorMessage(
        engine.isConnected
          ? "MICROPHONE_PERMISSION_REQUIRED"
          : "VOICE_CONNECTION_CANCELLED",
      );

    } finally {
      if (lifecycle === lifecycleRef.current) {
        actionRef.current = false;
      }
    }
  }

  async function enableAudioPlayback(): Promise<void> {
    if (!engine.isConnected) return;

    const lifecycle = lifecycleRef.current;

    try {
      await engine.unlockAudio();

      if (lifecycle !== lifecycleRef.current) return;

      setAudioBlocked(engine.audioPlaybackBlocked);

    } catch {
      if (lifecycle !== lifecycleRef.current) return;

      setAudioBlocked(true);
    }
  }

  function toggleMemberMute(builderId: string): void {
    const nextMuted = !muted.includes(builderId);

    engine.setBuilderMuted(builderId, nextMuted);

    setMuted((previous) =>
      nextMuted
        ? [...previous, builderId]
        : previous.filter((id) => id !== builderId),
    );
  }

  const buttonStyle: React.CSSProperties = {
    background: "rgba(16,30,48,.95)",
    color: "#d8f8ff",
    border: "1px solid rgba(83,218,255,.5)",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  };

  return (
    <aside
      aria-label="Colony Voice"
      style={{
        position: "fixed",
        top: 42,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        width: open ? 240 : "auto",
        maxWidth: "calc(100vw - 24px)",
        background: "rgba(5,12,27,.94)",
        border: "1px solid rgba(83,218,255,.4)",
        borderRadius: 12,
        padding: 8,
        color: "#e3faff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        style={buttonStyle}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {microphone ? "🎙" : "🔇"} COLONY VOICE
      </button>

      {open && (
        <div style={{ display: "grid", gap: 9, marginTop: 9 }}>
          <div style={{ fontSize: 11 }}>
            Status: {status}
          </div>

          {status !== "connected" ? (
            <button
              type="button"
              style={buttonStyle}
              disabled={!accessToken || !builderId || status === "connecting"}
              onClick={() => void joinVoice()}
            >
              {status === "connecting"
                ? "Connecting..."
                : "JOIN COLONY VOICE"}
            </button>
          ) : (
            <>
              {audioBlocked && (
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    borderColor: "#ffbf55",
                    color: "#ffdb90",
                  }}
                  onClick={() => void enableAudioPlayback()}
                >
                  ENABLE VOICE AUDIO
                </button>
              )}

              <button
                type="button"
                style={buttonStyle}
                onClick={() => void toggleMicrophone()}
                aria-pressed={microphone}
              >
                {microphone ? "MUTE MICROPHONE" : "ENABLE MICROPHONE"}
              </button>

              <div style={{ fontSize: 11 }}>
                Other members: {members.length}
              </div>

              {members.map((id) => (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 10,
                  }}
                >
                  <span
                    title={id}
                    style={{
                      color: muted.includes(id)
                        ? "#82909c"
                        : speakers.includes(id)
                          ? "#65ff9a"
                          : "#e3faff",
                      textShadow: speakers.includes(id)
                        ? "0 0 8px #45ff88"
                        : "none",
                    }}
                  >
                    {muted.includes(id)
                      ? "🔇 "
                      : speakers.includes(id)
                        ? "🟢 "
                        : "○ "}
                    {id.slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => toggleMemberMute(id)}
                  >
                    {muted.includes(id) ? "UNMUTE" : "MUTE"}
                  </button>
                </div>
              ))}

              <button
                type="button"
                style={buttonStyle}
                onClick={() => void leaveVoice()}
              >
                LEAVE VOICE
              </button>
            </>
          )}

          {errorMessage && (
            <div role="alert" style={{ color: "#ffae98", fontSize: 10 }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
