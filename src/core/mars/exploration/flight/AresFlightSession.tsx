import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Html } from "@react-three/drei";
import { CinematicLanding } from "./CinematicLanding";
import { readAresColonyOccupancy } from "../genesis-v5/AresColonyOccupancyAdapter";
import { loadAresGenesisTerrainData, sampleAresGenesisRenderedSurfaceMeters } from "../engine/AresGenesisTerrainData";
import { validHandoff, type FlightHandoff } from "./handoff.mjs";
import "./flight.css";

type Snapshot = Awaited<ReturnType<typeof readAresColonyOccupancy>>;
const noCampusObstacles:any[]=[];
export function AresFlightSession({ onEntry,campusObstacles=noCampusObstacles }: {onEntry:(handoff:FlightHandoff)=>void;campusObstacles?:any[]}) {
  const [data,setData] = useState<{occupancy:Snapshot;terrain:Awaited<ReturnType<typeof loadAresGenesisTerrainData>>;obstacles:any[]}|null>(null);
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [error,setError] = useState<string|null>(null);
  useEffect(() => {
    let active=true;
    Promise.all([readAresColonyOccupancy(),loadAresGenesisTerrainData()]).then(([occupancy,terrain]) => {
      if (!active) return;
      if (!occupancy.colonyId || !occupancy.legalBuildingRegion) { setError("Colony collision data unavailable. Return to Mars and retry."); return; }
      // These reads are collision exclusions, never campus placement authorization.
      const obstacles=[...occupancy.buildings,...occupancy.fixed,{...occupancy.legalBuildingRegion,groundOnly:true}];
      setData({occupancy,terrain,obstacles});
    }).catch(() => {if(active)setError("Ares terrain unavailable. Return to Mars and retry.");});
    return () => {active=false;};
  },[]);
  const flightObstacles=useMemo(()=>data?[...data.obstacles,...campusObstacles]:campusObstacles,[data,campusObstacles]);
  const accept=useCallback((spawn:[number,number,number],landing:{ship:[number,number,number];yaw:number}) => {
    if (!data) return;
    const handoff={spawn:[...spawn],ship:[...landing.ship],yaw:landing.yaw};
    // Re-read authenticated occupancy at exit; a local read is never a reservation.
    void readAresColonyOccupancy().then(current => {
      if (!alive.current) return;
      if (!current.colonyId || current.colonyId!==data.occupancy.colonyId || !current.legalBuildingRegion ||
          !validHandoff(handoff,[...current.buildings,...current.fixed,current.legalBuildingRegion,...campusObstacles],
            (x,z)=>sampleAresGenesisRenderedSurfaceMeters(data.terrain,x,z))) {
        setError("Disembark position is obstructed or occupancy unavailable. Return to Mars and retry."); return;
      }
      onEntry(handoff);
    }).catch(()=>{if(alive.current)setError("Cannot validate disembark position. Return to Mars and retry.");});
  },[data,onEntry,campusObstacles]);
  if (error || !data) return <Html center><div role="status" style={{background:"#07151b",color:"white",padding:20,width:300}}>{error ?? "Loading Ares flight and collision data…"}</div></Html>;
  return <CinematicLanding flight obstacles={flightObstacles} onAresEntry={accept}/>;
}
