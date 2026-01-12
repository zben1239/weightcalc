// app/page.tsx
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

function fmtWeeksMonths(weeks: number) {
  const months = Math.round((weeks / 4.345) * 10) / 10;
  return { weeks, months };
}

function qs(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const cookieStore = await cookies();

  const isPremium = cookieStore.get("wc_premium")?.value === "1";

  // mini “routing” via query (pour la page email avant stripe)
  const view = param(sp, "view", "home"); // home | unlock

  // ===== Inputs defaults
  const sex = param(sp, "sex", "male"); // male | female
  const goal = param(sp, "goal", "cut"); // cut | maintain | bulk
  const activity = param(sp, "activity", "moderate"); // low | moderate | high

  const age = clamp(toNum(param(sp, "age", "28"), 28), 12, 90);
  const height = clamp(toNum(param(sp, "height", "175"), 175), 120, 230);
  const weight = clamp(toNum(param(sp, "weight", "75"), 75), 30, 250);

  const targetWeightRaw = param(sp, "targetWeight", "");
  const targetWeight = targetWeightRaw ? toNum(targetWeightRaw, NaN) : NaN;

  // email for unlock page
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

  // Standard / Training / Rest macros
  const standard = { p: protein, c: carbs, f: fat };
  const standardKcal = calories;

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
    kcal: round(standardKcal * m.pct),
  }));
  const mealKcalsTrain = meals.map((m) => ({
    ...m,
    kcal: round(trainKcal * m.pct),
  }));
  const mealKcalsRest = meals.map((m) => ({
    ...m,
    kcal: round(restKcal * m.pct),
  }));

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
      width: "min(980px, 94vw)",
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
      fontWeight: 800,
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
      fontWeight: 800,
      cursor: "pointer",
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
    premiumBox: {
      marginTop: 14,
      borderRadius: 14,
      border: "1px solid rgba(34,197,94,.35)",
      background: "rgba(34,197,94,.12)",
      padding: 16,
    } as const,
    premiumTitle: { fontWeight: 950, fontSize: 16, marginBottom: 8 } as const,
    note: { opacity: 0.85, fontSize: 13, lineHeight: 1.35 } as const,
    mealGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 10,
      marginTop: 10,
    } as const,
    mealCard: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(0,0,0,.16)",
      padding: 10,
    } as const,
    mealLabel: { opacity: 0.85, fontSize: 12, fontWeight: 900 } as const,
    mealKcal: { fontSize: 18, fontWeight: 950, marginTop: 4 } as const,
    hr: {
      height: 1,
      background: "rgba(255,255,255,.10)",
      border: "none",
      margin: "12px 0",
    } as const,
    // Free premium blur card
    blurWrap: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 14,
      border: "1px solid rgba(34,197,94,.35)",
      background: "rgba(34,197,94,.12)",
      padding: 16,
      marginTop: 14,
    } as const,
    blurLayer: {
      filter: "blur(10px)",
      opacity: 0.9,
      pointerEvents: "none",
      userSelect: "none",
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
    miniTag: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(0,0,0,.22)",
      opacity: 0.9,
    } as const,
    link: { color: "#bbf7d0", fontWeight: 900, textDecoration: "none" } as const,
  };

  // ===== Link vers la page "unlock" en conservant les inputs
  const unlockHref = `/${qs({
    view: "unlock",
    sex,
    goal,
    activity,
    age: String(age),
    height: String(height),
    weight: String(weight),
    targetWeight: targetWeightRaw,
  })}`;

  // ===== FORM (home) : stable, calcul en GET
  const CalcForm = (
    <form method="get" action="/">
      <div style={S.grid}>
        <select name="sex" defaultValue={sex} style={S.field}>
          <option value="male">Homme</option>
          <option value="female">Femme</option>
        </select>

        <select name="goal" defaultValue={goal} style={S.field}>
          {/* ✅ changé : “Sèche” -> “Perte de poids” */}
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

        <input
          name="height"
          type="number"
          defaultValue={height}
          style={S.field}
          placeholder="Taille (cm)"
        />

        <input
          name="weight"
          type="number"
          defaultValue={weight}
          style={S.field}
          placeholder="Poids (kg)"
        />

        <input
          name="targetWeight"
          defaultValue={targetWeightRaw}
          style={{ ...S.field, gridColumn: "span 2" }}
          placeholder="Poids objectif (kg) — Premium"
        />
      </div>

      <div style={S.btnRow}>
        <a href="/" style={{ textDecoration: "none" }}>
          <button type="button" style={S.btn}>
            Réinitialiser
          </button>
        </a>

        <button type="submit" style={S.btnPrimary}>
          Calculer
        </button>
      </div>
    </form>
  );

  // ===== Résultats (cards)
  const Results = (
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
      </div>

      <div style={S.note}>
        • <b>BMR</b> = calories au repos (énergie minimale sans activité). <br />
        • <b>TDEE</b> = calories pour maintenir ton poids avec ton activité (BMR + activité).
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

  // ===== Unlock page (email + bouton prix)
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
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.05)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 8 }}>
              📩 Entre ton email pour recevoir l’accès Premium
            </div>
            <div style={S.note}>
              Après paiement, tu recevras un email avec ton lien Premium (valide 30 jours).
            </div>

            <div style={{ marginTop: 12 }}>
              <form action="/api/create-checkout" method="post">
                {/* email */}
                <input
                  name="email"
                  type="email"
                  defaultValue={emailPrefill}
                  required
                  style={S.field}
                  placeholder="ton.email@gmail.com"
                />

                {/* ✅ on garde aussi les inputs dans le POST (utile si ton endpoint veut les relire plus tard) */}
                <input type="hidden" name="sex" value={sex} />
                <input type="hidden" name="goal" value={goal} />
                <input type="hidden" name="activity" value={activity} />
                <input type="hidden" name="age" value={String(age)} />
                <input type="hidden" name="height" value={String(height)} />
                <input type="hidden" name="weight" value={String(weight)} />
                <input type="hidden" name="targetWeight" value={targetWeightRaw} />

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <a href={`/${qs({ sex, goal, activity, age: String(age), height: String(height), weight: String(weight), targetWeight: targetWeightRaw })}`} style={{ textDecoration: "none" }}>
                    <button type="button" style={S.btn}>
                      Retour
                    </button>
                  </a>

                  <button type="submit" style={S.btnPrimary}>
                    Débloquer Premium — 4,99€
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12 }}>
            Après l’email reçu : clique sur le lien → cookie Premium activé → accès complet.
          </div>
        </div>
      </main>
    );
  }

  // ===== Home
  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>
              Calcule ton plan simplement.{" "}
              {isPremium ? "Premium activé ✅" : "Version gratuite"}
            </div>
          </div>

          <div style={S.badge}>{isPremium ? "✅ Premium" : "🔒 Free"}</div>
        </div>

        {CalcForm}
        {Results}

        {/* ===== Free VS Premium */}
        {!isPremium ? (
          <>
            <hr style={S.hr} />

            {/* Free: Premium flouté + CTA */}
            <div style={S.blurWrap}>
              <div style={S.blurLayer}>
                <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 8 }}>
                  ✅ Programme Premium (aperçu)
                </div>

                <div style={S.note}>
                  <b>Jour standard</b> : {standardKcal} kcal — P {standard.p}g · C {standard.c}g · L {standard.f}g <br />
                  <b>Jour entraînement</b> : {trainKcal} kcal — P {train.p}g · C {train.c}g · L {train.f}g <br />
                  <b>Jour repos</b> : {restKcal} kcal — P {rest.p}g · C {rest.c}g · L {rest.f}g
                </div>

                <div style={{ marginTop: 10, fontWeight: 900 }}>Répartition calories / repas</div>
                <div style={S.mealGrid}>
                  {mealKcalsStandard.map((m) => (
                    <div key={m.label} style={S.mealCard}>
                      <div style={S.mealLabel}>{m.label}</div>
                      <div style={S.mealKcal}>{m.kcal} kcal</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, fontWeight: 900 }}>Temps cible</div>
                <div style={S.note}>
                  Renseigne ton poids objectif → estimation (semaines + mois)
                </div>
              </div>

              <div style={S.overlay}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={S.miniTag}>🔒 Contenu Premium</div>
                  <a href={unlockHref} style={{ textDecoration: "none" }}>
                    <button style={S.btnPrimary}>Débloquer Premium</button>
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <hr style={S.hr} />

            {/* Premium (sur le home) : on laisse un résumé + lien vers /premium */}
            <div style={S.premiumBox}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={S.premiumTitle}>✅ Premium activé</div>
                <a href="/premium" style={S.link}>
                  Voir le programme complet →
                </a>
              </div>

              <div style={S.note}>
                <b>Standard</b> : {standardKcal} kcal — P {standard.p}g · C {standard.c}g · L {standard.f}g <br />
                <b>Entraînement</b> : {trainKcal} kcal — P {train.p}g · C {train.c}g · L {train.f}g <br />
                <b>Repos</b> : {restKcal} kcal — P {rest.p}g · C {rest.c}g · L {rest.f}g
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 900, opacity: 0.95 }}>Temps cible (estimation)</div>

                {!Number.isFinite(targetWeight) ? (
                  <div style={S.note}>
                    Renseigne ton poids objectif (champ “Poids objectif”) puis clique sur Calculer.
                  </div>
                ) : weeks === null ? (
                  <div style={S.note}>
                    Objectif incohérent avec le mode choisi (ex: perte de poids mais objectif plus haut).
                  </div>
                ) : weeks === 0 ? (
                  <div style={S.note}>
                    Objectif “Maintien” : durée non applicable (tu stabilises).
                  </div>
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
            </div>
          </>
        )}
      </div>
    </main>
  );
}
