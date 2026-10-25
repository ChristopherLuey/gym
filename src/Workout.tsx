import { useEffect, useState } from "react";
import {
  Check,
  Plus,
  Timer,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCw,
  BookOpen,
  Flag,
  Trophy,
} from "lucide-react";
import {
  type State,
  type Workout as WorkoutType,
  type Entry,
  type WorkoutSet,
  uid,
  fromKg,
  toKg,
  formatDate,
  repTarget,
} from "./model";
import { change } from "./db";
import {
  duration,
  newEntry,
  previous,
  progression,
  working,
  setCount,
  volume,
  records,
} from "./logic";
import { Button, Card, Field, Heading, Modal, Stat, Empty } from "./ui";
import { ExerciseDetail } from "./Programs";
import { GuidedWorkout } from "./GuidedWorkout";
import { WorkoutHeader } from "./WorkoutHeader";
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
export function WorkoutSummary({
  state: s,
  workout: w,
  onClose,
}: {
  state: State;
  workout: WorkoutType;
  onClose: () => void;
}) {
  const prs = records(s, w);
  return (
    <Modal title="Workout saved" onClose={onClose}>
      <div className="summary-hero">
        <div className="summary-icon">
          <Check size={32} />
        </div>
        <span className="eyebrow">
          SESSION COMPLETE · {formatDate(w.finished!)}
        </span>
        <h2>{w.name}</h2>
      </div>
      <div className="stats-grid compact">
        <Stat label="Time" value={clock(duration(w))} />
        <Stat label="Working sets" value={setCount(w)} />
        <Stat
          label={`Volume · ${s.profile.units}`}
          value={Math.round(
            fromKg(volume(w), s.profile.units),
          ).toLocaleString()}
        />
      </div>
      {prs.map((r, i) => (
        <div className="record" key={i}>
          <Trophy size={20} />
          <div>
            <strong>
              {r.first ? "First recorded best" : "New load record"} · {r.name}
            </strong>
            <small>
              {r.machine} · {fromKg(r.kg, s.profile.units)} {s.profile.units}
            </small>
          </div>
        </div>
      ))}
      <h3>Your session</h3>
      {w.entries.map((e) => (
        <div className="summary-entry" key={e.id}>
          <strong>{e.exerciseName}</strong>
          <small>{e.machineName}</small>
          <p>
            {e.sets
              .filter((s) => s.done)
              .map(
                (set) =>
                  `${fromKg(set.kg, s.profile.units)} × ${set.reps}${set.kind === "warmup" ? " (warm-up)" : ""}`,
              )
              .join(" / ") || "No sets completed"}
          </p>
          {Object.values(e.setup).some(Boolean) && (
            <small>
              Setup:{" "}
              {Object.entries(e.setup)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            </small>
          )}
        </div>
      ))}
      {w.notes && <p className="note">{w.notes}</p>}
      <Button variant="primary full" onClick={onClose}>
        Done
      </Button>
    </Modal>
  );
}
export function Workout({
  state: s,
  navigate,
  showWorkout,
}: {
  state: State;
  navigate: (p: string) => void;
  showWorkout: (id: string) => void;
}) {
  const w = s.active;
  const [now, setNow] = useState(Date.now()),
    [editing, setEditing] = useState(false),
    [replacement, setReplacement] = useState<string | null>(null),
    [replaceMachine, setReplaceMachine] = useState(""),
    [replaceExercise, setReplaceExercise] = useState(""),
    [exercise, setExercise] = useState<string | null>(null),
    [add, setAdd] = useState(false),
    [addId, setAddId] = useState(s.exercises[0].id),
    [confirm, setConfirm] = useState<"finish" | "discard" | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const mutate = (fn: (w: WorkoutType) => void) =>
    void change((s) => {
      if (s.active) fn(s.active);
    }).catch(() => {});
  const edit = (id: string, fn: (e: Entry) => void) =>
    mutate((w) => {
      const e = w.entries.find((e) => e.id === id);
      if (e) fn(e);
    });
  const editSet = (entryId: string, id: string, p: Partial<WorkoutSet>) =>
    edit(entryId, (e) => {
      e.sets = e.sets.map((s) => (s.id === id ? { ...s, ...p } : s));
    });
  if (!w)
    return (
      <>
        <Heading title="Workout" />
        <Empty
          title="No active workout"
          description="Choose a program or repeat a previous workout from Today."
          action={
            <Button variant="primary" onClick={() => navigate("Programs")}>
              Choose a workout
            </Button>
          }
        />
      </>
    );
  const done = w.entries.reduce(
      (n, e) => n + e.sets.filter((s) => s.done).length,
      0,
    ),
    total = w.entries.reduce((n, e) => n + e.sets.length, 0),
    restRemaining = (w.restUntil ?? 0) - now;
  const replace = async () => {
    const original = w.entries.find((e) => e.id === replacement);
    if (!original) return;
    await change((s) => {
      if (!s.active) return;
      const old = s.active.entries.find((e) => e.id === original.id)!;
      const remaining = old.sets.filter((s) => !s.done).length;
      const replacementEntry = newEntry(s, {
        id: uid(),
        exerciseId: replaceExercise,
        machineId: replaceMachine,
        sets: Math.max(remaining, 1),
        min: old.min,
        max: old.max,
        rest: old.rest,
      });
      replacementEntry.targetSets = Math.max(remaining, 1);
      replacementEntry.sets = replacementEntry.sets.slice(
        0,
        Math.max(remaining, 1),
      );
      const index = s.active.entries.indexOf(old);
      if (old.sets.some((s) => s.done)) {
        old.sets = old.sets.filter((s) => s.done);
        s.active.entries.splice(index + 1, 0, replacementEntry);
      } else s.active.entries.splice(index, 1, replacementEntry);
      s.active.guide = { entryId: replacementEntry.id, stage: "train" };
      s.active.restUntil = null;
    });
    setReplacement(null);
  };
  return (
    <>
      {editing ? (
        <>
          <WorkoutHeader
            name={w.name}
            done={done}
            total={total}
            paused={w.pausedAt !== null}
            onPause={() =>
              mutate((w) => {
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
          <div className="row workout-editor-actions">
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                window.scrollTo(0, 0);
              }}
            >
              Back to workout
            </Button>
            <Button variant="primary" onClick={() => setConfirm("finish")}>
              <Flag size={18} /> Finish
            </Button>
          </div>
          <div className="session-progress">
            <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          {w.pausedAt && (
            <div className="notice">
              Workout paused. Resume when you’re ready to log your next set.
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              {notice}
              <Button variant="ghost" onClick={() => setNotice("")}>
                Dismiss
              </Button>
            </div>
          )}
          <div className="workout-layout">
            <div className="session-exercises">
              {w.entries.map((e, index) => {
                const prior = previous(s, e.exerciseId, e.machineId),
                  machine = s.machines.find((m) => m.id === e.machineId),
                  recommendation = progression(prior, machine?.incrementKg, {
                    fatigue: e.fatigue,
                    max: e.max,
                    targetSets: e.targetSets,
                  });
                return (
                  <Card key={e.id} className="live-exercise">
                    <div className="exercise-top">
                      <span className="number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h2>{e.exerciseName}</h2>
                        <button
                          className="text-button machine-switch"
                          onClick={() => {
                            setReplacement(e.id);
                            setReplaceMachine(e.machineId);
                            setReplaceExercise(e.exerciseId);
                          }}
                        >
                          {e.machineName}
                          <RefreshCw size={14} />
                        </button>
                      </div>
                      <Button
                        variant="icon ghost"
                        aria-label={`History and notes for ${e.exerciseName}`}
                        onClick={() => setExercise(e.exerciseId)}
                      >
                        <BookOpen size={18} />
                      </Button>
                    </div>
                    <div className="exercise-tools">
                      <span className="muscle-tag">
                        {repTarget(e.min, e.max)} reps · {e.rest}s rest
                      </span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setReplacement(e.id);
                          setReplaceMachine(e.machineId);
                          setReplaceExercise(e.exerciseId);
                        }}
                      >
                        Machine occupied?
                      </button>
                    </div>
                    {prior && (
                      <p className="previous">
                        LAST TIME{" "}
                        <span>
                          {working(prior)
                            .map(
                              (set) =>
                                `${fromKg(set.kg, s.profile.units)} × ${set.reps}`,
                            )
                            .join(" / ")}{" "}
                          {s.profile.units}
                        </span>
                      </p>
                    )}
                    <div className="set-head">
                      <span>SET</span>
                      <span>{s.profile.units.toUpperCase()}</span>
                      <span>REPS</span>
                      <span>RIR</span>
                      <span>DONE</span>
                      <span />
                    </div>
                    {e.sets.map((set, i) => (
                      <div
                        key={set.id}
                        className={`set-row ${set.done ? "completed" : ""}`}
                      >
                        <button
                          className="set-kind"
                          title="Switch warm-up / working set"
                          aria-label={`Set ${i + 1} type: ${set.kind}`}
                          onClick={() =>
                            editSet(e.id, set.id, {
                              kind: set.kind === "work" ? "warmup" : "work",
                            })
                          }
                        >
                          {set.kind === "warmup" ? "W" : i + 1}
                        </button>
                        <input
                          aria-label={`${e.exerciseName} set ${i + 1} weight`}
                          inputMode="decimal"
                          type="number"
                          min="0"
                          max="2000"
                          step="0.1"
                          value={fromKg(set.kg, s.profile.units)}
                          onChange={(v) => {
                            const n = Number(v.target.value);
                            if (n >= 0 && n <= 2000)
                              editSet(e.id, set.id, {
                                kg: toKg(n, s.profile.units),
                              });
                          }}
                        />
                        <input
                          aria-label={`${e.exerciseName} set ${i + 1} reps`}
                          inputMode="numeric"
                          type="number"
                          min="0"
                          max="200"
                          value={set.reps}
                          onChange={(v) => {
                            const n = Number(v.target.value);
                            if (Number.isInteger(n) && n >= 0 && n <= 200)
                              editSet(e.id, set.id, { reps: n });
                          }}
                        />
                        <input
                          aria-label={`${e.exerciseName} set ${i + 1} RIR`}
                          inputMode="numeric"
                          type="number"
                          min="0"
                          max="10"
                          placeholder="—"
                          value={set.rir ?? ""}
                          onChange={(v) => {
                            const n =
                              v.target.value === ""
                                ? null
                                : Number(v.target.value);
                            if (n === null || (n >= 0 && n <= 10))
                              editSet(e.id, set.id, { rir: n });
                          }}
                        />
                        <button
                          disabled={!!w.pausedAt}
                          className={`complete-set ${set.done ? "checked" : ""}`}
                          aria-label={`${set.done ? "Uncheck" : "Complete"} ${e.exerciseName} set ${i + 1}`}
                          aria-pressed={set.done}
                          onClick={() => {
                            if (!set.done && !set.reps) {
                              setNotice(
                                "Enter at least one repetition before completing a set.",
                              );
                              return;
                            }
                            mutate((w) => {
                              const current = w.entries
                                .find((x) => x.id === e.id)!
                                .sets.find((x) => x.id === set.id)!;
                              current.done = !current.done;
                              if (current.done)
                                w.restUntil = Date.now() + e.rest * 1000;
                            });
                          }}
                        >
                          <Check size={20} />
                        </button>
                        <Button
                          variant="icon ghost delete-set"
                          aria-label={`Delete ${e.exerciseName} set ${i + 1}`}
                          onClick={() =>
                            edit(e.id, (e) => {
                              e.sets = e.sets.filter((s) => s.id !== set.id);
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                    <div className="row space-top">
                      <Button
                        variant="ghost small-button"
                        onClick={() =>
                          edit(e.id, (e) => {
                            const last = e.sets.at(-1);
                            e.sets.push({
                              id: uid(),
                              kg: last?.kg ?? 0,
                              reps:
                                e.min === e.max ? e.min : (last?.reps ?? e.min),
                              rir: null,
                              kind: "work",
                              done: false,
                            });
                            e.targetSets = e.sets.filter(
                              (s) => s.kind === "work",
                            ).length;
                          })
                        }
                      >
                        <Plus size={16} />
                        Add set
                      </Button>
                      <Button
                        variant="ghost small-button"
                        onClick={() =>
                          edit(e.id, (e) => {
                            e.sets.unshift({
                              id: uid(),
                              kg: 0,
                              reps: 10,
                              rir: null,
                              kind: "warmup",
                              done: false,
                            });
                          })
                        }
                      >
                        + Warm-up
                      </Button>
                      <div className="row move-controls">
                        <Button
                          variant="icon ghost"
                          aria-label={`Move ${e.exerciseName} up`}
                          disabled={!index}
                          onClick={() =>
                            mutate((w) => {
                              [w.entries[index], w.entries[index - 1]] = [
                                w.entries[index - 1],
                                w.entries[index],
                              ];
                            })
                          }
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          variant="icon ghost"
                          aria-label={`Move ${e.exerciseName} down`}
                          disabled={index === w.entries.length - 1}
                          onClick={() =>
                            mutate((w) => {
                              [w.entries[index], w.entries[index + 1]] = [
                                w.entries[index + 1],
                                w.entries[index],
                              ];
                            })
                          }
                        >
                          <ArrowDown size={14} />
                        </Button>
                      </div>
                    </div>
                    <details>
                      <summary>Progression & session details</summary>
                      <p className="small">{recommendation.reason}</p>
                      {recommendation.kg !== null &&
                        e.decision === "pending" && (
                          <div className="row">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                edit(e.id, (e) => {
                                  e.decision = "accepted";
                                  e.suggestionKg = recommendation.kg;
                                  e.sets.forEach((set) => {
                                    if (!set.done && set.kind === "work")
                                      set.kg = recommendation.kg ?? set.kg;
                                  });
                                })
                              }
                            >
                              {recommendation.increase ? "Try" : "Keep"}{" "}
                              {fromKg(recommendation.kg!, s.profile.units)}{" "}
                              {s.profile.units}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                edit(e.id, (e) => {
                                  e.decision = "rejected";
                                })
                              }
                            >
                              Choose my own load
                            </Button>
                          </div>
                        )}
                      {e.decision !== "pending" && (
                        <p className="accent small">Suggestion {e.decision}.</p>
                      )}
                      <Field label="Fatigue today">
                        <select
                          value={e.fatigue}
                          onChange={(v) => {
                            const value = v.target.value as Entry["fatigue"];
                            edit(e.id, (e) => {
                              e.fatigue = value;
                            });
                          }}
                        >
                          <option value="normal">Manageable</option>
                          <option value="high">Higher than usual</option>
                        </select>
                      </Field>
                      <Field label="Exercise notes">
                        <textarea
                          value={e.notes}
                          onChange={(v) => {
                            const value = v.target.value;
                            edit(e.id, (e) => {
                              e.notes = value;
                            });
                          }}
                        />
                      </Field>
                      <Field label="Rest between sets (seconds)">
                        <input
                          type="number"
                          min="0"
                          max="900"
                          value={e.rest}
                          onChange={(v) => {
                            const n = Number(v.target.value);
                            if (n >= 0 && n <= 900)
                              edit(e.id, (e) => {
                                e.rest = n;
                              });
                          }}
                        />
                      </Field>
                      <Button
                        variant="ghost danger"
                        onClick={() => {
                          if (e.sets.some((s) => s.done)) {
                            setNotice(
                              "Completed sets are preserved. Delete those sets first if you want to remove this exercise.",
                            );
                            return;
                          }
                          mutate((w) => {
                            w.entries = w.entries.filter((x) => x.id !== e.id);
                          });
                        }}
                      >
                        Remove exercise
                      </Button>
                    </details>
                  </Card>
                );
              })}
              <Button variant="secondary full" onClick={() => setAdd(true)}>
                <Plus size={18} />
                Add exercise
              </Button>
              <Card>
                <Field label="Workout notes">
                  <textarea
                    value={w.notes}
                    placeholder="How did the session feel?"
                    onChange={(e) => {
                      const value = e.target.value;
                      mutate((w) => {
                        w.notes = value;
                      });
                    }}
                  />
                </Field>
                <Button
                  variant="ghost danger"
                  onClick={() => setConfirm("discard")}
                >
                  Discard workout
                </Button>
              </Card>
            </div>
            <aside className="session-aside">
              <Card>
                <span className="eyebrow">YOUR SESSION</span>
                <h3>{done} sets complete</h3>
                {w.entries.map((e) => (
                  <div className="checklist-line" key={e.id}>
                    <Check
                      size={15}
                      className={
                        e.sets.length && e.sets.every((s) => s.done)
                          ? "accent"
                          : "muted"
                      }
                    />
                    <span>{e.machineName}</span>
                  </div>
                ))}
              </Card>
            </aside>
          </div>
          {w.restUntil !== null && (
            <div
              className={`rest-timer ${restRemaining <= 0 ? "ready" : ""}`}
              role="status"
            >
              <Timer size={20} />
              <div>
                <strong>
                  {restRemaining > 0
                    ? clock(restRemaining)
                    : "Ready for your next set"}
                </strong>
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  mutate((w) => {
                    w.restUntil =
                      Math.max(Date.now(), w.restUntil ?? 0) + 30000;
                  })
                }
              >
                +30s
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  mutate((w) => {
                    w.restUntil = null;
                  })
                }
              >
                {restRemaining > 0 ? "Skip" : "Done"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <GuidedWorkout
          state={s}
          now={now}
          onEdit={() => {
            setEditing(true);
            window.scrollTo(0, 0);
          }}
          onReplace={(id) => {
            const e = w.entries.find((e) => e.id === id)!;
            setReplacement(id);
            setReplaceMachine(e.machineId);
            setReplaceExercise(e.exerciseId);
          }}
          onFinish={() => setConfirm("finish")}
          onDiscard={() => setConfirm("discard")}
        />
      )}
      {exercise && (
        <ExerciseDetail
          state={s}
          id={exercise}
          onClose={() => setExercise(null)}
        />
      )}
      {replacement && (
        <Modal
          title="Find your next setup"
          onClose={() => setReplacement(null)}
        >
          <p>Completed sets keep their original machine.</p>
          <Field label="Exercise">
            <select
              value={replaceExercise}
              onChange={(e) => setReplaceExercise(e.target.value)}
            >
              {s.exercises
                .filter((e) => !e.archived || e.id === replaceExercise)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Replacement machine">
            <select
              value={replaceMachine}
              onChange={(e) => setReplaceMachine(e.target.value)}
            >
              <option value="">Unassigned / bodyweight</option>
              {s.machines
                .filter((m) => !m.archived)
                .map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>
          <p className="note">Loads differ between machines.</p>
          <Button variant="primary" onClick={() => void replace()}>
            Use this setup
          </Button>
        </Modal>
      )}
      {add && (
        <Modal title="Add an exercise" onClose={() => setAdd(false)}>
          <Field label="Exercise">
            <select value={addId} onChange={(e) => setAddId(e.target.value)}>
              {s.exercises
                .filter((e) => !e.archived)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <Button
            variant="primary"
            onClick={async () => {
              await change((s) => {
                s.active?.entries.push(
                  newEntry(s, {
                    id: uid(),
                    exerciseId: addId,
                    machineId: "",
                    sets: 4,
                    min: 10,
                    max: 10,
                    rest: s.profile.rest,
                  }),
                );
              });
              setAdd(false);
            }}
          >
            Add to session
          </Button>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm === "finish"
              ? "Finish your session?"
              : "Discard this session?"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm === "finish"
              ? `${done} of ${total} sets completed. Only checked sets count toward progress. Unfinished sets remain visible in history.`
              : "This removes the active session. Your previously completed workouts remain saved."}
          </p>
          <div className="actions">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep training
            </Button>
            <Button
              variant={confirm === "finish" ? "primary" : "danger"}
              disabled={confirm === "finish" && !done}
              onClick={async () => {
                const id = w.id;
                await change((s) => {
                  if (!s.active) return;
                  if (confirm === "finish") {
                    s.active.finished = Date.now();
                    if (s.active.pausedAt)
                      s.active.pausedMs += Date.now() - s.active.pausedAt;
                    s.active.pausedAt = null;
                    s.active.restUntil = null;
                    s.history.push(s.active);
                  }
                  s.active = null;
                });
                setConfirm(null);
                navigate("Today");
                if (confirm === "finish") showWorkout(id);
              }}
            >
              {confirm === "finish" ? "Save workout" : "Discard session"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
