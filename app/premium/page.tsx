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

  // Si pas premium => renvoie sur home (free)
  if (!isPremium) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background:
            "radial-gradient(900px 420px at 12% 12%, rgba(139,92,246,.35), transparent 65%), radial-gradient(900px 420px at 85% 30%, rgba(16,185,129,.18), transparent 60%), #07080d",
          color: "#e8e8f0",
        }}
      >
        <div
          style={{
            width: "min(820px, 94vw)",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.06)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 20px 60px rgba(0,0,0,.35)",
            padding: 18,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 950 }}>Premium requis 🔒</div>
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            Tu n’as pas encore accès au programme premium.
          </div>
          <div style={{ marginTop: 14 }}>
            <a href="/" style={{ color: "#bbf7d0", fontWeight: 900 }}>
              ← Revenir à la version gratuite
            </a>
          </div>
        </div>
      </main>
    );
  }

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

  const activityFactor =
    activity === "low" ? 1.35 : activity === "high" ? 1.7 : 1.55;

  const tdee = bmr * activityFactor;

  const goalDelta = goal === "cut" ? -450 : goal === "bulk" ? +250 : 0;
  const kcalStandard = Math.max(1200, round(tdee + goalDelta));

  const protein = round(weight * (goal === "cut" ? 2.0 : 1.8));
  const fat = round(weight * (goal === "cut" ? 0.8 : 0.9));
  const carbs = Math.max(0, round((kcalStandard - protein * 4 - fat * 9) / 4));

  // Training / Rest
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

  const kcalTrain = round(train.p * 4 + train.c * 4 + train.f * 9);
  const kcalRest = round(rest.p * 4 + rest.c * 4 + rest.f * 9);

  const mealsStandard = mealSplit(kcalStandard);
  const mealsTrain = mealSplit(kcalTrain);
  const mealsRest = mealSplit(kcalRest);

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

  // Suggestion de plan (simple + lisible)
  const trainingDays =
    activity === "low" ? 3 : activity === "high" ? 5 : 4;
  const restDays = 7 - trainingDays;

  const goalLabel =
    goal === "cut"
      ? "Perte de poids"
      : goal === "bulk"
      ? "Prise de masse"
      : "Maintien";

  const activityLabel =
    activity === "low"
      ? "Faible"
      : activity === "high"
      ? "Élevé"
      : "Modéré (3–5x/sem)";

  // ===== Styles (luxueux + comparateur)
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

    // Form
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
    } as const,

    // Cards
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
    note: { opacity: 0.85, fontSize: 13, lineHeight: 1.35 } as const,
    hr: {
      height: 1,
      background: "rgba(255,255,255,.10)",
      border: "none",
      margin: "14px 0",
    } as const,

    // Premium sections
    section: {
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.16)",
      padding: 14,
      marginTop: 12,
    } as const,
    sectionTitle: {
      fontWeight: 950,
      fontSize: 14,
      letterSpacing: 0.2,
      opacity: 0.95,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    } as const,
    chip: {
      borderRadius: 999,
      padding: "7px 10px",
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      color: "#fff",
      whiteSpace: "nowrap",
    } as const,

    // Comparateur (table)
    tableWrap: {
      marginTop: 12,
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.18)",
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
      borderBottom: "1px solid rgba(255,255,255,.10)",
      background: "rgba(255,255,255,.06)",
      fontWeight: 950,
    } as const,
    td: {
      padding: "12px 12px",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      verticalAlign: "top",
    } as const,
    leftCol: {
      width: "28%",
      opacity: 0.85,
      fontWeight: 900,
    } as const,
    colStandard: {
      background:
        "linear-gradient(180deg, rgba(139,92,246,.10), rgba(0,0,0,0))",
    } as const,
    colTrain: {
      background:
        "linear-gradient(180deg, rgba(34,197,94,.12), rgba(0,0,0,0))",
    } as const,
    colRest: {
      background:
        "linear-gradient(180deg, rgba(96,165,250,.12), rgba(0,0,0,0))",
    } as const,
    subLine: { opacity: 0.85, marginTop: 4 } as const,

    // Food grid
    foodGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 10,
      marginTop: 10,
    } as const,
    foodCard: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.05)",
      padding: 12,
    } as const,
    foodTitle: { fontSize: 12, fontWeight: 950, opacity: 0.9 } as const,
    foodText: { marginTop: 6, fontSize: 12, opacity: 0.85, lineHeight: 1.4 } as const,
  };

  const MacroRow = ({
    label,
    s,
    t,
    r,
  }: {
    label: string;
    s: string;
    t: string;
    r: string;
  }) => (
    <tr>
      <td style={{ ...S.td, ...S.leftCol }}>{label}</td>
      <td style={{ ...S.td, ...S.colStandard }}>{s}</td>
      <td style={{ ...S.td, ...S.colTrain }}>{t}</td>
      <td style={{ ...S.td, ...S.colRest }}>{r}</td>
    </tr>
  );

  const mealsToText = (m: { label: string; kcal: number }[]) =>
    m.map((x) => `${x.label}: ${x.kcal} kcal`).join(" • ");

  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>Programme Premium — comparateur ultra lisible ✅</div>
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
              <option value="moderate">Modéré (3–5x/sem)</option>
              <option value="high">Élevé</option>
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
            <a href="/premium" style={{ textDecoration: "none" }}>
              <button type="button" style={S.btn}>
                Réinitialiser
              </button>
            </a>
            <button type="submit" style={S.btnPrimary}>
              Calculer
            </button>
          </div>
        </form>

        {/* ===== Résumé métabolisme */}
        <div style={S.pills}>
          <div style={S.pill}>BMR ≈ {round(bmr)} kcal</div>
          <div style={S.pill}>TDEE ≈ {round(tdee)} kcal</div>
          <div style={{ ...S.pill, border: "1px solid rgba(34,197,94,.40)", background: "rgba(34,197,94,.12)", color: "#bbf7d0" }}>
            Calories base ≈ {kcalStandard} kcal
          </div>
          <div style={{ ...S.pill, opacity: 0.9 }}>
            Objectif : <b>{goalLabel}</b> • Activité : <b>{activityLabel}</b>
          </div>
        </div>

        <div style={S.note}>
          On garde les <b>protéines</b> stables, on module <b>glucides</b> & <b>lipides</b> entre jour entraînement et jour repos.
        </div>

        <hr style={S.hr} />

        {/* ===== Suggestion plan */}
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <span>🎯 Suggestion de plan (simple & efficace)</span>
            <span style={S.chip}>
              {trainingDays} jours sport • {restDays} jours repos
            </span>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ ...S.foodCard, borderColor: "rgba(34,197,94,.28)" }}>
              <div style={S.foodTitle}>Protéines (lean)</div>
              <div style={S.foodText}>
                Poulet, dinde, œufs, thon, saumon, skyr, fromage blanc 0–3%, tofu.
                <br />
                <b>Astuce</b> : vise 25–40g de protéines par repas.
              </div>
            </div>

            <div style={{ ...S.foodCard, borderColor: "rgba(139,92,246,.28)" }}>
              <div style={S.foodTitle}>Glucides (énergie clean)</div>
              <div style={S.foodText}>
                Riz basmati, avoine, quinoa, patate douce, pâtes complètes, légumineuses.
                <br />
                Fruits : banane, fruits rouges, kiwi (top avant/après sport).
              </div>
            </div>

            <div style={{ ...S.foodCard, borderColor: "rgba(96,165,250,.28)" }}>
              <div style={S.foodTitle}>Lipides (bons gras)</div>
              <div style={S.foodText}>
                Huile d’olive, avocat, amandes/noix, beurre de cacahuète (dose), sardines.
                <br />
                <b>Règle</b> : lipides un peu + hauts les jours repos.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, ...S.note }}>
            <b>Structure journée “healthy” (simple)</b> : 1 source protéine + 1 source glucide + beaucoup de légumes,
            + 1 petite source de bons gras. Hydratation + sel (surtout entraînement).
          </div>
        </div>

        {/* ===== Comparateur */}
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <span>📊 Comparateur — Standard vs Entraînement vs Repos</span>
            <span style={S.chip}>Lisible en 10 secondes</span>
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
                <MacroRow
                  label="Calories / jour"
                  s={`${kcalStandard} kcal`}
                  t={`${kcalTrain} kcal`}
                  r={`${kcalRest} kcal`}
                />
                <MacroRow
                  label="Protéines"
                  s={`${protein} g`}
                  t={`${train.p} g`}
                  r={`${rest.p} g`}
                />
                <MacroRow
                  label="Glucides"
                  s={`${carbs} g`}
                  t={`${train.c} g`}
                  r={`${rest.c} g`}
                />
                <MacroRow
                  label="Lipides"
                  s={`${fat} g`}
                  t={`${train.f} g`}
                  r={`${rest.f} g`}
                />
                <MacroRow
                  label="Répartition repas"
                  s={mealsToText(mealsStandard)}
                  t={mealsToText(mealsTrain)}
                  r={mealsToText(mealsRest)}
                />
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, ...S.note }}>
            <b>Lecture rapide :</b> les jours entraînement, tu montes surtout les glucides (carburant),
            et tu baisses un peu les lipides. Les jours repos, tu fais l’inverse.
          </div>
        </div>

        {/* ===== Temps cible */}
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <span>⏱️ Temps cible (estimation)</span>
            <span style={S.chip}>basé sur ton poids objectif</span>
          </div>

          {!Number.isFinite(targetWeight) ? (
            <div style={{ marginTop: 10, ...S.note }}>
              Renseigne ton <b>poids objectif</b> puis clique sur <b>Calculer</b>.
            </div>
          ) : weeks === null ? (
            <div style={{ marginTop: 10, ...S.note }}>
              Objectif incohérent avec le mode choisi (ex: Perte de poids mais objectif plus haut).
            </div>
          ) : weeks === 0 ? (
            <div style={{ marginTop: 10, ...S.note }}>
              Objectif “Maintien” : durée non applicable (tu stabilises).
            </div>
          ) : (
            <div style={{ marginTop: 10, ...S.note }}>
              Temps cible estimé : <b>{weeks} semaines</b> (≈ {months} mois)
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Conseil : vise une progression régulière, sommeil + hydratation + constance.
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, opacity: 0.85, fontSize: 12 }}>
          Premium activé ✅ • <a href="/" style={{ color: "#bbf7d0", fontWeight: 900 }}>Retour au home</a>
        </div>
      </div>
    </main>
  );
}
