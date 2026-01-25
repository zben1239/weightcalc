import { Suspense } from "react";
import SuccessClient from "./success-client";

export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Activation en cours…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
