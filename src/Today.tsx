import { Play, ArrowRight, CalendarDays, Check, RotateCcw } from "lucide-react";
import {
  type State,
  type Program,
  formatDate,
  fromKg,
  localDay,
} from "./model";
import {
  nextProgram,
  weekHistory,
  machineStats,
  setCount,
  records,
  plannedCompletion,
  weightTrend,
} from "./logic";
import { Card, Heading, SectionTitle, Button, Empty, ArrowLink } from "./ui";
import { MachineVisual } from "./MachineVisual";

export function Today({
  state: s,
  start,
  navigate,
  showWorkout,
  openMachine,
}: {
  state: State;
  start: (p: Program) => void;
  navigate: (page: string) => void;
  showWorkout: (id: string) => void;
  openMachine: (id: string) => void;
}) {
  const next = nextProgram(s);
  const last = [...s.history].sort(
    (a, b) => (b.finished ?? 0) - (a.finished ?? 0),
  )[0];
  const weight = [...s.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  const trend = weightTrend(s);
  const { planned, matched, extra } = plannedCompletion(s);
  const weekly = weekHistory(s);
  const today = next && localDay(next.date) === localDay();
  const plan = s.active
    ? s.active.entries.map((e) => ({
        id: e.id,
        name: e.exerciseName,
        machineId: e.machineId,
        machineName: e.machineName,
        sets: e.targetSets,
        min: e.min,
        max: e.max,
        done: e.sets.length > 0 && e.sets.every((s) => s.done),
      }))
    : (next?.program.items ?? []).map((p) => ({
        ...p,
        name:
          s.exercises.find((e) => e.id === p.exerciseId)?.name ?? "Exercise",
        machineName:
          s.machines.find((m) => m.id === p.machineId && !m.archived)?.name ??
          "Choose equipment in your session",
        sets: s.profile.intro ? Math.min(p.sets, 2) : p.sets,
        done: false,
      }));
  const first = plan.find((p) => !p.done) ?? plan[0];
  const used = s.machines
    .map((m) => ({ m, stats: machineStats(s, m.id) }))
    .filter((x) => x.stats.last)
    .sort((a, b) => b.stats.last! - a.stats.last!)
    .slice(0, 3);
  const improvements = [...s.history]
    .sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0))
    .flatMap((w) => records(s, w).filter((r) => !r.first))
    .slice(0, 3);
  return (
    <div className="simple-today">
      <Heading
        eyebrow={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title={`Let’s build, ${s.profile.name || "you"}.`}
        subtitle="Your next step is all you need."
      />
      <section className="today-start card">
        <div className="today-start-copy">
          <span className="pill">
            <CalendarDays size={14} />
            {s.active
              ? "CONTINUE YOUR SESSION"
              : today
                ? "TODAY’S WORKOUT"
                : "NEXT WORKOUT"}
          </span>
          <h2>
            {s.active?.name ?? next?.program.name ?? "Make your first plan"}
          </h2>
          <p>
            {plan.length} exercises · {s.profile.minutes} min target
            {!today && !s.active && next
              ? " · " + formatDate(next.date.getTime())
              : ""}
          </p>
          <p className="today-coach-copy">
            We’ll walk through each machine, set, and rest together.
          </p>
          <Button
            variant="primary large full"
            onClick={() =>
              s.active
                ? navigate("Workout")
                : next
                  ? start(next.program)
                  : navigate("Programs")
            }
          >
            <Play size={18} fill="currentColor" />
            {s.active
              ? "Resume workout"
              : next
                ? "Start workout"
                : "Create a program"}
            <ArrowRight size={18} />
          </Button>
          <small>
            {s.active
              ? "Saved on this device. Pick up where you left off."
              : "Start light. Get comfortable. Build from there."}
          </small>
        </div>
        {first && (
          <div className="today-first-machine">
            <MachineVisual
              machine={s.machines.find((m) => m.id === first.machineId)}
            />
            <small>{s.active ? "YOUR NEXT MACHINE" : "START HERE"}</small>
            <strong>{first.machineName}</strong>
          </div>
        )}
      </section>
      <div className="today-rhythm">
        <div>
          <span className="rhythm-checks" aria-hidden="true">
            {Array.from(
              { length: planned || s.profile.days.length },
              (_, i) => (
                <span key={i} className={i < matched ? "done" : ""}>
                  {i < matched && <Check size={14} />}
                </span>
              ),
            )}
          </span>
          <strong>
            {matched}/{planned || s.profile.days.length} this week
          </strong>
          {extra > 0 && <small>+{extra} extra</small>}
        </div>
        <button className="text-button" onClick={() => navigate("Progress")}>
          See progress <ArrowRight size={16} />
        </button>
      </div>
      <section className="today-plan">
        <SectionTitle
          title="Your machine plan"
          extra={
            <ArrowLink onClick={() => navigate("Machines")}>
              All machines
            </ArrowLink>
          }
        />
        {plan.length ? (
          <div className="visual-plan">
            {plan.map((item, i) => (
              <button
                className="exercise-preview plan-link visual-plan-item"
                key={item.id}
                onClick={() =>
                  item.machineId
                    ? openMachine(item.machineId)
                    : navigate(s.active ? "Workout" : "Programs")
                }
              >
                <MachineVisual
                  compact
                  machine={s.machines.find((m) => m.id === item.machineId)}
                />
                <div>
                  <small className="plan-step">
                    {item.done ? "COMPLETE" : String(i + 1).padStart(2, "0")}
                  </small>
                  <strong>{item.name}</strong>
                  <small>
                    {item.machineName} · {item.sets} × {item.min}–{item.max}
                  </small>
                </div>
                {item.done ? (
                  <Check className="accent" size={18} />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title="A plan makes it easier"
            description="Pick your exercises and machines once. We’ll guide you from there."
            action={
              <Button onClick={() => navigate("Programs")}>
                Build a program
              </Button>
            }
          />
        )}
      </section>
      {last && (
        <Card className="today-last">
          <div>
            <small>LAST WORKOUT · {formatDate(last.finished!)}</small>
            <button
              className="text-button"
              onClick={() => showWorkout(last.id)}
            >
              <strong>{last.name}</strong>
              <ArrowRight size={16} />
            </button>
            <small>{setCount(last)} working sets completed</small>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              start({
                id: last.programId,
                name: last.name,
                days: [],
                archived: false,
                items: last.entries.map((e) => ({
                  id: e.id,
                  exerciseId: e.exerciseId,
                  machineId: e.machineId,
                  sets: e.targetSets,
                  min: e.min,
                  max: e.max,
                  rest: e.rest,
                })),
              })
            }
          >
            <RotateCcw size={16} />
            Repeat last workout
          </Button>
        </Card>
      )}
      <details className="today-details">
        <summary>Progress & recent machines</summary>
        <div className="simple-insights">
          <Card>
            <SectionTitle title="Bodyweight" />
            <strong className="insight-value">
              {weight
                ? fromKg(weight.kg, s.profile.units) + " " + s.profile.units
                : "Add your first weigh-in"}
            </strong>
            <p className="muted">
              {trend.delta !== null
                ? (trend.delta > 0 ? "+" : "") +
                  fromKg(trend.delta, s.profile.units) +
                  " " +
                  s.profile.units +
                  " · weekly average change"
                : "Log across two weeks to see your trend."}
            </p>
            <ArrowLink onClick={() => navigate("Nutrition")}>
              Log weight
            </ArrowLink>
          </Card>
          <Card>
            <SectionTitle title="This week" />
            <p>
              {weekly.reduce((n, w) => n + setCount(w), 0)} working sets ·{" "}
              {s.history.length} total sessions
            </p>
            <ArrowLink onClick={() => navigate("Progress")}>
              Weekly review
            </ArrowLink>
          </Card>
          <Card>
            <SectionTitle title="Recent strength improvements" />
            {improvements.length ? (
              improvements.map((r, i) => (
                <div className="list-line" key={i}>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{r.machine}</small>
                  </div>
                  <strong>
                    +{fromKg(r.kg - r.previousKg!, s.profile.units)}{" "}
                    {s.profile.units}
                  </strong>
                </div>
              ))
            ) : (
              <p className="muted">
                Your first workouts establish a baseline. Your improvements will
                appear here.
              </p>
            )}
          </Card>
          <Card>
            <SectionTitle title="Recently used" />
            {used.length ? (
              used.map(({ m, stats }) => (
                <button
                  key={m.id}
                  className="list-line plan-link"
                  onClick={() => openMachine(m.id)}
                >
                  <MachineVisual compact machine={m} />
                  <span>
                    <strong>{m.name}</strong>
                    <small>
                      {formatDate(stats.last!)} · {stats.sessions} sessions
                    </small>
                  </span>
                </button>
              ))
            ) : (
              <p className="muted">
                Your recently used machines will appear after your first
                workout.
              </p>
            )}
          </Card>
        </div>
      </details>
      <p className="today-recovery">
        Leave roughly a day between full-body sessions. Still feeling fatigued?
        Take more time to recover.
      </p>
    </div>
  );
}
