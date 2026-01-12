// app/premium/page.tsx
import { cookies } from "next/headers";

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

function mealSplit(totalKcal: number) {
  const meals = [
    { label: "Petit-déj", pct: 0.25 },
    { label: "Déjeuner", pct: 0.30 },
    { label: "Goûter", pct: 0.25 },
    { label: "Dîner", pct: 0.20 },
  ];
  return meals.map((m) => ({ ...m, kcal: round(totalKcal * m.pct) }));
}

function weeklySplit(activity: string) {
  // simple & réaliste
  if (activity === "low") return { trainDays: 3, restDays: 4, note: "3 séances + marche légère" };
  if (activity === "high") return { trainDays: 5, restDays: 2, note: "5 séances + mobilité / marche" };
  return { trainDays: 4, restDays: 3, note: "4 séances + 1–2 marches" }; // moderate
}

// suggestions alimentaires (approx / simple, pas une table nutrition complète)
function foodSuggestions(p: number, c: number, f: number) {
  // On propose 3 “blocs” par macro (à adapter)
  // Les quantités sont volontairement rondes et “humaines”
  const proteinMeals = [
    { name: "Poulet / dinde", qty: "200–250g" },
    { name: "Poisson (saumon/thon/cabillaud)", qty: "180–220g" },
    { name: "Œufs", qty: "2–3" },
    { name: "Skyr / yaourt grec", qty: "250–300g" },
  ];

  const carbMeals = [
    { name: "Riz / pâtes complètes", qty: "250–350g cuits" },
    { name: "Pommes de terre", qty: "350–500g" },
    { name: "Flocons d’avoine", qty: "50–80g" },
    { name: "Fruits", qty: "2–3 portions" },
  ];

  const fatMeals = [
    { name: "Huile d’olive", qty: "1–2 c. à soupe" },
    { name: "Avocat", qty: "1/2–1" },
    { name: "Amandes/noix", qty: "20–30g" },
    { name: "Fromage (optionnel)", qty: "20–30g" },
  ];

  const veg = [
    { name: "Légumes", qty: "500–800g / jour" },
    { name: "Fibres", qty: "légumineuses 1–2x/sem" },
    { name: "Hydratation", qty: "2–3L / jour" },
  ];

  // mini “répartition aliments” lisible (pas au gramme)
  // On donne une règle simple basée sur macros
  const proteinRule =
    p >= 160 ? "2 grosses portions protéinées/jour + 1 collation protéinée"
    : p >= 120 ? "2 portions protéinées/jour"
    : "1–2 portions protéinées/jour";

  const carbRule =
    c >= 260 ? "glucides présents à chaque repas (performance)"
    : c >= 180 ? "glucides surtout autour du sport"
    : "glucides modérés, priorité légumes";

  const fatRule =
    f >= 70 ? "lipides présents (huile/noix/avocat)"
    : f >= 50 ? "lipides modérés (huile + quelques noix)"
    : "lipides bas, attention satiété";

  return {
    proteinMeals,
    carbMeals,
    fatMeals,
    veg,
    rules: { proteinRule, carbRule, fatRule },
  };
}

