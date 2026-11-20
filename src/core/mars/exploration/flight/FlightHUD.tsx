import type {flightTelemetry} from './flight-telemetry.mjs';
import {flightUi} from './FlightUiLabels';
type Telemetry=ReturnType<typeof flightTelemetry>;
export function FlightHUD({telemetry:t,onAudio,language='en'}:{telemetry:Telemetry|null;onAudio:()=>void;language?:string}){
 const ui=(key: Parameters<typeof flightUi>[1])=>flightUi(language,key);
 return <div className="flight-hud" data-testid="flight-telemetry">
  <section className="flight-altitude flight-panel" data-near-ground={t?.nearGround} aria-label="Landing clearance">
   <span className="flight-eyebrow">{ui('groundDistance')}</span>
   <strong className="flight-distance">{t?.distance??'—'} <small>m</small></strong>
   <span className="flight-datum flight-diagnostic">Deployed gear datum · local terrain</span>
   <span className="flight-diagnostic">BODY CENTER {t?.bodyAltitude??'—'} m</span><span className="flight-diagnostic">HULL CLEARANCE {t?.bodyClearance??'—'} m</span><span className="flight-diagnostic">LOCAL AGL {t?.localAGL??'—'} m</span><span className="flight-diagnostic">PAD CLEARANCE {t?.actualPadClearance??'—'} m</span><span>{t?.timing}</span>
   <b className="flight-status" role="status">{t?.status??'Loading flight terrain…'}</b>
  </section>
  <section className="flight-systems flight-panel" aria-label="Flight systems">
   <b>ARES EXPLORER V6</b>
   <dl>{[[ui('horizontal'),`${t?.horizontal??'—'} m/s`],[ui('vertical'),`${t?.vertical??'—'} m/s`],[ui('heading'),`${t?.heading??'—'}°`],[ui('gear'),t?.gear??'—'],[ui('autopilot'),t?.autopilot??'—'],[ui('manualTime'),`${t?.remaining??'—'} s`],[ui('autoLanding'),`${t?.autoRemaining??'—'} s`],[ui('phase'),t?.phase??'—']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   <details><summary>{ui('controls')}</summary><p>Click: mouse steering · ESC release · ALT look · C camera · W/S forward · A/D strafe · Q/E rotate · SPACE ascend · SHIFT descend · G vertical landing · F safe-site touchdown</p><a href={location.pathname}>RETURN TO WALKING</a><button onClick={onAudio}>MUTE / UNMUTE</button></details>
  </section>
 </div>;
}
