// app/lib/premiumEmail.ts
export function premiumEmailHtml(params: { appName?: string; accessUrl: string }) {
  const appName = params.appName ?? "WeightCalc";
  const accessUrl = params.accessUrl;

  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0b1220; padding:32px;">
    <div style="max-width:640px; margin:0 auto; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:24px; color:#e7eefc;">
      <div style="font-size:20px; font-weight:800; letter-spacing:-0.02em;">${appName} — Premium activé ✅</div>
      <div style="margin-top:10px; opacity:.9; line-height:1.5;">
        Ton accès Premium est prêt. Clique sur le bouton ci-dessous pour activer Premium sur ton navigateur.
      </div>

      <div style="margin-top:18px;">
        <a href="${accessUrl}"
          style="display:inline-block; background:#22c55e; color:#06110a; text-decoration:none; font-weight:800; padding:12px 16px; border-radius:12px;">
          Activer Premium
        </a>
      </div>

      <div style="margin-top:16px; font-size:12px; opacity:.7; line-height:1.5;">
        Si le bouton ne marche pas, copie/colle ce lien dans ton navigateur :<br/>
        <span style="word-break:break-all;">${accessUrl}</span>
      </div>
    </div>
  </div>
  `;
}
