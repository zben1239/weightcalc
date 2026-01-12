// app/premium/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

function activityPlan(activity: string) {
  // suggestion simple lisible
  if (activity === "low") return { trainDays: 3, restDays: 4, label: "3 séances / semaine" };
  if (activity === "high") return { trainDays: 5, restDays: 2, label: "5 séances / semaine" };
  return { trainDays: 4, restDays: 3, label: "4 séances / semaine" }; // moderate
}

function foodGuide(goal: string) {
  // guide “healthy” simple, non médical
  const protein = [
    "Poulet / dinde",
    "Poisson blanc (cabillaud) / saumon",
    "Œufs",
    "Skyr / fromage blanc",
    "Lentilles / pois chiches",
  ];
  const carbsCut = ["Riz basmati", "Flocons d’avoine", "Patate douce", "Quinoa", "Fruits (banane, fruits rouges)"];
  const carbsBulk = ["Riz / pâtes complètes", "Avoine", "Pain complet", "Pommes de terre", "Fruits"];
  const fats = ["Huile d’olive", "Avocat", "Amandes/noix", "Beurre de cacahuète", "Graines (chia/lin)"];
  const veg = ["Légumes verts à volonté (brocoli, courgette, haricots)", "Salades", "Tomates", "Concombre", "Poivrons"];

  const carbs = goal === "bulk" ? carbsBulk : carbsCut;
  return { protein, carbs, fats, veg };
}

