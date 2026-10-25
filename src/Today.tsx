import { Play, ArrowRight, CalendarDays, Check, RotateCcw } from "lucide-react";
import {
  type State,
  type Program,
  formatDate,
  localDay,
  repTarget,
} from "./model";
import {
  nextProgram,
  setCount,
  plannedCompletion,
  repeatProgram,
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
  const { planned, matched, extra } = plannedCompletion(s);
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
          "Choose equipment",
        sets: p.sets,
        done: false,
      }));
  const first = plan.find((p) => !p.done) ?? plan[0];
  return (
    <div className="simple-today">
      <Heading
        eyebrow={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title="Today"
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
            {s.active?.name ?? next?.program.name ?? "No program selected"}
          </h2>
          <p>
            {plan.length} exercises · {s.profile.minutes} min target
            {!today && !s.active && next
              ? " · " + formatDate(next.date.getTime())
              : ""}
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
                    {item.machineName} · {item.sets} ×{" "}
                    {repTarget(item.min, item.max)}
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
            title="No program yet"
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
            onClick={() => start(repeatProgram(last))}
          >
            <RotateCcw size={16} />
            Repeat last workout
          </Button>
        </Card>
      )}
    </div>
  );
}
