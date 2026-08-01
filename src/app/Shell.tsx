import { Outlet } from "react-router-dom";
import { Nav } from "../shared/Nav";
import { Stars } from "../shared/Stars";
import { BobuAI } from "../features/ai/BobuAI";

export function Shell() {
  return (
    <div className="app">
      <Stars />
      <Nav />

      <main>
        <Outlet />
      </main>

      <BobuAI />
    </div>
  );
}