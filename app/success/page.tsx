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

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const cookieStore = await cookies();
  const isPremium = cookieStore.get("wc_premium")?.value === "1";

  const sex = param(sp, "sex", "male");
  const goal = param(sp, "goal", "cut");
  const activity = param(sp, "activity", "moderate");

  const age = clamp(toNum(param(sp, "age", "28"), 28), 12, 90);
  const height = clamp(toNum(param(sp, "height", "175"), 175), 120, 230);
  const weight = clamp(toNum(param(sp, "weight", "75"), 75), 30, 250);

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
    } as const,
    pills: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, alignItems: "center" } as const,
    pill: {
      borderRadius: 999,
      padding: "8px 10px",
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.06)",
      fontSize: 13,
      fontWeight: 800,
    } as const,
    cards: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 } as const,
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
    note: { opacity: 0.85, fontSize: 13, lineHeight: 1.35 } as const,
    hr: { height: 1, background: "rgba(255,255,255,.10)", border: "none", margin: "12px 0" } as const,

    premiumBox: {
      marginTop: 14,
      borderRadius: 14,
      border: "1px solid rgba(34,197,94,.35)",
      background: "rgba(34,197,94,.12)",
      padding: 16,
      position: "relative",
      overflow: "hidden",
    } as const,
    premiumTitle: { fontWeight: 950, fontSize: 16, marginBottom: 8 } as const,
    blurLayer: {
      filter: "blur(8px)",
      opacity: 0.55,
      pointerEvents: "none",
      userSelect: "none",
    } as const,
    overlay: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.55))",
      pointerEvents: "none",
    } as const,
  };

  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>
              Calcule ton plan simplement. {isPremium ? "Premium activé ✅" : "Version gratuite"}
            </div>
          </div>
          <div style={S.badge}>{isPremium ? "✅ Premium" : "🔒 Free"}</div>
        </div>

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
              defaultValue={param(sp, "targetWeight", "")}
              style={{ ...S.field, gridColumn: "span 2" }}
              placeholder="Poids objectif (kg) — Premium"
            />
          </div>

          <div style={S.btnRow}>
            <a href="/" style={S.btn}>
              Réinitialiser
            </a>
            <button type="submit" style={S.btnPrimary}>
              Calculer
            </button>
          </div>
        </form>

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
          • <b>BMR</b> = calories au repos. <br />
          • <b>TDEE</b> = calories de maintien avec ton activité.
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

        {!isPremium ? (
          <>
            <hr style={S.hr} />
            <div style={S.premiumBox}>
              <div style={S.premiumTitle}>🔒 Premium (programme complet)</div>

              <div style={S.blurLayer}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Aperçu Premium</div>
                <div style={S.note}>
                  Plan recommandé (jours sport/repos) · Comparateur entraînement/repos · Aliments healthy · Temps cible...
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {["Petit-déj", "Déjeuner", "Goûter", "Dîner"].map((x) => (
                    <div
                      key={x}
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,.14)",
                        background: "rgba(0,0,0,.16)",
                        padding: 10,
                      }}
                    >
                      <div style={{ opacity: 0.85, fontSize: 12, fontWeight: 900 }}>{x}</div>
                      <div style={{ fontSize: 18, fontWeight: 950, marginTop: 4 }}>— kcal</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={S.overlay} />

              <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end", position: "relative" }}>
                <a href="/#premium" style={S.btnPrimary}>
                  Débloquer Premium
                </a>
              </div>
            </div>

            {/* zone simple pour rediriger vers ton flow email+stripe si tu l’as déjà */}
            git add .
git commit -m "Update premium UI comparator + rename cut to weight loss"
git push

              <div style={S.premiumTitle}>Débloquer Premium — 4,99€</div>
              <div style={S.note}>Entre ton email, puis clique sur “Débloquer” pour passer au paiement.</div>

              <form action="/api/create-checkout" method="post" style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="tonmail@email.com"
                  style={{ ...S.field, flex: "1 1 260px" }}
                />
                <button type="submit" style={S.btnPrimary}>
                  Débloquer — 4,99€
                </button>
              </form>
          </>
        ) : (
          <>
            <hr style={S.hr} />
            <div style={S.note}>
              Premium activé ✅ — Va sur <a href="/premium" style={{ color: "#bbf7d0" }}>la page Premium</a> pour le programme complet.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
