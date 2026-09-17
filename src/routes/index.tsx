import { createFileRoute } from "@tanstack/react-router";
import { Simulator } from "@/components/sim/simulator";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Simulator />;
}
