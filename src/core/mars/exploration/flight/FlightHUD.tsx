import type {flightTelemetry} from './flight-telemetry.mjs';
type Telemetry=ReturnType<typeof flightTelemetry>;
export function FlightHUD({telemetry:t,onAudio}:{telemetry:Telemetry|null;onAudio:()=>void}){
 return <div className="flight-hud" data-testid="flight-telemetry">
  <section className="flight-altitude flight-panel" data-near-ground={t?.nearGround} aria-label="Landing clearance">
   <span className="flight-eyebrow">GROUND DISTANCE</span>
   <strong className="flight-distance">{t?.distance??'—'} <small>m</small></strong>
   <span className="flight-datum flight-diagnostic">Deployed gear datum · local terrain</span>
   <span className="flight-diagnostic">BODY CENTER {t?.bodyAltitude??'—'} m</span><span className="flight-diagnostic">HULL CLEARANCE {t?.bodyClearance??'—'} m</span><span className="flight-diagnostic">LOCAL AGL {t?.localAGL??'—'} m</span><span className="flight-diagnostic">PAD CLEARANCE {t?.actualPadClearance??'—'} m</span><span>{t?.timing}</span>
   <b className="flight-status" role="status">{t?.status??'Loading flight terrain…'}</b>
  </section>
  <section className="flight-systems flight-panel" aria-label="Flight systems">
   <b>ARES EXPLORER V6</b>
   <dl>{[['HORIZONTAL',`${t?.horizontal??'—'} m/s`],['VERTICAL',`${t?.vertical??'—'} m/s`],['HEADING',`${t?.heading??'—'}°`],['GEAR',t?.gear??'—'],['AUTOPILOT',t?.autopilot??'—'],['MANUAL TIME',`${t?.remaining??'—'} s`],['AUTO LANDING',`${t?.autoRemaining??'—'} s`],['PHASE',t?.phase??'—']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   <details><summary>CONTROLS</summary><p>Click: mouse steering · ESC release · ALT look · C camera · W/S forward · A/D strafe · Q/E rotate · SPACE ascend · SHIFT descend · G vertical landing · F safe-site touchdown</p><a href={location.pathname}>RETURN TO WALKING</a><button onClick={onAudio}>MUTE / UNMUTE</button></details>
  </section>
 </div>;
}
