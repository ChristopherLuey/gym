import { useState } from "react";
import { Plus, Utensils, Trash2 } from "lucide-react";
import { type State, localDay, fromKg, toKg, uid, formatDate } from "./model";
import { change } from "./db";
import { weightTrend } from "./logic";
import { Button, Card, Field, Heading, SectionTitle, Stat, Modal } from "./ui";
export function Nutrition({ state: s }: { state: State }) {
  const [weight, setWeight] = useState(""),
    [date, setDate] = useState(localDay()),
    [name, setName] = useState(""),
    [protein, setProtein] = useState(""),
    [calories, setCalories] = useState(""),
    [meal, setMeal] = useState(false),
    [goal, setGoal] = useState(false),
    [pg, setPg] = useState(String(s.profile.proteinGoal ?? "")),
    [cg, setCg] = useState(String(s.profile.calorieGoal ?? "")),
    [target, setTarget] = useState(
      s.profile.targetKg
        ? String(fromKg(s.profile.targetKg, s.profile.units))
        : "",
    );
  const weights = [...s.weights].sort((a, b) => a.date.localeCompare(b.date));
  const current = weights.at(-1);
  const trend = weightTrend(s),
    avg = trend.current;
  const logs = s.nutrition.filter((n) => n.date === date);
  const proteinTotal = logs.reduce((n, l) => n + l.protein, 0),
    calorieTotal = logs.reduce((n, l) => n + l.calories, 0),
    goalProtein =
      s.profile.proteinGoal ?? (current ? Math.round(current.kg * 1.6) : null);
  const saveMeal = async () => {
    await change((s) => {
      if (meal) {
        s.meals.push({
          id: uid(),
          name: name || "My meal",
          protein: Number(protein),
          calories: Number(calories) || 0,
        });
      }
      s.nutrition.push({
        id: uid(),
        date,
        name: name || "Protein entry",
        protein: Number(protein),
        calories: Number(calories) || 0,
      });
    });
    setName("");
    setProtein("");
    setCalories("");
    setMeal(false);
  };
  return (
    <>
      <Heading
        title="Nutrition"
        action={
          <Button variant="secondary" onClick={() => setGoal(true)}>
            Adjust goals
          </Button>
        }
      />
      <div className="stats-grid">
        <Card>
          <Stat
            label="CURRENT WEIGHT"
            value={
              current ? (
                <>
                  {fromKg(current.kg, s.profile.units)}{" "}
                  <em>{s.profile.units}</em>
                </>
              ) : (
                "—"
              )
            }
            detail={
              current
                ? `Logged ${formatDate(current.date)}`
                : "No weigh-ins yet"
            }
          />
        </Card>
        <Card>
          <Stat
            label="7-DAY AVERAGE"
            value={
              avg ? (
                <>
                  {fromKg(avg, s.profile.units)} <em>{s.profile.units}</em>
                </>
              ) : (
                "—"
              )
            }
            detail={`${trend.recentCount} weigh-ins in the last seven days`}
          />
        </Card>
        <Card>
          <Stat
            label="YOUR TARGET"
            value={
              s.profile.targetKg ? (
                <>
                  {fromKg(s.profile.targetKg, s.profile.units)}{" "}
                  <em>{s.profile.units}</em>
                </>
              ) : (
                "—"
              )
            }
            detail={
              current && s.profile.targetKg
                ? `${fromKg(s.profile.targetKg - current.kg, s.profile.units)} ${s.profile.units} from your target`
                : "No target set"
            }
          />
        </Card>
      </div>
      {trend.delta !== null && (
        <p className="note">
          {trend.delta > 0 ? "+" : ""}
          {fromKg(trend.delta, s.profile.units)} {s.profile.units} weekly
          average change
          {s.profile.targetKg
            ? ` · ${trend.direction === "toward" ? "Toward target" : trend.direction === "away" ? "Away from target" : "Unchanged"}`
            : ""}
        </p>
      )}
      <div className="split-grid">
        <Card>
          <SectionTitle title="Weight" />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await change((s) => {
                const existing = s.weights.find((w) => w.date === localDay());
                if (existing)
                  existing.kg = toKg(Number(weight), s.profile.units);
                else
                  s.weights.push({
                    id: uid(),
                    date: localDay(),
                    kg: toKg(Number(weight), s.profile.units),
                  });
              });
              setWeight("");
            }}
          >
            <Field
              label={`Weight today (${s.profile.units})`}
              hint="Updates today’s weight."
            >
              <input
                type="number"
                inputMode="decimal"
                required
                min="20"
                max={s.profile.units === "kg" ? 500 : 1100}
                step="0.1"
                placeholder="Enter your weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
            <Button variant="primary">
              <Plus size={16} />
              Save weigh-in
            </Button>
          </form>
          <div className="divider" />
          {weights
            .slice(-4)
            .reverse()
            .map((w) => (
              <div className="list-line" key={w.id}>
                <span>{formatDate(w.date)}</span>
                <strong>
                  {fromKg(w.kg, s.profile.units)} {s.profile.units}
                </strong>
              </div>
            ))}
        </Card>
        <Card>
          <SectionTitle
            title="Protein"
            extra={<Utensils size={18} className="accent" />}
          />
          <div className="protein-total">
            {proteinTotal}
            <span> / {goalProtein ?? "—"} g</span>
          </div>
          <div className="bar">
            <span
              style={{
                width: `${goalProtein ? Math.min(100, (proteinTotal / goalProtein) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="small muted">
            {goalProtein
              ? `${Math.max(0, goalProtein - proteinTotal)} g to your daily goal`
              : "Add a weight or set your own protein goal."}
          </p>
          <details>
            <summary>Protein target</summary>
            <p className="small">Default: 1.6 g/kg daily. Adjust in Goals.</p>
            <a
              className="text-button"
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"
              target="_blank"
              rel="noreferrer"
            >
              Source: ISSN ↗
            </a>
          </details>
          <div className="divider" />
          <Button
            variant="ghost"
            onClick={() =>
              void change((s) => {
                s.profile.tracking = !s.profile.tracking;
              }).catch(() => {})
            }
          >
            {s.profile.tracking
              ? "Skip detailed food tracking"
              : "Enable simple food tracking"}
          </Button>
        </Card>
      </div>
      {s.profile.tracking && (
        <div className="split-grid">
          <Card>
            <SectionTitle title="Food log" />
            <Field label="Logging date">
              <input
                type="date"
                required
                value={date}
                max={localDay()}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </Field>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveMeal();
              }}
            >
              <Field label="Food or meal (optional)">
                <input
                  value={name}
                  placeholder="Lunch, a shake, or just the total"
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <div className="form-grid">
                <Field label="Protein (g)">
                  <input
                    required
                    type="number"
                    min="0"
                    max="1000"
                    step="0.1"
                    inputMode="decimal"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                </Field>
                <Field label="Calories (optional)">
                  <input
                    type="number"
                    min="0"
                    max="20000"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                </Field>
              </div>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={meal}
                  onChange={(e) => setMeal(e.target.checked)}
                />
                Save as a frequent meal
              </label>
              <Button variant="primary space-top">Add entry</Button>
            </form>
            <h3>Quick add</h3>
            <p className="muted small">Estimated portions · editable</p>
            <div className="meal-list">
              {s.meals.map((m) => (
                <div key={m.id}>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void change((s) => {
                        s.nutrition.push({
                          id: uid(),
                          date,
                          name: m.name,
                          protein: m.protein,
                          calories: m.calories,
                        });
                      }).catch(() => {})
                    }
                  >
                    + {m.name}
                    <small>{m.protein} g</small>
                  </Button>
                  <Button
                    variant="icon ghost"
                    aria-label={`Remove meal ${m.name}`}
                    onClick={() =>
                      void change((s) => {
                        s.meals = s.meals.filter((x) => x.id !== m.id);
                      }).catch(() => {})
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle
              title={
                date === localDay()
                  ? "Today’s entries"
                  : `Entries · ${formatDate(date)}`
              }
            />
            {logs.length ? (
              logs.map((l) => (
                <div className="food-entry" key={l.id}>
                  <div>
                    <strong>{l.name}</strong>
                    <small>
                      {l.protein} g protein
                      {l.calories ? ` · ${l.calories} kcal` : ""}
                    </small>
                  </div>
                  <Button
                    variant="icon ghost"
                    aria-label={`Delete food entry ${l.name}`}
                    onClick={() =>
                      void change((s) => {
                        s.nutrition = s.nutrition.filter((x) => x.id !== l.id);
                      }).catch(() => {})
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))
            ) : (
              <p className="muted">No entries yet.</p>
            )}
            <div className="divider" />
            <Stat
              label="CALORIES LOGGED"
              value={calorieTotal}
              detail={
                s.profile.calorieGoal
                  ? `Optional goal: ${s.profile.calorieGoal} kcal`
                  : "No calorie target set"
              }
            />
          </Card>
        </div>
      )}
      {goal && (
        <Modal title="Your nutrition goals" onClose={() => setGoal(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await change((s) => {
                s.profile.proteinGoal = pg ? Number(pg) : null;
                s.profile.calorieGoal = cg ? Number(cg) : null;
                s.profile.targetKg = target
                  ? toKg(Number(target), s.profile.units)
                  : null;
              });
              setGoal(false);
            }}
          >
            <Field
              label="Protein goal (g/day)"
              hint="Leave blank to use 1.6 g/kg of your latest recorded weight."
            >
              <input
                type="number"
                min="1"
                max="1000"
                value={pg}
                onChange={(e) => setPg(e.target.value)}
              />
            </Field>
            <Field label="Calorie target (optional)">
              <input
                type="number"
                min="1"
                max="20000"
                value={cg}
                onChange={(e) => setCg(e.target.value)}
              />
            </Field>
            <Field label={`Target weight (${s.profile.units}, optional)`}>
              <input
                type="number"
                min="20"
                max={s.profile.units === "kg" ? 500 : 1100}
                step="0.1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </Field>
            <Button variant="primary">Save goals</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
