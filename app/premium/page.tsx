// app/premium/page.tsx
import { cookies } from "next/headers";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function param(sp: SearchParams, key: string, fallback = ""): string {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? fallback;
  if (typeof v === "string") return v;
  return fallback;
}
function toNum(s: string, fallback: number) {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function round(n: number) {
  return Math.round(n);
}
function fmtWeeksMonths(weeks: number) {
  const months = Math.round((weeks / 4.345) * 10) / 10;
  return { weeks, months };
}

/**
 * Construit une URL en conservant les paramètres actuels,
 * et en appliquant des overrides.
 */
function buildHref(basePath: string, sp: SearchParams, overrides: Record<string, string | null>) {
  const u = new URL("http://local/");
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") u.searchParams.set(k, v);
    if (Array.isArray(v) && v[0]) u.searchParams.set(k, v[0]);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) u.searchParams.delete(k);
    else u.searchParams.set(k, v);
  }
  const qs = u.searchParams.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function mealSplit(totalKcal: number) {
  // 25/30/25/20
  const pcts = [
    { label: "Petit-déj", pct: 0.25 },
    { label: "Déjeuner", pct: 0.30 },
    { label: "Goûter", pct: 0.25 },
    { label: "Dîner", pct: 0.20 },
  ];
  return pcts.map((m) => ({ label: m.label, kcal: round(totalKcal * m.pct) }));
}

