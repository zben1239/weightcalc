// app/lib/premiumEmail.ts
export function premiumEmailHtml(params: { appName?: string; accessUrl: string }) {
  const appName = params.appName ?? "WeightCalc";
  const accessUrl = params.accessUrl;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName} — Premium</title>
</head>

<body style="margin:0; padding:0; background:#07080d; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- Background glow -->
  <div style="margin:0; padding:42px 16px; background:
    radial-gradient(900px 420px at 12% 12%, rgba(139,92,246,.28), transparent 62%),
    radial-gradient(900px 420px at 85% 30%, rgba(16,185,129,.18), transparent 62%),
    #07080d;">
    
    <div style="max-width:640px; margin:0 auto;">
      <!-- Header brand -->
      <div style="text-align:center; margin-bottom:14px;">
        <div style="display:inline-block; padding:8px 12px; border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.06);
          color:#e9eaf6; font-weight:900; letter-spacing:-0.02em; font-size:14px;">
          ${appName}
        </div>
      </div>

      <!-- Card -->
      <div style="
        border-radius:22px;
        border:1px solid rgba(255,255,255,.14);
        background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
        box-shadow:0 28px 90px rgba(0,0,0,.55);
        overflow:hidden;
      ">

        <!-- Top strip -->
        <div style="padding:22px 22px 0 22px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
            <div>
              <div style="font-size:22px; font-weight:950; letter-spacing:-0.03em; color:#eef2ff;">
                Accès Premium activé ✨
              </div>
              <div style="margin-top:6px; font-size:13px; line-height:1.55; color:rgba(229,231,235,.92);">
                Votre accès est prêt. Activez-le en 1 clic et profitez immédiatement du programme complet.
              </div>
            </div>

            <div style="
              padding:7px 10px;
              border-radius:999px;
              border:1px solid rgba(34,197,94,.40);
              background:rgba(34,197,94,.14);
              color:#bbf7d0;
              font-weight:950;
              font-size:12px;
              white-space:nowrap;">
              ✅ Premium
            </div>
          </div>

          <div style="height:1px; background:rgba(255,255,255,.12); margin:18px 0 0 0;"></div>
        </div>

        <!-- Content -->
        <div style="padding:18px 22px 0 22px;">
          <div style="font-size:14px; line-height:1.75; color:rgba(229,231,235,.95);">
            <p style="margin:0 0 12px 0;">
              Bonjour, <br/>
              Félicitations — votre <b style="color:#eef2ff;">Premium</b> est prêt.
            </p>

            <p style="margin:0 0 14px 0;">
              Une fois activé, vous débloquez :
            </p>

            <div style="
              border-radius:16px;
              border:1px solid rgba(255,255,255,.12);
              background:rgba(0,0,0,.16);
              padding:14px;">
              <div style="margin:0; padding:0;">
                ${featureRow("Programme complet", "Plan + comparateur Standard / Entraînement / Repos")}
                ${featureRow("Semaine type", "Cadre clair et adaptable selon votre rythme")}
                ${featureRow("Guide alimentaire", "Protéines • Glucides • Lipides (simple & efficace)")}
                ${featureRow("Règles d’ajustement", "Ajustements faciles, progressifs, sans prise de tête")}
                ${featureRow("Temps cible", "Estimation personnalisée selon votre objectif")}
              </div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div style="padding:22px; text-align:center;">
          <a href="${accessUrl}" style="
            display:inline-block;
            padding:14px 22px;
            border-radius:14px;
            background:linear-gradient(180deg, rgba(139,92,246,1), rgba(99,102,241,1));
            color:#ffffff;
            text-decoration:none;
            font-weight:950;
            font-size:15px;
            letter-spacing:-0.01em;
            box-shadow:0 14px 40px rgba(99,102,241,.28);
            border:1px solid rgba(255,255,255,.14);
          ">
            Activer mon accès Premium
          </a>

          <div style="margin-top:10px; font-size:12px; color:rgba(156,163,175,.95); line-height:1.5;">
            L’activation se fait sur ce navigateur et reste valable <b style="color:#e5e7eb;">30 jours</b>.
          </div>
        </div>

        <!-- Divider -->
        <div style="height:1px; background:rgba(255,255,255,.12);"></div>

        <!-- Fallback link -->
        <div style="padding:16px 22px 20px 22px; font-size:12px; line-height:1.6; color:rgba(156,163,175,.95);">
          <div style="margin:0 0 8px 0;">
            Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
          </div>
          <div style="
            word-break:break-all;
            padding:10px 12px;
            border-radius:12px;
            border:1px solid rgba(255,255,255,.12);
            background:rgba(0,0,0,.18);
            color:#c7d2fe;
            font-weight:800;
          ">
            ${accessUrl}
          </div>

          <div style="margin-top:12px; opacity:.95;">
            🔒 Ce lien est personnel et sécurisé.
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center; margin-top:16px; font-size:11px; color:rgba(107,114,128,.95);">
        © ${year} ${appName} — Tous droits réservés
      </div>
    </div>
  </div>
</body>
</html>`;
}

function featureRow(title: string, subtitle: string) {
  return `
  <div style="display:flex; gap:10px; align-items:flex-start; margin:0 0 10px 0;">
    <div style="
      width:22px; height:22px; border-radius:999px;
      display:inline-flex; align-items:center; justify-content:center;
      background:rgba(34,197,94,.16);
      border:1px solid rgba(34,197,94,.35);
      color:#bbf7d0;
      font-weight:950;
      line-height:1;
      flex:0 0 auto;
      margin-top:1px;">
      ✓
    </div>
    <div style="flex:1 1 auto;">
      <div style="font-weight:950; color:#eef2ff; font-size:13px; margin:0;">
        ${title}
      </div>
      <div style="margin-top:2px; color:rgba(203,213,225,.92); font-size:12px; font-weight:750; line-height:1.45;">
        ${subtitle}
      </div>
    </div>
  </div>`;
}
