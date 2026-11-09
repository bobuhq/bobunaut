import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { useAresArrivalRoute, useAresArrivalSurface, useAresSoundControl } from "../../src/core/mars/exploration/audio/useAresArrivalSound";
import { synthesizeAresArrival } from "../../src/core/mars/exploration/audio/AresArrivalSynth";
import { marsAudio } from "../../src/core/mars/exploration/audio/MarsAudioEngine";
import { aresArrivalSound } from "../../src/core/mars/exploration/audio/AresArrivalSound";
import { AresSoundscape } from "../../src/core/mars/exploration/audio/AresSoundscape";

// Expose only in the test fixture for OfflineAudioContext waveform inspection.
Object.assign(window, { synthesizeAresArrival, AresSoundscape });
function Surface() {
  useAresArrivalSurface();
  return <div id="surface">Ares surface mounted</div>;
}
function Fixture() {
  const location = useLocation();
  useAresArrivalRoute(location.pathname);
  const navigate = useNavigate();
  useEffect(() => () => { void marsAudio.stop(); }, [location.pathname]);
  const [key, setKey] = useState(0);
  const [, rerender] = useState(0);
  const { soundEnabled, toggleSound } = useAresSoundControl();
  return <>
    <button id="enter" onClick={() => navigate("/mars/explore")}>Enter Ares</button>
    <a id="leave" href="/mars" onClick={event => { event.preventDefault(); navigate("/mars"); }}>Return to orbit</a>
    <button id="back" onClick={() => navigate(-1)}>Back</button>
    <button id="remount" onClick={() => setKey(value => value + 1)}>Remount surface</button>
    <button id="render" onClick={() => rerender(value => value + 1)}>Update terminal</button>
    <button id="sound" data-ares-sound-control aria-pressed={soundEnabled} onClick={toggleSound}>{soundEnabled ? "Sound on" : "Sound off"}</button>
    <button id="gesture">Touch surface / keyboard movement</button>
    <button id="hub" onClick={() => aresArrivalSound.setInterior(true)}>Enter hub</button>
    <button id="outside" onClick={() => aresArrivalSound.setInterior(false)}>Exterior</button>
    <button id="crystal" onClick={() => aresArrivalSound.setCrystalDistance(1.5)}>Near reactor</button>
    <button id="far" onClick={() => aresArrivalSound.setCrystalDistance(12)}>Far reactor</button>
    <button id="mission" onClick={() => aresArrivalSound.terminal("mission")}>Mission accepted interaction</button>
    <button id="research" onClick={() => aresArrivalSound.terminal("research")}>Research accepted interaction</button>
    <button id="step" onClick={() => { void marsAudio.unlock().then(() => marsAudio.step()); }}>Move</button>
    {location.pathname === "/mars/explore" && <Surface key={key} />}
  </>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><MemoryRouter initialEntries={["/mars/explore"]}><Fixture /></MemoryRouter></StrictMode>);
