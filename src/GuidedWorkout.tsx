import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Pause, Play, RefreshCw, Undo2 } from "lucide-react";
import { type State, type Workout, fromKg, toKg, repTarget } from "./model";
import { change } from "./db";
import {
  completeGuidedSet,
  continueGuide,
  guidePosition,
  undoGuidedSet,
} from "./guide";
import { MachineVisual } from "./MachineVisual";
import { WorkoutHeader } from "./WorkoutHeader";
import { Button, Field, Modal } from "./ui";

export function GuidedWorkout({
  state: s,
  now,
  onEdit,
  onReplace,
  onFinish,
  onDiscard,
}: {
  state: State;
  now: number;
  onEdit: () => void;
  onReplace: (id: string) => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const w = s.active!;
  const [busy, setBusy] = useState(false),
    [plan, setPlan] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const { entry, set } = guidePosition(w);
  const resting = w.restUntil !== null;
  const paused = w.pausedAt !== null;
  const done = w.entries.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  );
  const total = w.entries.reduce((n, e) => n + e.sets.length, 0);
  const machine = s.machines.find((m) => m.id === entry?.machineId);
  const remaining = Math.max(0, Math.ceil(((w.restUntil ?? now) - now) / 1000));
  const next = entry?.sets.some((s) => !s.done)
    ? entry
    : w.entries.find((e) => e.sets.some((s) => !s.done));
  const phase = paused
    ? "pause"
    : resting
      ? "rest"
      : !entry
        ? "finish"
        : "train";
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
  const editSet = (patch: { kg?: number; reps?: number }) => {
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
      <WorkoutHeader
        name={w.name}
        done={done}
        total={total}
        paused={paused}
        busy={busy}
        onPlan={() => setPlan(true)}
        onPause={() =>
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
      />
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
            Paused
          </h2>
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
            Rest
          </h2>
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
                <small>{next.id === entry?.id ? "NEXT SET" : "UP NEXT"}</small>
                <strong>{next.exerciseName}</strong>
                <small>{next.machineName}</small>
              </div>
            </div>
          ) : (
            <p className="accent">All sets complete</p>
          )}
          <div className="guide-actions">
            <Button
              variant="primary large full"
              disabled={busy}
              onClick={() => void act(continueGuide)}
            >
              {next
                ? next.id === entry?.id
                  ? "Next set"
                  : "Next exercise"
                : "Review workout"}
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
            {done ? "All sets complete" : "No exercises"}
          </h2>
          <Button
            variant="primary large full"
            onClick={done ? onFinish : onEdit}
          >
            {done ? "Finish workout" : "Add an exercise"}
            <ArrowRight size={18} />
          </Button>
        </section>
      ) : (
        <section className="guide-card guide-training">
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
              <div className="guide-secondary-actions">
                <Button variant="ghost" onClick={() => onReplace(entry.id)}>
                  <RefreshCw size={16} />{" "}
                  {machine ? "Machine occupied?" : "Choose equipment"}
                </Button>
              </div>
            </div>
            <div className="guide-instruction">
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
                <Field label={`Reps (${repTarget(entry.min, entry.max)})`}>
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
              {!set.reps && <p role="status">Enter at least 1 rep.</p>}
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
          <div className="guide-plan-list">
            {w.entries.map((e, i) => (
              <button
                key={e.id}
                className="guide-plan-item"
                disabled={!e.sets.some((s) => !s.done) || paused || busy}
                onClick={async () => {
                  await act((w) => {
                    w.restUntil = null;
                    w.guide = { entryId: e.id, stage: "train" };
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