export default async function PremiumPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const cookieStore = await cookies();
  const isPremium = cookieStore.get("wc_premium")?.value === "1";

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
      width: "min(1020px, 94vw)",
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
    note: { opacity: 0.88, fontSize: 13, lineHeight: 1.45 } as const,
    hr: {
      height: 1,
      background: "rgba(255,255,255,.10)",
      border: "none",
      margin: "14px 0",
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
      fontWeight: 800,
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
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(139,92,246,.25)",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    } as const,
    pillRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 } as const,
    pill: {
      borderRadius: 999,
      padding: "8px 10px",
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      fontSize: 13,
      fontWeight: 800,
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
    cardTitle: { opacity: 0.8, fontSize: 12, fontWeight: 900 } as const,
    cardBig: { fontSize: 26, fontWeight: 950, marginTop: 6 } as const,
    cardSmall: { opacity: 0.75, fontSize: 12, marginTop: 4 } as const,

    section: {
      marginTop: 14,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.05)",
      padding: 16,
    } as const,
    sectionTitle: { fontWeight: 950, fontSize: 16, marginBottom: 10 } as const,

    planGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 } as const,
    planCard: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(0,0,0,.18)",
      padding: 14,
    } as const,
    planHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 } as const,
    planName: { fontSize: 14, fontWeight: 950 } as const,
    chip: {
      borderRadius: 999,
      padding: "6px 10px",
      border: "1px solid rgba(34,197,94,.35)",
      background: "rgba(34,197,94,.12)",
      color: "#bbf7d0",
      fontSize: 12,
      fontWeight: 900,
      whiteSpace: "nowrap",
    } as const,
    list: { margin: "8px 0 0 18px", opacity: 0.92, lineHeight: 1.5 } as const,

    compareWrap: {
      marginTop: 12,
      borderRadius: 16,
      border: "1px solid rgba(34,197,94,.28)",
      background: "linear-gradient(180deg, rgba(34,197,94,.12), rgba(34,197,94,.06))",
      overflow: "hidden",
    } as const,
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      fontSize: 13,
    } as const,
    th: {
      textAlign: "left",
      padding: "12px 12px",
      fontSize: 12,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      opacity: 0.9,
      borderBottom: "1px solid rgba(255,255,255,.10)",
      background: "rgba(0,0,0,.18)",
    } as const,
    td: {
      padding: "12px 12px",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      verticalAlign: "top",
    } as const,
    tdLabel: { opacity: 0.9, fontWeight: 900 } as const,
    tdBig: { fontSize: 16, fontWeight: 950 } as const,
    tdMuted: { opacity: 0.8, marginTop: 4 } as const,

    colTrain: { background: "rgba(34,197,94,.10)" } as const,
    colRest: { background: "rgba(59,130,246,.08)" } as const,

    footerNote: { marginTop: 10, fontSize: 12, opacity: 0.85 } as const,

    locked: {
      marginTop: 14,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      padding: 16,
    } as const,
  };

  if (!isPremium) {
    return (
      <main style={S.page}>
        <div style={S.shell}>
          <div style={S.topRow}>
            <div>
              <div style={S.title}>WeightCalc</div>
              <div style={S.sub}>Espace Premium</div>
            </div>
            <div
              style={{
                ...S.badge,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(255,255,255,.08)",
                color: "#fff",
              }}
            >
              🔒 Verrouillé
            </div>
          </div>

          <div style={S.locked}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 8 }}>
              Accès Premium requis
            </div>
            <div style={S.note}>
              Tu n’as pas encore activé Premium sur ce navigateur.
              <br />
              Reviens à l’accueil et débloque Premium, ou utilise ton lien reçu par email.
            </div>

            <div style={S.btnRow}>
              <a href="/" style={S.btnPrimary}>
                Retour à l’accueil
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Inputs
  const sex = param(sp, "sex", "male");
  const goal = param(sp, "goal", "cut"); // cut | maintain | bulk
  const activity = param(sp, "activity", "moderate");

  const age = clamp(toNum(param(sp, "age", "28"), 28), 12, 90);
  const height = clamp(toNum(param(sp, "height", "175"), 175), 120, 230);
  const weight = clamp(toNum(param(sp, "weight", "75"), 75), 30, 250);

  const targetWeightRaw = param(sp, "targetWeight", "");
  const targetWeight = targetWeightRaw ? toNum(targetWeightRaw, NaN) : NaN;

  // Calculs
  const bmr =
    sex === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const activityFactor = activity === "low" ? 1.35 : activity === "high" ? 1.7 : 1.55;
  const tdee = bmr * activityFactor;

  const goalDelta = goal === "cut" ? -450 : goal === "bulk" ? +250 : 0;
  const standardKcal = Math.max(1200, round(tdee + goalDelta));

  const protein = round(weight * (goal === "cut" ? 2.0 : 1.8));
  const fat = round(weight * (goal === "cut" ? 0.8 : 0.9));
  const carbs = Math.max(0, round((standardKcal - protein * 4 - fat * 9) / 4));

  const train = { p: protein, c: round(carbs * 1.15), f: round(fat * 0.85) };
  const rest = { p: protein, c: round(carbs * 0.85), f: round(fat * 1.15) };

  const trainKcal = round(train.p * 4 + train.c * 4 + train.f * 9);
  const restKcal = round(rest.p * 4 + rest.c * 4 + rest.f * 9);

  const mealsStandard = mealSplit(standardKcal);
  const mealsTrain = mealSplit(trainKcal);
  const mealsRest = mealSplit(restKcal);

  // Temps cible
  let weeks: number | null = null;
  if (Number.isFinite(targetWeight)) {
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
  const months = weeks !== null ? Math.round((weeks / 4.345) * 10) / 10 : null;

  // Labels user-friendly
  const goalLabel =
    goal === "cut" ? "Perte de poids" : goal === "bulk" ? "Prise de masse" : "Maintien";
  const activityLabel =
    activity === "low" ? "Faible" : activity === "high" ? "Élevée" : "Modérée (3–5x/sem)";

  const split = weeklySplit(activity);
  const foodsStd = foodSuggestions(protein, carbs, fat);
  const foodsTrain = foodSuggestions(train.p, train.c, train.f);
  const foodsRest = foodSuggestions(rest.p, rest.c, rest.f);

  const money = "4,99€";

  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>Programme Premium ✅ — {goalLabel} · Activité {activityLabel}</div>
          </div>
          <div style={S.badge}>✅ Premium</div>
        </div>

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
              placeholder="Poids objectif (kg)"
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

        <div style={S.pillRow}>
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
            Calories cible ≈ {standardKcal} kcal
          </div>
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

        {/* PLAN RECOMMANDÉ */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Plan recommandé (simple & efficace)</div>

          <div style={S.planGrid}>
            <div style={S.planCard}>
              <div style={S.planHead}>
                <div style={S.planName}>Semaine type</div>
                <div style={S.chip}>
                  {split.trainDays} jours sport · {split.restDays} repos
                </div>
              </div>
              <ul style={S.list}>
                <li>{split.note}</li>
                <li>Objectif : {goalLabel}</li>
                <li>Protéines stables chaque jour</li>
                <li>Glucides ↑ les jours sport, ↓ les jours repos</li>
              </ul>
            </div>

            <div style={S.planCard}>
              <div style={S.planHead}>
                <div style={S.planName}>Aliments “healthy” (repères)</div>
                <div style={S.chip}>Plan {money}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 900, opacity: 0.92 }}>Règles rapides</div>
                <ul style={S.list}>
                  <li>{foodsStd.rules.proteinRule}</li>
                  <li>{foodsStd.rules.carbRule}</li>
                  <li>{foodsStd.rules.fatRule}</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={S.planCard}>
              <div style={{ fontWeight: 950, marginBottom: 6 }}>Protéines</div>
              <ul style={S.list}>
                {foodsStd.proteinMeals.map((x) => (
                  <li key={x.name}>
                    {x.name} — <b>{x.qty}</b>
                  </li>
                ))}
              </ul>
            </div>

            <div style={S.planCard}>
              <div style={{ fontWeight: 950, marginBottom: 6 }}>Glucides</div>
              <ul style={S.list}>
                {foodsStd.carbMeals.map((x) => (
                  <li key={x.name}>
                    {x.name} — <b>{x.qty}</b>
                  </li>
                ))}
              </ul>
            </div>

            <div style={S.planCard}>
              <div style={{ fontWeight: 950, marginBottom: 6 }}>Lipides & micronutriments</div>
              <ul style={S.list}>
                {foodsStd.fatMeals.map((x) => (
                  <li key={x.name}>
                    {x.name} — <b>{x.qty}</b>
                  </li>
                ))}
                <li>
                  Légumes — <b>500–800g/j</b>
                </li>
                <li>
                  Fruits — <b>2–3/j</b>
                </li>
              </ul>
            </div>
          </div>

          {/* COMPARATEUR */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 950, fontSize: 15 }}>Comparateur (lisible)</div>
            <div style={S.compareWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: "28%" }}>Élément</th>
                    <th style={S.th}>Jour “cible”</th>
                    <th style={{ ...S.th, ...S.colTrain }}>Jour entraînement</th>
                    <th style={{ ...S.th, ...S.colRest }}>Jour repos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={S.td}>
                      <div style={S.tdLabel}>Calories / jour</div>
                      <div style={S.tdMuted}>total</div>
                    </td>
                    <td style={S.td}>
                      <div style={S.tdBig}>{standardKcal} kcal</div>
                    </td>
                    <td style={{ ...S.td, ...S.colTrain }}>
                      <div style={S.tdBig}>{trainKcal} kcal</div>
                      <div style={S.tdMuted}>+ glucides, lipides un peu plus bas</div>
                    </td>
                    <td style={{ ...S.td, ...S.colRest }}>
                      <div style={S.tdBig}>{restKcal} kcal</div>
                      <div style={S.tdMuted}>- glucides, lipides un peu plus hauts</div>
                    </td>
                  </tr>

                  <tr>
                    <td style={S.td}>
                      <div style={S.tdLabel}>Macros</div>
                      <div style={S.tdMuted}>P / C / L</div>
                    </td>
                    <td style={S.td}>
                      <div>
                        <b>P</b> {protein}g · <b>C</b> {carbs}g · <b>L</b> {fat}g
                      </div>
                    </td>
                    <td style={{ ...S.td, ...S.colTrain }}>
                      <div>
                        <b>P</b> {train.p}g · <b>C</b> {train.c}g · <b>L</b> {train.f}g
                      </div>
                    </td>
                    <td style={{ ...S.td, ...S.colRest }}>
                      <div>
                        <b>P</b> {rest.p}g · <b>C</b> {rest.c}g · <b>L</b> {rest.f}g
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style={S.td}>
                      <div style={S.tdLabel}>Répartition repas</div>
                      <div style={S.tdMuted}>Petit-déj / Déj / Goûter / Dîner</div>
                    </td>
                    <td style={S.td}>
                      <div>
                        {mealsStandard.map((m, i) => (
                          <span key={m.label}>
                            {m.kcal} <span style={{ opacity: 0.8 }}>{m.label}</span>
                            {i < mealsStandard.length - 1 ? " · " : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...S.td, ...S.colTrain }}>
                      <div>
                        {mealsTrain.map((m, i) => (
                          <span key={m.label}>
                            {m.kcal} <span style={{ opacity: 0.8 }}>{m.label}</span>
                            {i < mealsTrain.length - 1 ? " · " : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...S.td, ...S.colRest }}>
                      <div>
                        {mealsRest.map((m, i) => (
                          <span key={m.label}>
                            {m.kcal} <span style={{ opacity: 0.8 }}>{m.label}</span>
                            {i < mealsRest.length - 1 ? " · " : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style={S.td}>
                      <div style={S.tdLabel}>Exemples aliments</div>
                      <div style={S.tdMuted}>repères simples</div>
                    </td>
                    <td style={S.td}>
                      <div style={{ opacity: 0.92 }}>
                        <b>Protéines</b> : {foodsStd.proteinMeals[0].name}, {foodsStd.proteinMeals[1].name}
                        <br />
                        <b>Glucides</b> : {foodsStd.carbMeals[0].name}, {foodsStd.carbMeals[2].name}
                        <br />
                        <b>Lipides</b> : {foodsStd.fatMeals[0].name}, {foodsStd.fatMeals[2].name}
                        <br />
                        <b>Légumes</b> : 500–800g/j
                      </div>
                    </td>
                    <td style={{ ...S.td, ...S.colTrain }}>
                      <div style={{ opacity: 0.92 }}>
                        <b>Plus de</b> : riz/pdt/avoine + fruits
                        <br />
                        <b>Protéines</b> stables
                        <br />
                        <b>Lipides</b> un peu plus bas
                      </div>
                    </td>
                    <td style={{ ...S.td, ...S.colRest }}>
                      <div style={{ opacity: 0.92 }}>
                        <b>Moins de</b> : riz/pâtes
                        <br />
                        <b>Plus de</b> : huile d’olive / avocat / noix
                        <br />
                        <b>Légumes</b> +++
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={S.footerNote}>
              Conseil : garde les protéines stables, ajuste surtout les glucides entre entraînement/repos. Marche 20–30 min
              les jours repos = top.
            </div>
          </div>

          <hr style={S.hr} />

          {/* TEMPS CIBLE */}
          <div style={{ fontWeight: 950, marginBottom: 6 }}>⏱️ Temps cible (estimation)</div>
          {!Number.isFinite(targetWeight) ? (
            <div style={S.note}>Renseigne ton poids objectif puis clique sur “Calculer”.</div>
          ) : weeks === null ? (
            <div style={S.note}>Objectif incohérent (ex: perte de poids mais objectif plus haut).</div>
          ) : weeks === 0 ? (
            <div style={S.note}>Objectif “Maintien” : durée non applicable (tu stabilises).</div>
          ) : (
            <div style={S.note}>
              Temps cible estimé : <b>{weeks} semaines</b> (≈ {months} mois)
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <a href="/" style={S.btn}>
            ← Retour accueil
          </a>
          <a href="/success" style={{ ...S.btn, opacity: 0.9 }}>
            Page success
          </a>
        </div>
      </div>
    </main>
  );
}
