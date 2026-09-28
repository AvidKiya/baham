import { Suspense } from "react";
import ShareView from "./ShareView";

export const metadata = { title: "اشتراک باهم 💑", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>یه لحظه… 💑</div>}>
      <ShareView />
    </Suspense>
  );
}