export default async function PremiumPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const cookieStore = await cookies();
  const isPremium = cookieStore.get("wc_premium")?.value === "1";

  // Sécurité : si pas premium -> retour vers flow unlock
  if (!isPremium) redirect("/?view=unlock");

  // ===== Inputs (par défaut)
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
  const calories = Math.max(1200, round(tdee + goalDelta));

  const protein = round(weight * (goal === "cut" ? 2.0 : 1.8));
  const fat = round(weight * (goal === "cut" ? 0.8 : 0.9));
  const carbs = Math.max(0, round((calories - protein * 4 - fat * 9) / 4));

  const standard = { p: protein, c: carbs, f: fat };
  const standardKcal = calories;

  const train = { p: protein, c: round(carbs * 1.15), f: round(fat * 0.85) };
  const rest = { p: protein, c: round(carbs * 0.85), f: round(fat * 1.15) };

  const trainKcal = round(train.p * 4 + train.c * 4 + train.f * 9);
  const restKcal = round(rest.p * 4 + rest.c * 4 + rest.f * 9);

  const meals = [
    { label: "Petit-déj", pct: 0.25 },
    { label: "Déjeuner", pct: 0.30 },
    { label: "Goûter", pct: 0.25 },
    { label: "Dîner", pct: 0.20 },
  ];

  const mealKcalsStandard = meals.map((m) => ({ ...m, kcal: round(standardKcal * m.pct) }));
  const mealKcalsTrain = meals.map((m) => ({ ...m, kcal: round(trainKcal * m.pct) }));
  const mealKcalsRest = meals.map((m) => ({ ...m, kcal: round(restKcal * m.pct) }));

  // Temps cible (Premium)
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

  const plan = activityPlan(activity);
  const foods = foodGuide(goal);

  // ===== Styles “luxueux”
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
      width: "min(1100px, 94vw)",
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
    title: { fontSize: 30, fontWeight: 950, letterSpacing: -0.5 } as const,
    sub: { opacity: 0.82, marginTop: 4 } as const,
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
    } as const,

    hr: { height: 1, background: "rgba(255,255,255,.10)", border: "none", margin: "14px 0" } as const,
    note: { opacity: 0.88, fontSize: 13, lineHeight: 1.4 } as const,

    card: {
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.05)",
      padding: 14,
    } as const,

    sectionTitle: { fontWeight: 950, fontSize: 16, marginBottom: 10 } as const,

    // “Table”
    tableWrap: {
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.14)",
      overflow: "hidden",
    } as const,
    tHead: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
      gap: 1,
      background: "rgba(255,255,255,.08)",
    } as const,
    tRow: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
      gap: 1,
      background: "rgba(255,255,255,.08)",
    } as const,
    cell: {
      padding: 12,
      background: "rgba(255,255,255,.05)",
    } as const,
    th: { fontSize: 12, fontWeight: 950, opacity: 0.9, textTransform: "uppercase", letterSpacing: 0.8 } as const,
    label: { fontSize: 12, fontWeight: 950, opacity: 0.85 } as const,
    big: { fontSize: 18, fontWeight: 950, marginTop: 4 } as const,
    small: { fontSize: 12, opacity: 0.75, marginTop: 2 } as const,

    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      fontSize: 12,
      fontWeight: 900,
      opacity: 0.92,
      whiteSpace: "nowrap",
    } as const,

    colStd: { border: "1px solid rgba(139,92,246,.45)", background: "rgba(139,92,246,.10)" } as const,
    colTrain: { border: "1px solid rgba(34,197,94,.45)", background: "rgba(34,197,94,.10)" } as const,
    colRest: { border: "1px solid rgba(59,130,246,.45)", background: "rgba(59,130,246,.10)" } as const,
  };

  const goalLabel = goal === "cut" ? "Perte de poids" : goal === "bulk" ? "Prise de masse" : "Maintien";
  const activityLabel = activity === "low" ? "Faible" : activity === "high" ? "Élevée" : "Modérée";

  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>Programme Premium — lisible, comparatif, et actionnable ✅</div>
          </div>
          <div style={S.badge}>✅ Premium</div>
        </div>

        {/* FORM */}
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
              placeholder="Poids objectif (kg) — pour le temps cible"
            />
          </div>

          <div style={S.btnRow}>
            <a href="/" style={S.btn}>
              Retour Home
            </a>
            <button type="submit" style={S.btnPrimary}>
              Mettre à jour
            </button>
          </div>
        </form>

        <hr style={S.hr} />

        {/* Résumé rapide */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={S.pill}>🎯 Objectif : {goalLabel}</div>
          <div style={S.pill}>🏃 Activité : {activityLabel}</div>
          <div style={S.pill}>🔥 Calories (standard) : {standardKcal} kcal</div>
          <div style={S.pill}>⚡ Entraînement : {trainKcal} kcal</div>
          <div style={S.pill}>🧘 Repos : {restKcal} kcal</div>
        </div>

        {/* Plan recommandé + aliments */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
          <div style={S.card}>
            <div style={S.sectionTitle}>📆 Plan recommandé (simple et réaliste)</div>
            <div style={S.note}>
              Sur la base de ton activité : <b>{plan.label}</b>
              <br />
              • <b>{plan.trainDays}</b> jours entraînement / semaine
              <br />
              • <b>{plan.restDays}</b> jours repos / semaine
              <br />
              <span style={{ opacity: 0.8 }}>
                Astuce : mets les jours “entraînement” les jours où tu bouges le plus (séance + marche).
              </span>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>🥗 Aliments conseillés (healthy & connus)</div>
            <div style={S.note}>
              <b>Protéines</b> : {foods.protein.slice(0, 4).join(" · ")}
              <br />
              <b>Glucides</b> : {foods.carbs.slice(0, 4).join(" · ")}
              <br />
              <b>Lipides</b> : {foods.fats.slice(0, 4).join(" · ")}
              <br />
              <b>Légumes</b> : {foods.veg.slice(0, 3).join(" · ")}
            </div>
          </div>
        </div>

        <hr style={S.hr} />

        {/* Comparateur (TABLEAU) */}
        <div style={S.card}>
          <div style={S.sectionTitle}>📊 Comparateur clair : Standard vs Entraînement vs Repos</div>

          <div style={S.tableWrap}>
            {/* Header */}
            <div style={S.tHead}>
              <div style={{ ...S.cell, background: "rgba(255,255,255,.06)" }}>
                <div style={S.th}>Élément</div>
              </div>

              <div style={{ ...S.cell, ...S.colStd }}>
                <div style={S.th}>Standard</div>
                <div style={S.small}>Jour moyen</div>
              </div>

              <div style={{ ...S.cell, ...S.colTrain }}>
                <div style={S.th}>Entraînement</div>
                <div style={S.small}>+ glucides</div>
              </div>

              <div style={{ ...S.cell, ...S.colRest }}>
                <div style={S.th}>Repos</div>
                <div style={S.small}>- glucides</div>
              </div>
            </div>

            {/* Calories */}
            <div style={S.tRow}>
              <div style={S.cell}>
                <div style={S.label}>Calories / jour</div>
              </div>
              <div style={{ ...S.cell, ...S.colStd }}>
                <div style={S.big}>{standardKcal} kcal</div>
              </div>
              <div style={{ ...S.cell, ...S.colTrain }}>
                <div style={S.big}>{trainKcal} kcal</div>
              </div>
              <div style={{ ...S.cell, ...S.colRest }}>
                <div style={S.big}>{restKcal} kcal</div>
              </div>
            </div>

            {/* Macros */}
            {[
              { k: "Protéines", s: standard.p, t: train.p, r: rest.p, mult: 4 },
              { k: "Glucides", s: standard.c, t: train.c, r: rest.c, mult: 4 },
              { k: "Lipides", s: standard.f, t: train.f, r: rest.f, mult: 9 },
            ].map((row) => (
              <div style={S.tRow} key={row.k}>
                <div style={S.cell}>
                  <div style={S.label}>{row.k}</div>
                </div>
                <div style={{ ...S.cell, ...S.colStd }}>
                  <div style={S.big}>{row.s} g</div>
                  <div style={S.small}>≈ {row.s * row.mult} kcal</div>
                </div>
                <div style={{ ...S.cell, ...S.colTrain }}>
                  <div style={S.big}>{row.t} g</div>
                  <div style={S.small}>≈ {row.t * row.mult} kcal</div>
                </div>
                <div style={{ ...S.cell, ...S.colRest }}>
                  <div style={S.big}>{row.r} g</div>
                  <div style={S.small}>≈ {row.r * row.mult} kcal</div>
                </div>
              </div>
            ))}

            {/* Repas */}
            <div style={S.tRow}>
              <div style={S.cell}>
                <div style={S.label}>Répartition calories / repas</div>
                <div style={S.small}>4 repas (25/30/25/20)</div>
              </div>

              <div style={{ ...S.cell, ...S.colStd }}>
                {mealKcalsStandard.map((m) => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                    <span style={{ opacity: 0.85, fontSize: 12, fontWeight: 800 }}>{m.label}</span>
                    <span style={{ fontWeight: 950 }}>{m.kcal} kcal</span>
                  </div>
                ))}
              </div>

              <div style={{ ...S.cell, ...S.colTrain }}>
                {mealKcalsTrain.map((m) => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                    <span style={{ opacity: 0.85, fontSize: 12, fontWeight: 800 }}>{m.label}</span>
                    <span style={{ fontWeight: 950 }}>{m.kcal} kcal</span>
                  </div>
                ))}
              </div>

              <div style={{ ...S.cell, ...S.colRest }}>
                {mealKcalsRest.map((m) => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                    <span style={{ opacity: 0.85, fontSize: 12, fontWeight: 800 }}>{m.label}</span>
                    <span style={{ fontWeight: 950 }}>{m.kcal} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, ...S.note }}>
            Lecture rapide : <b>Protéines stables</b>, glucides ↑ en entraînement, lipides ↑ en repos.
          </div>
        </div>

        {/* Temps cible */}
        <div style={{ marginTop: 12, ...S.card }}>
          <div style={S.sectionTitle}>⏱️ Temps cible (estimation)</div>

          {!Number.isFinite(targetWeight) ? (
            <div style={S.note}>Renseigne ton poids objectif puis clique sur “Mettre à jour”.</div>
          ) : weeks === null ? (
            <div style={S.note}>Objectif incohérent avec le mode choisi (ex: perte de poids mais objectif plus haut).</div>
          ) : weeks === 0 ? (
            <div style={S.note}>Mode “Maintien” : durée non applicable (stabilisation).</div>
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

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82 }}>
            Conseil : garde les protéines stables, ajuste glucides/lipides selon entraînement/repos, et vise des aliments simples.
          </div>
        </div>
      </div>
    </main>
  );
}