export default async function PremiumPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const cookieStore = await cookies();
  const isPremium = cookieStore.get("wc_premium")?.value === "1";

  // mini routing / UI state via query
  const openKey = param(sp, "open", ""); // programme | semaine | guide | regles | temps

  // ===== Inputs (defaults)
  const sex = param(sp, "sex", "male"); // male | female
  const goal = param(sp, "goal", "cut"); // cut | maintain | bulk
  const activity = param(sp, "activity", "moderate"); // low | moderate | high

  const age = clamp(toNum(param(sp, "age", "28"), 28), 12, 90);
  const height = clamp(toNum(param(sp, "height", "175"), 175), 120, 230);
  const weight = clamp(toNum(param(sp, "weight", "75"), 75), 30, 250);

  const targetWeightRaw = param(sp, "targetWeight", "");
  const targetWeight = targetWeightRaw ? toNum(targetWeightRaw, NaN) : NaN;

  // ===== Calculs
  const bmr =
    sex === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityFactor = activity === "low" ? 1.35 : activity === "high" ? 1.7 : 1.55;
  const tdee = bmr * activityFactor;

  const goalDelta = goal === "cut" ? -450 : goal === "bulk" ? +250 : 0;
  const kcalStandard = Math.max(1200, round(tdee + goalDelta));

  const protein = round(weight * (goal === "cut" ? 2.0 : 1.8));
  const fat = round(weight * (goal === "cut" ? 0.8 : 0.9));
  const carbs = Math.max(0, round((kcalStandard - protein * 4 - fat * 9) / 4));

  // Standard / Training / Rest (protéines stables)
  const standard = { p: protein, c: carbs, f: fat, kcal: kcalStandard };
  const train = { p: protein, c: round(carbs * 1.15), f: round(fat * 0.85) };
  const rest = { p: protein, c: round(carbs * 0.85), f: round(fat * 1.15) };

  const kcalTrain = round(train.p * 4 + train.c * 4 + train.f * 9);
  const kcalRest = round(rest.p * 4 + rest.c * 4 + rest.f * 9);

  const mealsStandard = mealSplit(kcalStandard);
  const mealsTrain = mealSplit(kcalTrain);
  const mealsRest = mealSplit(kcalRest);

  // Temps cible (Premium)
  let weeks: number | null = null;
  if (isPremium && Number.isFinite(targetWeight)) {
    if (goal === "cut" && targetWeight < weight) {
      const lossPerWeek = clamp(weight * 0.0075, 0.4, 1.0);
      weeks = Math.ceil((weight - targetWeight) / lossPerWeek);
    } else if (goal === "bulk" && targetWeight > weight) {
      const gainPerWeek = clamp(weight * 0.0035, 0.2, 0.6);
      weeks = Math.ceil((targetWeight - weight) / gainPerWeek);
    } else if (goal === "maintain") {
      weeks = 0;
    } else {
      weeks = null;
    }
  }

  // Semaine type (simple)
  const weekPlan =
    activity === "high"
      ? { trainDays: 5, restDays: 2, label: "5 jours sport • 2 jours repos" }
      : activity === "low"
      ? { trainDays: 3, restDays: 4, label: "3 jours sport • 4 jours repos" }
      : { trainDays: 4, restDays: 3, label: "4 jours sport • 3 jours repos" };

  const goalLabel = goal === "cut" ? "Perte de poids" : goal === "bulk" ? "Prise de masse" : "Maintien";
  const activityLabel = activity === "low" ? "Faible" : activity === "high" ? "Élevée" : "Modérée (3–5x/sem)";

  // ===== Styles (luxueux + cohérents)
  const S = {
    page: {
      minHeight: "100vh",
      padding: 22,
      display: "grid",
      placeItems: "center",
      background:
        "radial-gradient(900px 420px at 12% 12%, rgba(139,92,246,.35), transparent 65%), radial-gradient(900px 420px at 85% 30%, rgba(16,185,129,.18), transparent 60%), #07080d",
      color: "#e8e8f0",
    } as const,
    shell: {
      width: "min(1050px, 95vw)",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.06)",
      backdropFilter: "blur(14px)",
      boxShadow: "0 20px 60px rgba(0,0,0,.35)",
      padding: 18,
    } as const,
    topRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 12,
    } as const,
    title: { fontSize: 30, fontWeight: 950, letterSpacing: -0.5 } as const,
    sub: { opacity: 0.8, marginTop: 4 } as const,
    badge: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid rgba(34,197,94,.45)",
      background: "rgba(34,197,94,.15)",
      color: "#a7f3d0",
      whiteSpace: "nowrap",
    } as const,

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 12,
      marginTop: 12,
    } as const,
    field: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      color: "#f2f2ff",
      outline: "none",
    } as const,
    btnRow: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: 12,
    } as const,
    btn: {
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.08)",
      color: "#fff",
      fontWeight: 900,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    } as const,
    btnPrimary: {
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid rgba(139,92,246,.55)",
      background: "rgba(139,92,246,.35)",
      color: "#fff",
      fontWeight: 950,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(139,92,246,.25)",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    } as const,

    pills: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
      alignItems: "center",
    } as const,
    pill: {
      borderRadius: 999,
      padding: "8px 10px",
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      fontSize: 13,
      fontWeight: 900,
    } as const,
    note: { opacity: 0.88, fontSize: 13, lineHeight: 1.35 } as const,
    hr: { height: 1, background: "rgba(255,255,255,.10)", border: "none", margin: "14px 0" } as const,

    // Accordéons
    premiumBox: {
      marginTop: 14,
      borderRadius: 16,
      border: "1px solid rgba(34,197,94,.35)",
      background: "rgba(34,197,94,.12)",
      padding: 16,
      position: "relative",
      overflow: "hidden",
    } as const,
    premiumHeaderRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    } as const,
    premiumTitle: { fontWeight: 950, fontSize: 16 } as const,
    tinyExplain: { fontSize: 12, opacity: 0.9, fontWeight: 800, textAlign: "right" } as const,

    accList: { display: "grid", gap: 10, marginTop: 12 } as const,
    accBtn: {
      width: "100%",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(0,0,0,.14)",
      padding: 14,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      textDecoration: "none",
      color: "#fff",
      cursor: "pointer",
    } as const,
    accLeft: { display: "flex", flexDirection: "column", gap: 4 } as const,
    accTitle: { fontWeight: 950, fontSize: 14 } as const,
    accSub: { fontSize: 12, opacity: 0.8, fontWeight: 700 } as const,
    accPill: {
      borderRadius: 999,
      padding: "8px 10px",
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      fontWeight: 900,
      fontSize: 12,
      opacity: 0.95,
      whiteSpace: "nowrap",
    } as const,
    accPanel: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.05)",
      padding: 14,
      marginTop: -4,
    } as const,

    // Table comparateur
    tableWrap: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.16)",
      overflow: "hidden",
      marginTop: 12,
    } as const,
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 } as const,
    th: {
      textAlign: "left",
      padding: "12px 12px",
      fontWeight: 950,
      background: "rgba(255,255,255,.06)",
      borderBottom: "1px solid rgba(255,255,255,.10)",
    } as const,
    td: {
      padding: "12px 12px",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      verticalAlign: "top",
      fontWeight: 800,
    } as const,
    tdMuted: { opacity: 0.85, fontWeight: 750 } as const,
  };

  // ✅ Si pas premium => écran “Premium requis” + bouton “Débloquer” (renvoie vers /?view=unlock)
  if (!isPremium) {
    const unlockHref = buildHref("/", sp, { view: "unlock" });
    return (
      <main style={S.page}>
        <div style={S.shell}>
          <div style={S.topRow}>
            <div>
              <div style={S.title}>WeightCalc</div>
              <div style={S.sub}>Accès Premium requis</div>
            </div>
            <div style={{ ...S.badge, borderColor: "rgba(248,113,113,.45)", background: "rgba(248,113,113,.12)", color: "#fecaca" }}>
              🔒 Premium requis
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.05)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 8 }}>
              Tu n’as pas encore accès au programme Premium.
            </div>

            <div style={S.note}>
              Pour débloquer : email → paiement Stripe → Premium activé.
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                Ce que tu obtiens en Premium :
                <ul style={{ margin: "8px 0 0 18px", lineHeight: 1.5 }}>
                  <li>Programme complet (Standard / Entraînement / Repos)</li>
                  <li>Semaine type</li>
                  <li>Guide alimentaire</li>
                  <li>Règles d’ajustement</li>
                  <li>Temps cible (estimation)</li>
                </ul>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <a href="/" style={S.btn}>
                ← Revenir à l’accueil
              </a>
              <a href={unlockHref} style={S.btnPrimary}>
                Débloquer Premium
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ===== Helpers UI
  const AccButton = ({ k, title, sub }: { k: string; title: string; sub: string }) => {
    const isOpen = openKey === k;
    const href = buildHref("/premium", sp, { open: isOpen ? "" : k });
    return (
      <a href={href} style={S.accBtn}>
        <div style={S.accLeft}>
          <div style={S.accTitle}>{title}</div>
          <div style={S.accSub}>{sub}</div>
        </div>
        <div style={S.accPill}>{isOpen ? "Fermer" : "Ouvrir"}</div>
      </a>
    );
  };

  const Panel = ({ children }: { children: ReactNode }) => <div style={S.accPanel}>{children}</div>;

  const mealsToText = (m: { label: string; kcal: number }[]) =>
    m.map((x) => `${x.label}: ${x.kcal} kcal`).join(" • ");

  // ===== Contenus accordéons
  const ProgrammeComplet = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>🎯 Suggestion de plan (simple & efficace)</div>
        <div style={S.accPill}>{weekPlan.label}</div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {[
          {
            t: "Protéines (lean)",
            d: "Poulet, dinde, œufs, thon, saumon, skyr, fromage blanc 0–3%, tofu.",
            r: "Astuce : vise 25–40 g de protéines par repas.",
          },
          {
            t: "Glucides (énergie clean)",
            d: "Riz, pâtes, avoine, quinoa, patate douce, légumineuses.",
            r: "Fruits : banane, fruits rouges, kiwi (top avant/après sport).",
          },
          {
            t: "Lipides (bons gras)",
            d: "Huile d’olive, avocat, amandes/noix, beurre de cacahuète (dose), sardines.",
            r: "Règle : lipides un peu plus hauts les jours repos.",
          },
        ].map((c) => (
          <div
            key={c.t}
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 950 }}>{c.t}</div>
            <div style={{ marginTop: 6, opacity: 0.9, fontSize: 12, fontWeight: 750, lineHeight: 1.35 }}>{c.d}</div>
            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12, fontWeight: 800 }}>{c.r}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 800 }}>
        Structure “healthy” : 1 source protéine + 1 source glucide + beaucoup de légumes + une petite source de bons gras. Hydratation + sel (surtout entraînement).
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 950 }}>📊 Comparateur — Standard vs Entraînement vs Repos</div>
        <div style={S.accPill}>Lisible en 10 secondes</div>
      </div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Paramètre</th>
              <th style={S.th}>Jour standard (base sans sport)</th>
              <th style={S.th}>Jour entraînement (jour avec sport)</th>
              <th style={S.th}>Jour repos (récupération)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Calories / jour", `${standard.kcal} kcal`, `${kcalTrain} kcal`, `${kcalRest} kcal`],
              ["Protéines", `${standard.p} g`, `${train.p} g`, `${rest.p} g`],
              ["Glucides", `${standard.c} g`, `${train.c} g`, `${rest.c} g`],
              ["Lipides", `${standard.f} g`, `${train.f} g`, `${rest.f} g`],
              ["Répartition repas", mealsToText(mealsStandard), mealsToText(mealsTrain), mealsToText(mealsRest)],
            ].map((row) => (
              <tr key={row[0]}>
                <td style={{ ...S.td, ...S.tdMuted }}>{row[0]}</td>
                <td style={S.td}>{row[1]}</td>
                <td style={S.td}>{row[2]}</td>
                <td style={S.td}>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 800 }}>
        Lecture rapide : les jours entraînement, tu augmentes surtout les glucides (carburant) et tu baisses un peu les lipides. Les jours repos, tu fais l’inverse.
      </div>
    </>
  );

  const SemaineType = (
    <>
      <div style={{ fontWeight: 950 }}>📅 Semaine type (adaptable)</div>
      <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, fontWeight: 750 }}>
        Basée sur ton activité : <b>{weekPlan.label}</b>. Tu peux déplacer les jours selon ton planning.
      </div>

      <div
        style={{
          marginTop: 12,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(0,0,0,.16)",
          padding: 12,
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {[
          { d: "Lun", t: "Entraînement" },
          { d: "Mar", t: "Repos" },
          { d: "Mer", t: "Entraînement" },
          { d: "Jeu", t: "Repos" },
          { d: "Ven", t: "Entraînement" },
          { d: "Sam", t: weekPlan.trainDays >= 4 ? "Entraînement" : "Repos" },
          { d: "Dim", t: "Repos" },
        ].map((x) => (
          <div
            key={x.d}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.05)",
              padding: 10,
              minHeight: 70,
            }}
          >
            <div style={{ fontWeight: 950 }}>{x.d}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{x.t}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 800 }}>
        Conseil : garde tes protéines stables chaque jour. Les variations se font surtout sur glucides/lipides.
      </div>
    </>
  );

  const GuideAlimentaire = (
    <>
      <div style={{ fontWeight: 950 }}>🥗 Guide alimentaire (simple, connu, efficace)</div>
      <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, fontWeight: 750 }}>
        Objectif : composer facilement tes repas sans te prendre la tête.
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {[
          {
            h: "Protéines",
            items: ["Poulet / dinde", "Poisson (saumon, thon, cabillaud)", "Œufs", "Skyr / fromage blanc", "Tofu"],
            tip: "Vise une portion à chaque repas.",
          },
          {
            h: "Glucides",
            items: ["Riz / pâtes", "Avoine", "Quinoa", "Pommes de terre / patate douce", "Légumineuses"],
            tip: "Plus hauts les jours entraînement.",
          },
          {
            h: "Lipides",
            items: ["Huile d’olive", "Avocat", "Amandes/noix", "Beurre de cacahuète (dose)", "Sardines"],
            tip: "Un peu plus hauts les jours repos.",
          },
        ].map((col) => (
          <div
            key={col.h}
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 950 }}>{col.h}</div>
            <ul style={{ margin: "10px 0 0 18px", opacity: 0.92, fontSize: 12, fontWeight: 750, lineHeight: 1.4 }}>
              {col.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 850 }}>{col.tip}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 800 }}>
        Légumes : à volonté (surtout verts). Fruits : 1–2/jour (banane top autour de l’entraînement).
      </div>
    </>
  );

  const ReglesAjustement = (
    <>
      <div style={{ fontWeight: 950 }}>⚙️ Règles d’ajustement (faciles à suivre)</div>
      <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, fontWeight: 750 }}>
        L’idée : ajuster calmement, sans tout changer toutes les 48 heures.
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {[
          {
            t: "Si ton poids ne bouge pas pendant 14 jours",
            d: "Réduis de 150 kcal/jour (en priorité sur les glucides).",
          },
          {
            t: "Si tu perds trop vite (fatigue, faim, performance en baisse)",
            d: "Ajoute +100 kcal/jour (souvent via des glucides autour de l’entraînement).",
          },
          {
            t: "Jours sport : timing simple",
            d: "Glucides avant/après (banane, riz, avoine). Protéines à chaque repas.",
          },
          {
            t: "Cadre hebdomadaire",
            d: "Semaine type 4 sport / 3 repos (adaptable). Les variations se font sur glucides/lipides, pas sur les protéines.",
          },
          {
            t: "Rythme réaliste",
            d: "Perte de poids : 0,4 à 1,0 kg/semaine selon ton profil. Mieux vaut régulier que parfait.",
          },
        ].map((x) => (
          <div
            key={x.t}
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(0,0,0,.14)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 950 }}>{x.t}</div>
            <div style={{ marginTop: 6, opacity: 0.9, fontSize: 12, fontWeight: 750, lineHeight: 1.35 }}>{x.d}</div>
          </div>
        ))}
      </div>
    </>
  );

  const TempsCible = (
    <>
      <div style={{ fontWeight: 950 }}>⏱️ Temps cible (estimation)</div>
      <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, fontWeight: 750 }}>
        Basé sur ton poids objectif. Mets ton objectif puis clique sur <b>Calculer</b>.
      </div>

      <div style={{ marginTop: 12 }}>
        {!Number.isFinite(targetWeight) ? (
          <div style={S.note}>Renseigne ton poids objectif (champ “Poids objectif”), puis clique sur Calculer.</div>
        ) : weeks === null ? (
          <div style={S.note}>Objectif incohérent avec le mode choisi (ex : perte de poids mais objectif plus haut).</div>
        ) : weeks === 0 ? (
          <div style={S.note}>Objectif “Maintien” : durée non applicable (tu stabilises).</div>
        ) : (
          <div style={S.note}>
            {(() => {
              const t = fmtWeeksMonths(weeks);
              return (
                <>
                  Temps cible estimé : <b>{t.weeks} semaines</b> (≈ {t.months} mois)
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
        Conseil : progression régulière + sommeil + hydratation + constance.
      </div>
    </>
  );

  // ===== Page Premium
  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>Programme Premium — modules + comparateur ✅</div>
          </div>
          <div style={S.badge}>✅ Premium</div>
        </div>

        {/* ===== Form (GET) */}
        <form method="get" action="/premium">
          <div style={S.grid}>
            <select name="sex" defaultValue={sex} style={S.field}>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>

            <select name="goal" defaultValue={goal} style={S.field}>
              <option value="cut">Perte de poids</option>
              <option value="maintain">Maintien</option>
              <option value="bulk">Prise de masse</option>
            </select>

            <select name="activity" defaultValue={activity} style={S.field}>
              <option value="low">Faible</option>
              <option value="moderate">Modérée (3–5x/sem)</option>
              <option value="high">Élevée</option>
            </select>

            <input name="age" type="number" defaultValue={age} style={S.field} placeholder="Âge" />
            <input name="height" type="number" defaultValue={height} style={S.field} placeholder="Taille (cm)" />
            <input name="weight" type="number" defaultValue={weight} style={S.field} placeholder="Poids (kg)" />

            <input
              name="targetWeight"
              defaultValue={targetWeightRaw}
              style={{ ...S.field, gridColumn: "span 2" }}
              placeholder="Poids objectif (kg) — pour estimer la durée"
            />
          </div>

          <div style={S.btnRow}>
            <a href="/premium" style={S.btn}>
              Réinitialiser
            </a>
            <button type="submit" style={S.btnPrimary}>
              Calculer
            </button>
          </div>
        </form>

        {/* ===== Résumé */}
        <div style={S.pills}>
          <div style={S.pill}>BMR ≈ {round(bmr)} kcal</div>
          <div style={S.pill}>TDEE ≈ {round(tdee)} kcal</div>
          <div
            style={{
              ...S.pill,
              border: "1px solid rgba(34,197,94,.40)",
              background: "rgba(34,197,94,.12)",
              color: "#bbf7d0",
            }}
          >
            Calories base ≈ {kcalStandard} kcal
          </div>
          <div style={{ ...S.pill, opacity: 0.9 }}>
            Objectif : <b>{goalLabel}</b> • Activité : <b>{activityLabel}</b>
          </div>
        </div>

        <div style={S.note}>
          On garde les <b>protéines</b> stables, et on module <b>glucides</b> & <b>lipides</b> entre jour entraînement et jour repos.
        </div>

        <hr style={S.hr} />

        {/* ===== Modules (accordéons) */}
        <div style={S.premiumBox}>
          <div style={S.premiumHeaderRow}>
            <div style={S.premiumTitle}>✅ Modules Premium</div>
            <div style={S.tinyExplain}>
              Standard = base sans sport • Entraînement = jour avec sport • Repos = récupération
            </div>
          </div>

          <div style={S.accList}>
            <AccButton k="programme" title="Programme complet" sub="Plan + comparateur Standard / Entraînement / Repos" />
            {openKey === "programme" && <Panel>{ProgrammeComplet}</Panel>}

            <AccButton k="semaine" title="Semaine type" sub="Planning simple et adaptable selon ton activité" />
            {openKey === "semaine" && <Panel>{SemaineType}</Panel>}

            <AccButton k="guide" title="Guide alimentaire" sub="Protéines / glucides / lipides (healthy & connu)" />
            {openKey === "guide" && <Panel>{GuideAlimentaire}</Panel>}

            <AccButton k="regles" title="Règles d’ajustement" sub="Simple, clair, applicable (sans prise de tête)" />
            {openKey === "regles" && <Panel>{ReglesAjustement}</Panel>}

            {/* ✅ Toujours en dernier */}
            <AccButton k="temps" title="Temps cible" sub="Estimation basée sur ton poids objectif" />
            {openKey === "temps" && <Panel>{TempsCible}</Panel>}
          </div>
        </div>

        <div style={{ marginTop: 12, opacity: 0.85, fontSize: 12 }}>
          Premium activé ✅ • <a href="/" style={{ color: "#bbf7d0", fontWeight: 900 }}>Retour au home</a>
        </div>
      </div>
    </main>
  );
}
