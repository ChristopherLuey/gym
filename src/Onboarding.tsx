import { useState } from "react";
import { ArrowRight, Check, Dumbbell, ChevronLeft } from "lucide-react";
import { type State, type Profile, days, toKg, uid, localDay } from "./model";
import { change } from "./db";
import { Button, Field } from "./ui";
export function Onboarding({ state }: { state: State }) {
  const [step, setStep] = useState(0),
    [profile, setProfile] = useState<Profile>(state.profile),
    [weight, setWeight] = useState(""),
    [target, setTarget] = useState(""),
    [selected, setSelected] = useState(state.machines.map((m) => m.id)),
    [busy, setBusy] = useState(false);
  const patch = (p: Partial<Profile>) => setProfile({ ...profile, ...p });
  const finish = async () => {
    setBusy(true);
    try {
      await change((s) => {
        s.profile = {
          ...profile,
          targetKg: target ? toKg(Number(target), profile.units) : null,
          onboarded: true,
          createdAt: Date.now(),
        };
        if (weight)
          s.weights.push({
            id: uid(),
            date: localDay(),
            kg: toKg(Number(weight), profile.units),
          });
        s.machines.forEach((m) => (m.archived = !selected.includes(m.id)));
        s.programs.forEach((p, i) => {
          p.days = profile.days.filter((_, index) => index % 3 === i);
          p.items.forEach((item) => {
            if (!selected.includes(item.machineId)) item.machineId = "";
          });
        });
      });
      void navigator.storage?.persist?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="onboarding">
      <div className="onboard-brand">
        <Dumbbell />
        <b>
          GYM<span>.</span>
        </b>
        <small>YOUR TRAINING, IN RHYTHM</small>
      </div>
      <div className="onboard-card">
        <div className="step-dots">
          {[0, 1, 2].map((n) => (
            <span key={n} className={step >= n ? "active" : ""} />
          ))}
        </div>
        <div className="eyebrow">
          LET'S BUILD SOMETHING LASTING · {step + 1} / 3
        </div>
        <h1>
          {
            [
              "A stronger you.\nOne session at a time.",
              "Make it your routine.",
              "Your first week,\nready to go.",
            ][step]
          }
        </h1>
        <p>
          {
            [
              "A little about you. Your training stays private on this device.",
              "A simple full-body plan, built around the equipment you have.",
              "Start with two working sets per exercise. Build confidence, then build volume as you recover well.",
            ][step]
          }
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 2) setStep(step + 1);
            else void finish();
          }}
        >
          {step === 0 && (
            <>
              <Field label="What should we call you?">
                <input
                  value={profile.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  maxLength={80}
                />
              </Field>
              <div className="form-grid">
                <Field label="Units">
                  <select
                    value={profile.units}
                    onChange={(e) => {
                      patch({ units: e.target.value as Profile["units"] });
                      setWeight("");
                      setTarget("");
                    }}
                  >
                    <option value="lb">Pounds (lb)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </Field>
                <Field
                  label={`Current weight (${profile.units})`}
                  hint="Optional — you can add this later."
                >
                  <input
                    type="number"
                    min="20"
                    max={profile.units === "kg" ? 500 : 1100}
                    step="0.1"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Your current weight"
                  />
                </Field>
                <Field label={`Target weight (${profile.units})`}>
                  <input
                    type="number"
                    min="20"
                    max={profile.units === "kg" ? 500 : 1100}
                    step="0.1"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Experience">
                  <select
                    value={profile.experience}
                    onChange={(e) =>
                      patch({
                        experience: e.target.value as Profile["experience"],
                      })
                    }
                  >
                    <option value="beginner">New to lifting</option>
                    <option value="returning">Returning to training</option>
                    <option value="experienced">Training consistently</option>
                  </select>
                </Field>
              </div>
              <div className="note">
                Your focus: muscle, strength, and a fuller physique. Height: 165
                cm. All details remain editable.
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <Field label="Training days">
                <div className="days">
                  {days.map((d, i) => (
                    <button
                      type="button"
                      key={d}
                      aria-pressed={profile.days.includes(i)}
                      className={profile.days.includes(i) ? "selected" : ""}
                      onClick={() =>
                        patch({
                          days: profile.days.includes(i)
                            ? profile.days.length > 1
                              ? profile.days.filter((x) => x !== i)
                              : profile.days
                            : [...profile.days, i].sort(),
                        })
                      }
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Session length">
                <select
                  value={profile.minutes}
                  onChange={(e) => patch({ minutes: Number(e.target.value) })}
                >
                  {[30, 45, 60, 75, 90].map((n) => (
                    <option key={n} value={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Available equipment"
                hint="These are starter suggestions. Uncheck anything unavailable, or skip setup."
              >
                <div className="check-grid">
                  {state.machines.map((m) => (
                    <label key={m.id} className="check-option">
                      <input
                        type="checkbox"
                        checked={selected.includes(m.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, m.id]
                              : selected.filter((x) => x !== m.id),
                          )
                        }
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </Field>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelected([])}
              >
                Skip machine setup
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <div className="plan-preview">
                {state.programs.map((p, i) => (
                  <div key={p.id}>
                    <span className="letter">{"ABC"[i]}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {profile.days
                          .filter((_, n) => n % 3 === i)
                          .map((d) => days[d].slice(0, 3))
                          .join(", ") || "Unscheduled"}{" "}
                        · {p.items.length} exercises
                      </small>
                      <p>
                        {p.items
                          .map(
                            (item) =>
                              state.exercises.find(
                                (e) => e.id === item.exerciseId,
                              )?.name,
                          )
                          .join(" · ")}
                      </p>
                      <small>
                        {[
                          ...new Set(
                            p.items.map((item) =>
                              selected.includes(item.machineId)
                                ? state.machines.find(
                                    (m) => m.id === item.machineId,
                                  )?.name
                                : "Choose equipment later",
                            ),
                          ),
                        ].join(" / ")}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="note">
                The first two weeks are about finding your rhythm. Keep a few
                reps in reserve, use comfortable ranges, and adjust your plan to
                your recovery.
              </div>
            </>
          )}
          <div className="actions">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft size={18} />
                Back
              </Button>
            )}
            <Button variant="primary" disabled={busy}>
              {step < 2 ? "Continue" : "Let’s get stronger"}
              {step < 2 ? <ArrowRight size={18} /> : <Check size={18} />}
            </Button>
          </div>
        </form>
      </div>
      <small className="onboard-footer">
        NO ACCOUNT. NO ADS. JUST YOUR PROGRESS.
      </small>
    </div>
  );
}
