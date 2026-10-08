import type { Metadata } from "next";
import { PartyMode } from "@/components/party/PartyMode";

export const metadata: Metadata = {
  title: "Party Mode",
  description: "A local multiplayer tournament for 2–4 players on one keyboard. Random mini-games, live scoreboard, one champion.",
};

export default function PartyPage() {
  return <PartyMode />;
}
