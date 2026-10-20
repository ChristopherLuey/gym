import {
  Play,
  ArrowUpRight,
  CalendarDays,
  Check,
  Flame,
  Dumbbell,
  ArrowRight,
} from "lucide-react";
import {
  type State,
  type Program,
  formatDate,
  fromKg,
  days,
  localDay,
} from "./model";
import {
  nextProgram,
  weekHistory,
  machineStats,
  setCount,
  records,
  plannedCompletion,
} from "./logic";
import {
  Card,
  Heading,
  Stat,
  SectionTitle,
  Button,
  Empty,
  ArrowLink,
} from "./ui";
export function Today({
  state: s,
  start,
  navigate,
  showWorkout,
}: {
  state: State;
  start: (p: Program) => void;
  navigate: (page: string) => void;
  showWorkout: (id: string) => void;
}) {
  const next = nextProgram(s),
    weekly = weekHistory(s),
    last = s.history.at(-1),
    weight = [...s.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1),
    prior = [...s.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-2),
    used = s.machines
      .map((m) => ({ m, stats: machineStats(s, m.id) }))
      .filter((x) => x.stats.last)
      .sort((a, b) => b.stats.last! - a.stats.last!)
      .slice(0, 3),
    pb = last ? records(s, last) : [],
    today = next && localDay(next.date) === localDay();
  const { planned, matched, extra } = plannedCompletion(s);
  return (
    <>
      <Heading
        eyebrow={new Date()
          .toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
          .toUpperCase()}
        title={`Let’s build, ${s.profile.name || "you"}.`}
        subtitle="Small steps. Stronger every week."
        action={
          <span className="status-pill">
            <span />
            Your space to grow
          </span>
        }
      />
      <div className="today-grid">
        <div className="hero card">
          <div className="hero-top">
            <span className="pill">
              <CalendarDays size={14} />
              {s.active
                ? "WORKOUT IN PROGRESS"
                : today
                  ? "TODAY’S SESSION"
                  : "YOUR NEXT SESSION"}
            </span>
            <span className="muted">
              {s.active
                ? "Ready when you are"
                : next
                  ? formatDate(next.date.getTime())
                  : "Make a plan"}
            </span>
          </div>
          <div className="hero-content">
            <div>
              <h2>
                {s.active?.name ?? next?.program.name ?? "Your next chapter"}
              </h2>
              <p>
                {s.profile.intro
                  ? "Build your foundation."
                  : "Show up. Find your rhythm."}
                <br />A little stronger than before.
              </p>
              <div className="hero-meta">
                <span>
                  {s.active?.entries.length ?? next?.program.items.length ?? 0}{" "}
                  exercises
                </span>
                <span>{s.profile.minutes} min target</span>
                <span>
                  {s.profile.intro ? "Foundation phase" : "Hypertrophy"}
                </span>
              </div>
            </div>
            <div className="strength-art" aria-hidden="true">
              <div className="orbit one" />
              <div className="orbit two" />
              <div className="orbit three" />
              <Dumbbell />
            </div>
          </div>
          <Button
            variant="primary large"
            onClick={() =>
              s.active
                ? navigate("Workout")
                : next
                  ? start(next.program)
                  : navigate("Programs")
            }
          >
            <Play size={19} fill="currentColor" />
            {s.active
              ? "Resume workout"
              : next
                ? "Start workout"
                : "Create a program"}
            <ArrowRight size={18} />
          </Button>
          <small className="hero-foot">
            {s.active
              ? "Your session is saved on this device."
              : "Your plan is ready. Make this time yours."}
          </small>
        </div>
        <Card className="week-card">
          <SectionTitle
            title="This week"
            extra={<Flame size={19} className="accent" />}
          />
          <div className="week-count">
            {matched}
            <span> / {planned || s.profile.days.length}</span>
          </div>
          <p>
            planned sessions completed{extra > 0 ? ` · ${extra} extra` : ""}
          </p>
          <div className="week-days">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const date = new Date();
              date.setDate(
                date.getDate() - ((date.getDay() + 6) % 7) + ((d + 6) % 7),
              );
              const done = weekly.some(
                (w) => localDay(new Date(w.finished!)) === localDay(date),
              );
              return (
                <div key={d}>
                  <span>{days[d][0]}</span>
                  <div
                    className={
                      done
                        ? "done"
                        : s.profile.days.includes(d)
                          ? "planned"
                          : ""
                    }
                  >
                    {done ? (
                      <Check size={15} />
                    ) : d === new Date().getDay() ? (
                      <span className="today-dot" />
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divider" />
          <p className="small">
            {matched >= planned && planned > 0
              ? "You completed every planned session this week. Keep recovery part of the plan."
              : weekly.length
                ? "Every session is a step forward. Keep your next one simple."
                : "Your week starts with one good session."}
          </p>
        </Card>
      </div>
      <div className="stats-grid">
        <Card>
          <Stat
            label="BODYWEIGHT"
            value={
              weight ? (
                <>
                  {fromKg(weight.kg, s.profile.units)}{" "}
                  <em>{s.profile.units}</em>
                </>
              ) : (
                "—"
              )
            }
            detail={
              weight && prior
                ? `${fromKg(weight.kg - prior.kg, s.profile.units) > 0 ? "+" : ""}${fromKg(weight.kg - prior.kg, s.profile.units)} ${s.profile.units} since previous entry`
                : "Add a weigh-in to see your trend"
            }
          />
          <ArrowLink onClick={() => navigate("Nutrition")}>
            Log weight
          </ArrowLink>
        </Card>
        <Card>
          <Stat
            label="WORKING SETS THIS WEEK"
            value={weekly.reduce((n, w) => n + setCount(w), 0)}
            detail="Good reps add up."
          />
          <ArrowLink onClick={() => navigate("Progress")}>
            Explore progress
          </ArrowLink>
        </Card>
        <Card>
          <Stat
            label="YOUR TRAINING RHYTHM"
            value={s.history.length}
            detail="Total completed sessions"
          />
          <ArrowLink onClick={() => navigate("Progress")}>
            Weekly review
          </ArrowLink>
        </Card>
      </div>
      <div className="split-grid">
        <Card>
          <SectionTitle
            title="Your machine plan"
            extra={
              <ArrowLink onClick={() => navigate("Machines")}>
                All machines
              </ArrowLink>
            }
          />
          {next ? (
            next.program.items.map((item, i) => {
              const e = s.exercises.find((e) => e.id === item.exerciseId),
                m = s.machines.find(
                  (m) => m.id === item.machineId && !m.archived,
                );
              return (
                <div className="exercise-preview" key={item.id}>
                  <span className="number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{e?.name}</strong>
                    <small>
                      {m?.name ?? "Choose equipment in your session"} ·{" "}
                      {s.profile.intro ? Math.min(item.sets, 2) : item.sets} ×{" "}
                      {item.min}–{item.max}
                    </small>
                  </div>
                  <span className="muscle-tag">{e?.muscles[0]}</span>
                </div>
              );
            })
          ) : (
            <Empty
              title="A plan makes it easier"
              description="Create your first program to organize exercises and machines."
              action={
                <Button onClick={() => navigate("Programs")}>
                  Build a program
                </Button>
              }
            />
          )}
        </Card>
        <div className="stack">
          <Card>
            <SectionTitle title="Last time you showed up" />
            {last ? (
              <>
                <button
                  className="workout-link"
                  onClick={() => showWorkout(last.id)}
                >
                  <span className="icon-box">
                    <Dumbbell />
                  </span>
                  <span>
                    <strong>{last.name}</strong>
                    <small>
                      {formatDate(last.finished!)} · {setCount(last)} working
                      sets
                    </small>
                  </span>
                  <ArrowUpRight />
                </button>
                <p className="small">
                  {pb.length
                    ? `${pb.length} machine-specific load ${pb.length === 1 ? "record" : "records"} logged.`
                    : "A session in the bank. That is progress."}
                </p>
                <Button
                  variant="secondary full"
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
                  Repeat last workout
                </Button>
              </>
            ) : (
              <p className="muted">
                Your first finished workout will live here. Start small and make
                it count.
              </p>
            )}
          </Card>
          <Card>
            <SectionTitle title="Recently used" />
            {used.length ? (
              used.map(({ m, stats }) => (
                <div className="list-line" key={m.id}>
                  <div>
                    <strong>{m.name}</strong>
                    <small>
                      {formatDate(stats.last!)} · {stats.sessions} sessions
                    </small>
                  </div>
                  <Dumbbell size={16} />
                </div>
              ))
            ) : (
              <p className="muted">
                Log a set to start building your equipment history.
              </p>
            )}
          </Card>
          <div className="recovery-note">
            <span className="accent">RECOVERY IS PART OF THE PLAN</span>
            <p>
              Leave roughly a day between full-body sessions when possible. If
              you still feel fatigued, adjust the load or take another rest day.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
