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
  landscape?: boolean;
}

export function AresColonyVoicePanel({
  accessToken,
  builderId,
  backend,
  landscape = false,
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

  const connected = status === "connected";
  const connecting = status === "connecting";

  const iconStyle: React.CSSProperties = {
    width: landscape ? 24 : 34,
    height: landscape ? 24 : 34,
    minWidth: landscape ? 24 : 34,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "rgba(5,7,18,.88)",
    border: "1px solid rgba(255,255,255,.25)",
    color: "#e3faff",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    boxSizing: "border-box",
    pointerEvents: "auto",
  };

  const voiceColor = connecting
    ? "#ffc857"
    : connected
      ? "#42ff89"
      : "#ff505d";

  return (
    <aside
      aria-label="ARES Voice"
      style={{
        position: "fixed",
        top: landscape ? "35px" : "58px",
        right: landscape ? "178px" : "150px",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: landscape ? 4 : 5,
        pointerEvents: "none",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        aria-label={connected ? "Disconnect ARES Voice" : "Connect ARES Voice"}
        aria-pressed={connected}
        title={errorMessage || (connected ? "Voice connected" : "Voice off")}
        disabled={!accessToken || !builderId || connecting}
        onClick={() => {
          setOpen(false);
          void (connected ? leaveVoice() : joinVoice());
        }}
        style={{
          ...iconStyle,
          color: voiceColor,
          borderColor: voiceColor,
          boxShadow: `0 0 8px ${voiceColor}55`,
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
          <path d="M10 21h4"/>
          {!connected && !connecting && <path d="M3 3l18 18"/>}
        </svg>
      </button>

      {connected && (
        <>
          <button
            type="button"
            aria-label={microphone ? "Mute microphone" : "Enable microphone"}
            aria-pressed={microphone}
            title={microphone ? "Microphone on" : "Microphone off"}
            onClick={() => void toggleMicrophone()}
            style={{
              ...iconStyle,
              color: microphone ? "#42ff89" : "#ff505d",
              borderColor: microphone ? "#42ff89" : "#ff505d",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6"/>
              {!microphone && <path d="M3 3l18 18"/>}
            </svg>
          </button>

          {audioBlocked && (
            <button
              type="button"
              aria-label="Enable voice playback"
              title="Enable voice playback"
              onClick={() => void enableAudioPlayback()}
              style={{ ...iconStyle, color: "#ffc857" }}
            >
              ♪
            </button>
          )}

          <button
            type="button"
            aria-label="Voice participants"
            aria-expanded={open}
            onClick={() => setOpen(value => !value)}
            style={{ ...iconStyle, fontSize: 12 }}
          >
            {members.length}
          </button>
        </>
      )}

      {connected && open && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 40,
            width: "min(164px, 45vw)",
            maxHeight: "24dvh",
            overflowY: "auto",
            background: "rgba(5,12,27,.96)",
            border: "1px solid #476779",
            borderRadius: 8,
            padding: 6,
            pointerEvents: "auto",
            color: "#e3faff",
            fontSize: 10,
          }}
        >
          ARES VOICE · {members.length}
          {members.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => toggleMemberMute(id)}
              aria-pressed={muted.includes(id)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: 5,
                background: "#142336",
                border: 0,
                borderRadius: 4,
                color: speakers.includes(id) && !muted.includes(id)
                  ? "#42ff89"
                  : "#e3faff",
              }}
            >
              {muted.includes(id) ? "🔇" : "♪"} {id.slice(0, 8)}
            </button>
          ))}
        </div>
      )}

      {errorMessage && (
        <span
          role="alert"
          style={{
            position: "absolute",
            right: 40,
            top: 0,
            width: 140,
            fontSize: 9,
            color: "#ffae98",
            background: "rgba(5,12,27,.9)",
            padding: 4,
            borderRadius: 4,
            overflowWrap: "anywhere",
            pointerEvents: "none",
          }}
        >
          {errorMessage}
        </span>
      )}
    </aside>
  );
}
