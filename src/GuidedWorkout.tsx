import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  List,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Undo2,
} from "lucide-react";
import { type State, type Workout, fromKg, toKg } from "./model";
import { change } from "./db";
import { previous, progression } from "./logic";
import {
  completeGuidedSet,
  continueGuide,
  guidePosition,
  undoGuidedSet,
} from "./guide";
import { MachineVisual } from "./MachineVisual";
import { Button, Field, Modal } from "./ui";
import { setupLabels } from "./Machines";

export function GuidedWorkout({
  state: s,
  now,
  onEdit,
  onSetup,
  onReplace,
  onTechnique,
  onFinish,
  onDiscard,
}: {
  state: State;
  now: number;
  onEdit: () => void;
  onSetup: (id: string) => void;
  onReplace: (id: string) => void;
  onTechnique: (id: string) => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const w = s.active!;
  const [busy, setBusy] = useState(false),
    [plan, setPlan] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const { entry, set, stage } = guidePosition(w);
  const resting = w.restUntil !== null;
  const paused = w.pausedAt !== null;
  const done = w.entries.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  );
  const total = w.entries.reduce((n, e) => n + e.sets.length, 0);
  const machine = s.machines.find((m) => m.id === entry?.machineId);
  const exercise = s.exercises.find((e) => e.id === entry?.exerciseId);
  const remaining = Math.max(0, Math.ceil(((w.restUntil ?? now) - now) / 1000));
  const next = entry?.sets.some((s) => !s.done)
    ? entry
    : w.entries.find((e) => e.sets.some((s) => !s.done));
  const prior = entry
    ? previous(s, entry.exerciseId, entry.machineId)
    : undefined;
  const suggestion = progression(prior, machine?.incrementKg, {
    fatigue: entry?.fatigue,
    max: entry?.max,
    targetSets: entry?.targetSets,
  });
  const phase = paused ? "pause" : resting ? "rest" : !entry ? "finish" : stage;
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [phase, entry?.id]);
  const act = async (fn: (w: Workout) => void) => {
    if (busy) return;
    setBusy(true);
    try {
      await change((s) => {
        if (s.active?.id === w.id) fn(s.active);
      });
    } catch {
      /* The shared storage alert keeps a failed save visible. */
    } finally {
      setBusy(false);
    }
  };
  const editSet = (patch: {
    kg?: number;
    reps?: number;
    rir?: number | null;
  }) => {
    if (!entry || !set) return;
    void change((s) => {
      const current = s.active?.entries
        .find((e) => e.id === entry.id)
        ?.sets.find((x) => x.id === set.id);
      if (current && !current.done) Object.assign(current, patch);
    }).catch(() => {});
  };
  return (
    <div className="guided-workout">
      <header className="guide-header">
        <div>
          <span className="eyebrow">YOUR WORKOUT, ONE STEP AT A TIME</span>
          <h1>{w.name}</h1>
        </div>
        <Button
          variant="icon secondary"
          disabled={busy}
          aria-label={paused ? "Resume workout" : "Pause workout"}
          onClick={() =>
            void act((w) => {
              if (w.pausedAt !== null) {
                w.pausedMs += Date.now() - w.pausedAt;
                w.pausedAt = null;
              } else {
                w.pausedAt = Date.now();
                w.restUntil = null;
              }
            })
          }
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </Button>
      </header>
      <div className="guide-progress-label">
        <span>
          {done} of {total} sets complete
        </span>
        <button className="text-button" onClick={() => setPlan(true)}>
          <List size={16} /> Workout plan
        </button>
      </div>
      <div
        className="session-progress"
        role="progressbar"
        aria-label="Workout progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={done}
      >
        <span style={{ width: (total ? (done / total) * 100 : 0) + "%" }} />
      </div>

      {paused ? (
        <section className="guide-card guide-centered">
          <Pause className="guide-large-icon" />
          <h2 ref={title} tabIndex={-1}>
            Take your time.
          </h2>
          <p>Your workout is saved. Pick up where you left off.</p>
          <Button
            variant="primary large full"
            disabled={busy}
            onClick={() =>
              void act((w) => {
                w.pausedMs += Date.now() - w.pausedAt!;
                w.pausedAt = null;
              })
            }
          >
            Resume workout <Play size={18} />
          </Button>
        </section>
      ) : resting ? (
        <section className="guide-card guide-rest">
          <span className="guide-badge">
            <Check size={16} /> Set saved
          </span>
          <h2 ref={title} tabIndex={-1}>
            Breathe. Reset.
          </h2>
          <p>
            {remaining
              ? "Rest before your next effort."
              : "Ready when you are. Take more time if you need it."}
          </p>
          <div className="guide-clock" aria-label="Rest remaining">
            <span>
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
            <small>{remaining ? "REST" : "READY"}</small>
          </div>
          {next ? (
            <div className="guide-up-next">
              <MachineVisual
                compact
                machine={s.machines.find((m) => m.id === next.machineId)}
              />
              <div>
                <small>
                  {next.id === entry?.id ? "STAY ON THIS MACHINE" : "UP NEXT"}
                </small>
                <strong>{next.exerciseName}</strong>
                <small>{next.machineName}</small>
              </div>
            </div>
          ) : (
            <p className="accent">Your planned sets are complete.</p>
          )}
          <div className="guide-actions">
            <Button
              variant="primary large full"
              disabled={busy}
              onClick={() => void act(continueGuide)}
            >
              {next ? (remaining ? "I’m ready" : "Continue") : "Review workout"}
              <ArrowRight size={18} />
            </Button>
          </div>
          <div className="guide-secondary-actions">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void act((w) => {
                  w.restUntil = Math.max(Date.now(), w.restUntil ?? 0) + 30000;
                })
              }
            >
              +30 seconds
            </Button>
            {w.guide?.lastSetId && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void act(undoGuidedSet)}
              >
                <Undo2 size={15} /> Undo last set
              </Button>
            )}
          </div>
        </section>
      ) : !entry || !set ? (
        <section className="guide-card guide-centered">
          <Check className="guide-large-icon" />
          <h2 ref={title} tabIndex={-1}>
            {done ? "You did the work." : "Make it your workout."}
          </h2>
          <p>
            {done
              ? "Your sets are saved. Finish to see your session summary."
              : "Add an exercise to get started."}
          </p>
          <Button
            variant="primary large full"
            onClick={done ? onFinish : onEdit}
          >
            {done ? "Finish workout" : "Add an exercise"}
            <ArrowRight size={18} />
          </Button>
        </section>
      ) : (
        <section
          className={
            "guide-card" + (stage === "train" ? " guide-training" : "")
          }
        >
          <div className="guide-exercise-heading">
            <span className="guide-badge">
              EXERCISE {w.entries.indexOf(entry) + 1} OF {w.entries.length}
            </span>
            <span className="muted small">{entry.muscles[0]}</span>
          </div>
          <h2 ref={title} tabIndex={-1}>
            {entry.exerciseName}
          </h2>
          <p className="guide-machine-name">
            {stage === "setup" ? "Find your " : "Using "}
            <strong>
              {entry.machineName === "Choose equipment"
                ? "equipment"
                : entry.machineName}
            </strong>
            {machine?.area && <span> · {machine.area}</span>}
          </p>
          <div className="guide-exercise-grid">
            <div className="guide-visual">
              <MachineVisual machine={machine} />
              {!machine?.photo && machine && (
                <small className="illustration-note">
                  Equipment illustration · yours may look different
                </small>
              )}
              <div className="guide-secondary-actions">
                <Button variant="ghost" onClick={() => onSetup(entry.id)}>
                  <Settings2 size={16} /> Machine setup
                </Button>
                <Button variant="ghost" onClick={() => onReplace(entry.id)}>
                  <RefreshCw size={16} />{" "}
                  {machine ? "Machine occupied?" : "Choose equipment"}
                </Button>
              </div>
            </div>
            <div className="guide-instruction">
              {stage === "setup" ? (
                <>
                  <h3>Get comfortable. Then begin.</h3>
                  {Object.values(entry.setup).some(Boolean) && (
                    <div className="guide-saved-setup">
                      <small>YOUR SAVED SETUP</small>
                      {Object.entries(entry.setup)
                        .filter(([, v]) => v)
                        .map(([key, value]) => (
                          <span key={key}>
                            <b>
                              {setupLabels[key as keyof typeof entry.setup]}:
                            </b>{" "}
                            {value}
                          </span>
                        ))}
                    </div>
                  )}
                  <ol className="guide-cues">
                    {(
                      exercise?.instructions ||
                      "Set up your equipment comfortably. Move smoothly through a comfortable range."
                    )
                      .split(/(?<=[.!?])\s+/)
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((cue, i) => (
                        <li key={i}>
                          <span>{i + 1}</span>
                          {cue}
                        </li>
                      ))}
                  </ol>
                  <p className="guide-prescription">
                    <strong>
                      {entry.sets.filter((s) => !s.done).length} sets
                    </strong>
                    <span>of</span>
                    <strong>
                      {entry.min}–{entry.max} reps
                    </strong>
                  </p>
                  <div className="guide-actions">
                    <Button
                      variant="primary large full"
                      disabled={busy}
                      onClick={() =>
                        void act((w) => {
                          w.guide = { entryId: entry.id, stage: "train" };
                        })
                      }
                    >
                      Ready for my set <ArrowRight size={18} />
                    </Button>
                  </div>
                  <button
                    className="text-button guide-technique"
                    onClick={() => onTechnique(entry.exerciseId)}
                  >
                    More technique help
                  </button>
                </>
              ) : (
                <>
                  <div className="guide-set-heading">
                    <h3>
                      {set.kind === "warmup"
                        ? "Warm-up"
                        : "Set " + (entry.sets.indexOf(set) + 1)}{" "}
                      <span>of {entry.sets.length}</span>
                    </h3>
                    <div className="guide-dots" aria-hidden="true">
                      {entry.sets.map((x) => (
                        <span
                          key={x.id}
                          className={
                            x.done ? "done" : x.id === set.id ? "current" : ""
                          }
                        >
                          {x.done && <Check size={12} />}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p>
                    Aim for{" "}
                    <strong>
                      {entry.min}–{entry.max} controlled reps.
                    </strong>{" "}
                    <span className="guide-load-cue">
                      {entry.sets.some((s) => s.done)
                        ? "Your last set’s load is filled in."
                        : prior
                          ? "Your previous load is filled in."
                          : "Start with a manageable weight."}
                    </span>
                  </p>
                  <div className="guide-log-fields">
                    <Field label={"Weight (" + s.profile.units + ")"}>
                      <input
                        aria-label="Set weight"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="2000"
                        step="0.1"
                        value={fromKg(set.kg, s.profile.units)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (n >= 0 && n <= 2000)
                            editSet({ kg: toKg(n, s.profile.units) });
                        }}
                      />
                    </Field>
                    <Field label="Reps completed">
                      <input
                        aria-label="Reps completed"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="200"
                        value={set.reps}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isInteger(n) && n >= 0 && n <= 200)
                            editSet({ reps: n });
                        }}
                      />
                    </Field>
                  </div>
                  <small className="guide-log-hint">
                    After your set, enter the reps you did.
                  </small>
                  {!set.reps && (
                    <p role="status">
                      Enter at least one repetition to save this set.
                    </p>
                  )}
                  <div className="guide-actions">
                    <Button
                      variant="primary large full"
                      disabled={busy || !set.reps}
                      onClick={() =>
                        void act((w) =>
                          completeGuidedSet(w, entry.id, set.id, Date.now()),
                        )
                      }
                    >
                      <Check size={21} /> Set complete
                    </Button>
                  </div>
                  <details className="guide-options">
                    <summary>Set options & guidance</summary>
                    <p>{suggestion.reason}</p>
                    {suggestion.kg !== null && entry.decision === "pending" && (
                      <div className="row">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void act((w) => {
                              const e = w.entries.find(
                                (e) => e.id === entry.id,
                              )!;
                              e.decision = "accepted";
                              e.suggestionKg = suggestion.kg;
                              e.sets.forEach((s) => {
                                if (!s.done && s.kind === "work")
                                  s.kg = suggestion.kg!;
                              });
                            })
                          }
                        >
                          {suggestion.increase ? "Try " : "Keep "}
                          {fromKg(suggestion.kg, s.profile.units)}{" "}
                          {s.profile.units}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            void act((w) => {
                              w.entries.find(
                                (e) => e.id === entry.id,
                              )!.decision = "rejected";
                            })
                          }
                        >
                          Choose my own load
                        </Button>
                      </div>
                    )}
                    <Field label="Reps left in reserve (optional)">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        inputMode="numeric"
                        placeholder="Optional"
                        value={set.rir ?? ""}
                        onChange={(e) => {
                          const n =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          if (n === null || (n >= 0 && n <= 10))
                            editSet({ rir: n });
                        }}
                      />
                    </Field>
                    <Field label="How does this feel?">
                      <select
                        value={entry.fatigue}
                        onChange={(event) => {
                          const fatigue = event.target.value as
                            "normal" | "high";
                          void act((w) => {
                            w.entries.find((e) => e.id === entry.id)!.fatigue =
                              fatigue;
                          });
                        }}
                      >
                        <option value="normal">Manageable</option>
                        <option value="high">More tiring than usual</option>
                      </select>
                    </Field>
                    <Field label="Rest between sets (seconds)">
                      <input
                        type="number"
                        min="0"
                        max="900"
                        value={entry.rest}
                        onChange={(event) => {
                          const rest = Number(event.target.value);
                          if (rest >= 0 && rest <= 900)
                            void act((w) => {
                              w.entries.find((e) => e.id === entry.id)!.rest =
                                rest;
                            });
                        }}
                      />
                    </Field>
                    <button
                      className="text-button"
                      onClick={() => onTechnique(entry.exerciseId)}
                    >
                      Technique & common mistakes
                    </button>
                  </details>
                  <button
                    className="text-button guide-technique"
                    onClick={() =>
                      void act((w) => {
                        w.guide = { entryId: entry.id, stage: "setup" };
                      })
                    }
                  >
                    <ChevronLeft size={15} /> Show setup steps
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}
      <div className="guide-footer">
        <Button variant="ghost" onClick={onEdit}>
          Edit workout
        </Button>
        <details>
          <summary>Workout options</summary>
          <Button variant="ghost" onClick={onFinish} disabled={!done}>
            Finish early
          </Button>
          <Button variant="ghost danger" onClick={onDiscard}>
            Discard workout
          </Button>
        </details>
      </div>
      {plan && (
        <Modal title="Your workout plan" onClose={() => setPlan(false)}>
          <p>
            One machine at a time. You can change the order if something is
            occupied.
          </p>
          <div className="guide-plan-list">
            {w.entries.map((e, i) => (
              <button
                key={e.id}
                className="guide-plan-item"
                disabled={!e.sets.some((s) => !s.done) || paused || busy}
                onClick={async () => {
                  await act((w) => {
                    w.restUntil = null;
                    w.guide = { entryId: e.id, stage: "setup" };
                  });
                  setPlan(false);
                }}
              >
                <MachineVisual
                  compact
                  machine={s.machines.find((m) => m.id === e.machineId)}
                />
                <span>
                  <small>
                    {e.sets.length && e.sets.every((s) => s.done)
                      ? "COMPLETE"
                      : "EXERCISE " + (i + 1)}
                  </small>
                  <strong>{e.exerciseName}</strong>
                  <small>{e.machineName}</small>
                </span>
                {e.sets.length > 0 && e.sets.every((s) => s.done) ? (
                  <Check size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            ))}
          </div>
          <Button
            variant="secondary full"
            onClick={() => {
              setPlan(false);
              onEdit();
            }}
          >
            Edit exercises & sets
          </Button>
        </Modal>
      )}
    </div>
  );
}
