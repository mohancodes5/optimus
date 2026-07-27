import { GateCheckIn } from "@/components/check-in/gate-check-in";
import { APP_NAME } from "@/lib/brand";

export const metadata = {
  title: `Check-In — ${APP_NAME}`,
  description: "Scan the gym QR and check in with your member code",
};

export default function GatePage() {
  return <GateCheckIn />;
}
