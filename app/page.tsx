// app/page.tsx
import { getPremiumState } from "./lib/accessStore";

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

/** Construit une URL en conservant les paramètres actuels, et en appliquant des overrides. */
function buildHref(sp: SearchParams, overrides: Record<string, string | null>) {
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
  return qs ? `/?${qs}` : "/";
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};

  // ✅ Premium = token signé dans cookie (plus jamais "1")
  const premiumState = await getPremiumState();
  const isPremium = premiumState.premium;

  // mini "routing" via query
  const view = param(sp, "view", "home"); // home | unlock
  const openKey = param(sp, "open", ""); // programme | semaine | guide | regles | temps
  const PRICE_LABEL = "2,99€";

  // ===== Inputs (defaults)
  const sex = param(sp, "sex", "male"); // male | female
  const goal = param(sp, "goal", "cut"); // cut | maintain | bulk
  const activity = param(sp, "activity", "moderate"); // low | moderate | high

  const age = clamp(toNum(param(sp, "age", "28"), 28), 12, 90);
  const height = clamp(toNum(param(sp, "height", "175"), 175), 120, 230);
  const weight = clamp(toNum(param(sp, "weight", "75"), 75), 30, 250);

  const targetWeightRaw = param(sp, "targetWeight", "");
  const targetWeight = targetWeightRaw ? toNum(targetWeightRaw, NaN) : NaN;

  // email prefill (unlock page)
  const emailPrefill = param(sp, "email", "");

  // ===== Calculs
  const bmr =
    sex === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityFactor =
    activity === "low" ? 1.35 : activity === "high" ? 1.7 : 1.55;

  const tdee = bmr * activityFactor;

  const goalDelta = goal === "cut" ? -450 : goal === "bulk" ? +250 : 0;
  const calories = Math.max(1200, round(tdee + goalDelta));

  const protein = round(weight * (goal === "cut" ? 2.0 : 1.8));
  const fat = round(weight * (goal === "cut" ? 0.8 : 0.9));
  const carbs = Math.max(0, round((calories - protein * 4 - fat * 9) / 4));

  // Standard / Training / Rest
  const standard = { p: protein, c: carbs, f: fat, kcal: calories };
  const train = {
    p: protein,
    c: round(carbs * 1.15),
    f: round(fat * 0.85),
  };
  const rest = {
    p: protein,
    c: round(carbs * 0.85),
    f: round(fat * 1.15),
  };

  const trainKcal = round(train.p * 4 + train.c * 4 + train.f * 9);
  const restKcal = round(rest.p * 4 + rest.c * 4 + rest.f * 9);

  // Meals split
  const meals = [
    { label: "Petit-déj", pct: 0.25 },
    { label: "Déjeuner", pct: 0.30 },
    { label: "Goûter", pct: 0.25 },
    { label: "Dîner", pct: 0.20 },
  ];

  const mealKcalsStandard = meals.map((m) => ({
    ...m,
    kcal: round(standard.kcal * m.pct),
  }));
  const mealKcalsTrain = meals.map((m) => ({
    ...m,
    kcal: round(trainKcal * m.pct),
  }));
  const mealKcalsRest = meals.map((m) => ({
    ...m,
    kcal: round(restKcal * m.pct),
  }));

  // Temps cible (Premium uniquement)
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

  // Suggestion semaine type
  const weekPlan =
    activity === "high"
      ? { trainDays: 5, restDays: 2, label: "5 jours sport • 2 jours repos" }
      : activity === "low"
      ? { trainDays: 3, restDays: 4, label: "3 jours sport • 4 jours repos" }
      : { trainDays: 4, restDays: 3, label: "4 jours sport • 3 jours repos" };

  // ===== Styles
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
      width: "min(1000px, 94vw)",
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
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    } as const,
    title: { fontSize: 30, fontWeight: 900, letterSpacing: -0.5 } as const,
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

    cards: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 12,
      marginTop: 12,
    } as const,
    card: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.05)",
      padding: 14,
      minHeight: 86,
    } as const,
    cardTitle: { opacity: 0.85, fontSize: 12, fontWeight: 950 } as const,
    cardBig: { fontSize: 26, fontWeight: 950, marginTop: 6 } as const,
    cardSmall: { opacity: 0.78, fontSize: 12, marginTop: 4 } as const,

    note: { opacity: 0.88, fontSize: 13, lineHeight: 1.35 } as const,
    hr: {
      height: 1,
      background: "rgba(255,255,255,.10)",
      border: "none",
      margin: "14px 0",
    } as const,

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

    tinyExplain: {
      fontSize: 12,
      opacity: 0.9,
      fontWeight: 800,
      textAlign: "right",
    } as const,

    accList: {
      display: "grid",
      gap: 10,
      marginTop: 12,
    } as const,

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
    accLeft: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    } as const,
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

    overlay: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      padding: 16,
      background:
        "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,.75) 100%)",
    } as const,

    tableWrap: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.16)",
      overflow: "hidden",
      marginTop: 12,
    } as const,
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13,
    } as const,
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

  // ===== Unlock page
  if (!isPremium && view === "unlock") {
    return (
      <main style={S.page}>
        <div style={S.shell}>
          <div style={S.topRow}>
            <div>
              <div style={S.title}>WeightCalc</div>
              <div style={S.sub}>Débloquer Premium</div>
            </div>
            <div style={S.badge}>🔒 Free</div>
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
              Débloque l’accès Premium
            </div>

            <div style={S.note}>
              Après paiement, Premium est activé automatiquement sur ce navigateur (30 jours).
              <br />
              Tu recevras aussi un email avec un lien d’accès pour retrouver ton Premium plus tard.
            </div>

            {/* ✅ FORM POST : ton /api/create-checkout redirige en 303 vers Stripe */}
            <form action="/api/create-checkout" method="post" style={{ marginTop: 12 }}>
              <input
                name="email"
                type="email"
                defaultValue={emailPrefill}
                required
                style={S.field}
                placeholder="ton.email@gmail.com"
              />

              {/* ✅ on conserve quel accordion le user voulait ouvrir */}
              <input type="hidden" name="open" value={openKey || ""} />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <a
                  href={buildHref(sp, { view: "home", open: null })}
                  style={{ textDecoration: "none" }}
                >
                  <div style={S.btn}>Retour</div>
                </a>

                <button type="submit" style={S.btnPrimary}>
                  Débloquer Premium — {PRICE_LABEL}
                </button>
              </div>
            </form>
          </div>

          <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
            Paiement sécurisé • Accès immédiat sur ce navigateur • Lien d’accès envoyé par email
          </div>
        </div>
      </main>
    );
  }

  // ===== Helpers UI
  const AccButton = ({ k, title, sub }: { k: string; title: string; sub: string }) => {
    // Free: clique => page unlock + mémorise l’accordéon
    if (!isPremium) {
      const href = buildHref(sp, { view: "unlock", open: k });
      return (
        <a href={href} style={S.accBtn}>
          <div style={S.accLeft}>
            <div style={S.accTitle}>{title}</div>
            <div style={S.accSub}>{sub}</div>
          </div>
          <div style={S.accPill}>Ouvrir</div>
        </a>
      );
    }

    // Premium: toggle accordéon
    const isOpen = openKey === k;
    const href = buildHref(sp, { open: isOpen ? "" : k, view: "home" });

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

  const MealLine = (arr: { label: string; kcal: number }[]) =>
    arr.map((m) => `${m.label}: ${m.kcal} kcal`).join(" • ");

  // ===== Contenu accordéons
  const ProgrammeComplet = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>🎯 Suggestion de plan</div>
        <div style={S.accPill}>{weekPlan.label}</div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {[
          {
            t: "Protéines",
            d: "Poulet, dinde, œufs, thon, saumon, skyr, fromage blanc 0–3%, tofu.",
            r: "Astuce : vise 25–40 g de protéines par repas.",
          },
          {
            t: "Glucides",
            d: "Riz, pâtes, avoine, quinoa, patate douce, légumineuses.",
            r: "Fruits : banane, fruits rouges, kiwi (top avant/après sport).",
          },
          {
            t: "Lipides",
            d: "Huile d’olive, avocat, amandes/noix, beurre de cacahuète (dose), sardines.",
            r: "Règle : un peu plus hauts les jours repos.",
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
            <div style={{ marginTop: 6, opacity: 0.9, fontSize: 12, fontWeight: 750, lineHeight: 1.35 }}>
              {c.d}
            </div>
            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12, fontWeight: 800 }}>
              {c.r}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 800 }}>
        Structure simple : 1 protéine + 1 glucide + beaucoup de légumes + une petite source de bons gras.
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 950 }}>📊 Comparateur — Standard / Entraînement / Repos</div>
        <div style={S.accPill}>Lecture rapide</div>
      </div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Paramètre</th>
              <th style={S.th}>Jour standard</th>
              <th style={S.th}>Jour entraînement</th>
              <th style={S.th}>Jour repos</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Calories / jour", `${standard.kcal} kcal`, `${trainKcal} kcal`, `${restKcal} kcal`],
              ["Protéines", `${standard.p} g`, `${train.p} g`, `${rest.p} g`],
              ["Glucides", `${standard.c} g`, `${train.c} g`, `${rest.c} g`],
              ["Lipides", `${standard.f} g`, `${train.f} g`, `${rest.f} g`],
              ["Répartition repas", MealLine(mealKcalsStandard), MealLine(mealKcalsTrain), MealLine(mealKcalsRest)],
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
        Jours entraînement : plus de glucides, un peu moins de lipides. Jours repos : l’inverse.
      </div>
    </>
  );

  const SemaineType = (
    <>
      <div style={{ fontWeight: 950 }}>📅 Semaine type</div>
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
        Protéines stables chaque jour. Les variations se font surtout sur glucides / lipides.
      </div>
    </>
  );

  const GuideAlimentaire = (
    <>
      <div style={{ fontWeight: 950 }}>🥗 Guide alimentaire</div>
      <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, fontWeight: 750 }}>
        Objectif : composer facilement tes repas, sans te compliquer la vie.
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {[
          { h: "Protéines", items: ["Poulet / dinde", "Poisson", "Œufs", "Skyr / fromage blanc", "Tofu"], tip: "Une portion à chaque repas." },
          { h: "Glucides", items: ["Riz / pâtes", "Avoine", "Quinoa", "Patate douce", "Légumineuses"], tip: "Plus hauts les jours entraînement." },
          { h: "Lipides", items: ["Huile d’olive", "Avocat", "Amandes/noix", "Beurre de cacahuète (dose)", "Sardines"], tip: "Un peu plus hauts les jours repos." },
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
              {col.items.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 850 }}>{col.tip}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12, fontWeight: 800 }}>
        Légumes : à volonté. Fruits : 1–2/jour (banane pratique autour de l’entraînement).
      </div>
    </>
  );

  const ReglesAjustement = (
    <>
      <div style={{ fontWeight: 950 }}>⚙️ Règles d’ajustement</div>
      <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, fontWeight: 750 }}>
        L’idée : ajuster progressivement, sans changer tout le plan toutes les 48h.
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {[
          { t: "Si ton poids ne bouge pas pendant 14 jours", d: "Réduis de 150 kcal par jour (en priorité sur les glucides)." },
          { t: "Si tu perds trop vite (fatigue / faim / performance en baisse)", d: "Ajoute 100 kcal par jour (souvent via des glucides autour de l’entraînement)." },
          { t: "Jours sport : timing simple", d: "Glucides avant/après (banane, riz, avoine). Protéines à chaque repas." },
          { t: "Cadre hebdomadaire", d: "Semaine type 4 jours sport / 3 jours repos (adaptable). Les variations se font surtout sur glucides/lipides." },
          { t: "Rythme réaliste", d: "Perte de poids : 0,4 à 1,0 kg par semaine selon ton profil. Mieux vaut régulier que parfait." },
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
      <div style={{ fontWeight: 950 }}>⏱️ Temps cible</div>
      <div style={{ marginTop: 8, opacity: 0.9, fontSize: 12, fontWeight: 750 }}>
        Basé sur ton poids objectif. Indique ton objectif puis clique sur <b>Calculer</b>.
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

  // ===== Form calcul
  const CalcForm = (
    <form method="get" action="/">
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
          placeholder="Poids objectif (kg) — Premium"
        />
      </div>

      <div style={S.btnRow}>
        <a href="/" style={{ textDecoration: "none" }}>
          <div style={S.btn}>Réinitialiser</div>
        </a>

        <button type="submit" style={S.btnPrimary}>
          Calculer
        </button>
      </div>
    </form>
  );

  const ResultsTop = (
    <>
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
          Calories cible ≈ {calories} kcal
        </div>

        <div style={{ ...S.pill, opacity: 0.9 }}>
          Objectif :{" "}
          <b>{goal === "cut" ? "Perte de poids" : goal === "bulk" ? "Prise de masse" : "Maintien"}</b> • Activité :{" "}
          <b>{activity === "low" ? "Faible" : activity === "high" ? "Élevée" : "Modérée"}</b>
        </div>
      </div>

      <div style={S.note}>
        • <b>BMR</b> = calories au repos (énergie minimale). <br />
        • <b>TDEE</b> = calories pour maintenir ton poids avec ton activité.
      </div>

      <div style={S.cards}>
        <div style={S.card}>
          <div style={S.cardTitle}>PROTÉINES</div>
          <div style={S.cardBig}>{protein} g</div>
          <div style={S.cardSmall}>≈ {protein * 4} kcal</div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>GLUCIDES</div>
          <div style={S.cardBig}>{carbs} g</div>
          <div style={S.cardSmall}>≈ {carbs * 4} kcal</div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>LIPIDES</div>
          <div style={S.cardBig}>{fat} g</div>
          <div style={S.cardSmall}>≈ {fat * 9} kcal</div>
        </div>
      </div>
    </>
  );

  // ===== Home
  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>Calcule ton plan simplement. {isPremium ? "Premium activé ✅" : "Version gratuite"}</div>
          </div>

          <div style={S.badge}>{isPremium ? "✅ Premium" : "🔒 Free"}</div>
        </div>

        {CalcForm}
        {ResultsTop}

        <hr style={S.hr} />

        <div style={S.premiumBox}>
          <div style={S.premiumHeaderRow}>
            <div style={S.premiumTitle}>{isPremium ? "✅ Premium" : "🔒 Premium"}</div>
            <div style={S.tinyExplain}>
              Standard = base sans sport • Entraînement = jour avec sport • Repos = récupération
            </div>
          </div>

          <div style={S.accList}>
            <AccButton k="programme" title="Programme complet" sub="Plan + comparateur Standard / Entraînement / Repos" />
            {isPremium && openKey === "programme" && <div style={S.accPanel}>{ProgrammeComplet}</div>}

            <AccButton k="semaine" title="Semaine type" sub="Planning simple et adaptable selon ton activité" />
            {isPremium && openKey === "semaine" && <div style={S.accPanel}>{SemaineType}</div>}

            <AccButton k="guide" title="Guide alimentaire" sub="Protéines, glucides, lipides" />
            {isPremium && openKey === "guide" && <div style={S.accPanel}>{GuideAlimentaire}</div>}

            <AccButton k="regles" title="Règles d’ajustement" sub="Règles simples pour progresser" />
            {isPremium && openKey === "regles" && <div style={S.accPanel}>{ReglesAjustement}</div>}

            <AccButton k="temps" title="Temps cible" sub="Estimation basée sur ton poids objectif" />
            {isPremium && openKey === "temps" && <div style={S.accPanel}>{TempsCible}</div>}
          </div>

          {!isPremium && (
            <div style={S.overlay}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={S.accPill}>🔒 Contenu Premium</div>
                <a href={buildHref(sp, { view: "unlock" })} style={{ textDecoration: "none" }}>
                  <div style={S.btnPrimary}>Débloquer Premium — {PRICE_LABEL}</div>
                </a>
              </div>
            </div>
          )}
        </div>

        {!isPremium && (
          <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
            Premium inclut : programme complet, semaine type, guide alimentaire, règles d’ajustement, temps cible.
          </div>
        )}
      </div>
    </main>
  );
}
