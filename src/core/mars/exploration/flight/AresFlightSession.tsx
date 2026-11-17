import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Html } from "@react-three/drei";
import { CinematicLanding } from "./CinematicLanding";
import { readAresColonyOccupancy, reviewAresGenesisWorldSiteV13 } from "../genesis-v5/AresColonyOccupancyAdapter";
import { loadAresGenesisTerrainData, sampleAresGenesisRenderedSurfaceMeters } from "../engine/AresGenesisTerrainData";
import { validHandoff, type FlightHandoff } from "./handoff.mjs";
import { VEHICLE_RADIUS } from "../genesis-v5/flight-v2.mjs";
import { areasOverlap } from "../genesis-v5/colony-occupancy.mjs";
import "./flight.css";


const requireV13Areas = (value: unknown): any[] => {
  if (!Array.isArray(value)) {
    throw new Error("Invalid V13 protection geometry");
  }
  return value;
};

type Snapshot = Awaited<ReturnType<typeof readAresColonyOccupancy>>;
const noCampusObstacles:any[]=[];
export function AresFlightSession({ onEntry,campusObstacles=noCampusObstacles }: {onEntry:(handoff:FlightHandoff)=>void;campusObstacles?:any[]}) {
  const [data,setData] = useState<{
    occupancy:Snapshot;
    terrain:Awaited<ReturnType<typeof loadAresGenesisTerrainData>>;
    obstacles:any[];
    worldSiteId:string|null;
  }|null>(null);
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [error,setError] = useState<string|null>(null);
  useEffect(() => {
    let active=true;
    Promise.all([
      readAresColonyOccupancy(),
      loadAresGenesisTerrainData(),
      reviewAresGenesisWorldSiteV13()
    ]).then(([occupancy,terrain,worldSite]) => {
      if (!active) return;
      if (!occupancy.colonyId || !occupancy.legalBuildingRegion) { setError("Colony collision data unavailable. Return to Mars and retry."); return; }
      // These reads are collision exclusions, never campus placement authorization.
      if (worldSite.status === "blocked") {
        setError("V13 world authorization unavailable. Return to Mars and retry.");
        return;
      }
      let protectedGround:any[] = [];
      let worldSiteId:string|null = null;
      if (worldSite.status === "registered") {
        const site = worldSite.site;
        if (
          !Array.isArray(site.reservations) ||
          site.reservations.length !== 24 ||
          !Array.isArray(site.protectedRoutes) ||
          site.protectedRoutes.length !== 15 ||
          !Array.isArray(site.occupied) ||
          !Array.isArray(site.legalRegions)
        ) {
          setError("Incomplete V13 flight exclusion geometry.");
          return;
        }
        worldSiteId = worldSite.siteId;
        protectedGround = [
          ...site.reservations,
          ...site.protectedRoutes,
          ...site.occupied,
          ...site.legalRegions
        ].map((area:any) => ({...area,groundOnly:true}));
      }
      const obstacles=[
        ...occupancy.buildings,
        ...occupancy.fixed,
        {...occupancy.legalBuildingRegion,groundOnly:true},
        ...protectedGround
      ];
      setData({occupancy,terrain,obstacles,worldSiteId});
    }).catch(() => {if(active)setError("Ares terrain unavailable. Return to Mars and retry.");});
    return () => {active=false;};
  },[]);
  const flightObstacles=useMemo(()=>data?[...data.obstacles,...campusObstacles]:campusObstacles,[data,campusObstacles]);
  const accept=useCallback((spawn:[number,number,number],landing:{ship:[number,number,number];yaw:number}) => {
    if (!data) return;
    const handoff={spawn:[...spawn],ship:[...landing.ship],yaw:landing.yaw};
    // Re-read authenticated occupancy at exit; a local read is never a reservation.
    void Promise.all([
      readAresColonyOccupancy(),
      reviewAresGenesisWorldSiteV13()
    ]).then(([current,currentWorldSite]) => {
      if (!alive.current) return;
      const currentSiteId =
        currentWorldSite.status === "registered"
          ? currentWorldSite.siteId
          : null;
      if (
        currentWorldSite.status === "blocked" ||
        currentSiteId !== data.worldSiteId
      ) {
        setError("V13 world authorization changed during flight. Return to Mars and retry.");
        return;
      }
      // Revalidate the parked craft against CURRENT physical geometry
      // and the authenticated V13 ground exclusion policy.
      // Pedestrian corridors are landing exclusions, not walking walls.
      const v13LandingExclusions = currentWorldSite.status === "registered"
        ? [
            ...requireV13Areas(currentWorldSite.site.reservations),
            ...requireV13Areas(currentWorldSite.site.protectedRoutes),
            ...requireV13Areas(currentWorldSite.site.occupied),
            ...requireV13Areas(currentWorldSite.site.legalRegions)
          ]
        : [];

      const v13ActorExclusions = currentWorldSite.status === "registered"
        ? requireV13Areas(currentWorldSite.site.reservations)
        : [];

      const craftFootprint = {
        id: "v13-current-landing-footprint",
        kind: "circle" as const,
        x: handoff.ship[0],
        z: handoff.ship[2],
        radius: VEHICLE_RADIUS + 3
      };

      const allLandingExclusions = [
        ...current.buildings,
        ...current.fixed,
        ...(current.legalBuildingRegion
          ? [current.legalBuildingRegion]
          : []),
        ...v13LandingExclusions,
        ...campusObstacles
      ];

      if (allLandingExclusions.some(area =>
        areasOverlap(craftFootprint, area)
      )) {
        setError("Landing area changed or intersects protected ground. Return to Mars and retry.");
        return;
      }

      if (!current.colonyId || current.colonyId!==data.occupancy.colonyId || !current.legalBuildingRegion ||
          !validHandoff(handoff,[
            ...current.buildings,
            ...current.fixed,
            current.legalBuildingRegion,
            ...v13ActorExclusions,
            ...campusObstacles
          ],(x,z)=>sampleAresGenesisRenderedSurfaceMeters(data.terrain,x,z))) {
        setError("Disembark position is obstructed or occupancy unavailable. Return to Mars and retry."); return;
      }
      onEntry(handoff);
    }).catch(()=>{if(alive.current)setError("Cannot validate disembark position. Return to Mars and retry.");});
  },[data,onEntry,campusObstacles]);
  if (error || !data) return <Html center><div role="status" style={{background:"#07151b",color:"white",padding:20,width:300}}>{error ?? "Loading Ares flight and collision data…"}</div></Html>;
  return <CinematicLanding flight obstacles={flightObstacles} onAresEntry={accept}/>;
}
