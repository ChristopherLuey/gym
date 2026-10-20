import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, Trophy, ArrowUpRight } from "lucide-react";
import { type State, fromKg, formatDate, localDay, uid } from "./model";
import {
  volume,
  setCount,
  machineStats,
  working,
  weekHistory,
  records,
  plannedCompletion,
  trainingFrequency,
} from "./logic";
import { change } from "./db";
import {
  Button,
  Card,
  Empty,
  Field,
  Heading,
  SectionTitle,
  Stat,
  Modal,
} from "./ui";
type Point = { label: string; value: number };
function Chart({
  data,
  label,
  bar = false,
}: {
  data: Point[];
  label: string;
  bar?: boolean;
}) {
  return data.length ? (
    <div
      className="chart"
      role="img"
      aria-label={`${label}. ${data.map((p) => `${p.label}: ${Math.round(p.value * 10) / 10}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height={235}>
        {bar ? (
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -24, bottom: 5 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text)",
              }}
            />
            <Bar
              dataKey="value"
              name={label}
              fill="var(--accent)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -24, bottom: 5 }}
          >
            <defs>
              <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text)",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={label}
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill="url(#chart-fill)"
              dot={{ r: 3, fill: "var(--accent)" }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty
      title="Your story starts here"
      description={`Log your first ${label.toLowerCase()} entry to see your trend.`}
    />
  );
}
export default function Progress({
  state: s,
  showWorkout,
}: {
  state: State;
  showWorkout: (id: string) => void;
}) {
  const [range, setRange] = useState(30),
    [tab, setTab] = useState("Overview"),
    [exercise, setExercise] = useState(s.exercises[0].id),
    [machine, setMachine] = useState(""),
    [measure, setMeasure] = useState(false),
    [part, setPart] = useState("Arms"),
    [cm, setCm] = useState("");
  const since = range ? Date.now() - range * 86400000 : 0;
  const history = s.history.filter((w) => (w.finished ?? 0) >= since);
  const weekly = weekHistory(s);
  const { planned: target, matched, extra } = plannedCompletion(s);
  const weightData = s.weights
    .filter((w) => new Date(w.date + "T12:00:00").getTime() >= since)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      label: formatDate(w.date),
      value: fromKg(w.kg, s.profile.units),
    }));
  const volumeData = history.map((w) => ({
    label: formatDate(w.finished!),
    value: Math.round(fromKg(volume(w), s.profile.units)),
  }));
  const stats = s.machines
    .map((m) => ({ m, st: machineStats(s, m.id, history) }))
    .filter((x) => x.st.sessions)
    .sort((a, b) => b.st.sessions - a.st.sessions);
  const strengthData = history.flatMap((w) => {
    const sets = w.entries
      .filter((e) => e.exerciseId === exercise && e.machineId === machine)
      .flatMap(working);
    return sets.length
      ? [
          {
            label: formatDate(w.finished!),
            value: fromKg(Math.max(...sets.map((s) => s.kg)), s.profile.units),
          },
        ]
      : [];
  });
  const coverage: Record<string, number> = {};
  history.forEach((w) =>
    w.entries.forEach((e) =>
      e.muscles.forEach(
        (m) => (coverage[m] = (coverage[m] ?? 0) + working(e).length),
      ),
    ),
  );
  const pbs = useMemo(
    () =>
      history
        .flatMap((w) => records(s, w).map((r) => ({ ...r, date: w.finished! })))
        .reverse(),
    [s, range],
  );
  return (
    <>
      <Heading
        eyebrow="THE WORK ADDS UP"
        title="See your strength grow."
        subtitle="Your progress, grounded in what you actually do."
        action={
          <div className="range-control">
            {[
              [7, "Week"],
              [30, "Month"],
              [90, "3 months"],
              [0, "All time"],
            ].map(([n, label]) => (
              <button
                key={n}
                aria-pressed={range === n}
                className={range === n ? "active" : ""}
                onClick={() => setRange(Number(n))}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div className="tabs">
        {["Overview", "Machine usage", "History"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <div className="stats-grid">
            <Card>
              <Stat
                label="SESSIONS"
                value={history.length}
                detail={`${matched} of ${target} planned this week${extra ? ` · ${extra} extra` : ""}`}
              />
            </Card>
            <Card>
              <Stat
                label="WORKING SETS"
                value={history.reduce((n, w) => n + setCount(w), 0)}
                detail="Completed sets, excluding warm-ups"
              />
            </Card>
            <Card>
              <Stat
                label={`TOTAL VOLUME · ${s.profile.units.toUpperCase()}`}
                value={Math.round(
                  fromKg(
                    history.reduce((n, w) => n + volume(w), 0),
                    s.profile.units,
                  ),
                ).toLocaleString()}
                detail="Load × reps, across completed working sets"
              />
            </Card>
          </div>
          <Card className="growth-overview">
            <TrendingUp className="accent" />
            <div>
              <span className="eyebrow">
                MUSCLE GROWTH · THE BUILDING BLOCKS
              </span>
              <h2>
                {weekly.length
                  ? "You’re putting in the work."
                  : "Build a rhythm you can keep."}
              </h2>
              <p>
                {weekly.length} sessions this week. {stats.length} machines used
                in this view.{" "}
                {weightData.length >= 2
                  ? `Bodyweight moved from ${weightData[0].value} to ${weightData.at(-1)!.value} ${s.profile.units}.`
                  : "Add regular weigh-ins to understand your weight trend."}{" "}
                {pbs.filter((r) => !r.first).length} improvements over an
                earlier load record in this view, each measured on the same
                exercise and machine.
              </p>
              <small>
                These are training and bodyweight signals, not a measurement of
                muscle mass. Different machines have different resistance.
              </small>
            </div>
          </Card>
          <div className="split-grid">
            <Card>
              <SectionTitle
                title="Bodyweight"
                extra={<span className="muted">{s.profile.units}</span>}
              />
              <Chart
                data={weightData}
                label={`Bodyweight (${s.profile.units})`}
              />
            </Card>
            <Card>
              <SectionTitle
                title="Training volume"
                extra={<span className="muted">{s.profile.units} × reps</span>}
              />
              <Chart data={volumeData} label="Working volume" bar />
            </Card>
          </div>
          <Card>
            <SectionTitle title="Weekly training frequency" />
            <Chart
              data={trainingFrequency(history).map((p) => ({
                label: formatDate(p.date),
                value: p.value,
              }))}
              label="Completed sessions per week"
              bar
            />
          </Card>
          <Card>
            <SectionTitle title="Strength, one setup at a time" />
            <div className="form-grid">
              <Field label="Exercise">
                <select
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                >
                  {s.exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Machine">
                <select
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                >
                  <option value="">Unassigned / bodyweight</option>
                  {s.machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.archived ? " (archived)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Chart
              data={strengthData}
              label={`Heaviest working set (${s.profile.units})`}
            />
            <p className="small muted">
              Each point is the heaviest completed working set for this exact
              exercise and machine. Compare equivalent equipment by switching
              this filter; records stay separate.
            </p>
          </Card>
          <div className="split-grid">
            <Card>
              <SectionTitle title="Muscle-group volume" />
              <Chart
                data={Object.entries(coverage).map(([label, value]) => ({
                  label,
                  value,
                }))}
                label="Direct working sets"
                bar
              />
            </Card>
            <Card>
              <SectionTitle
                title="Personal records"
                extra={<Trophy size={18} className="accent" />}
              />
              {pbs.length ? (
                pbs.slice(0, 8).map((r, i) => (
                  <div className="record" key={i}>
                    <Trophy size={16} />
                    <div>
                      <strong>{r.name}</strong>
                      <small>
                        {r.machine} · {formatDate(r.date)}
                        {r.first ? " · First recorded best" : ""}
                      </small>
                    </div>
                    <b>
                      {fromKg(r.kg, s.profile.units)}
                      <small>{s.profile.units}</small>
                    </b>
                  </div>
                ))
              ) : (
                <Empty
                  title="Room for your first best"
                  description="Complete working sets to establish your machine-specific load records."
                />
              )}
            </Card>
          </div>
          <Card>
            <SectionTitle
              title="Body measurements"
              extra={
                <Button variant="ghost" onClick={() => setMeasure(true)}>
                  + Add measurement
                </Button>
              }
            />
            {s.measurements.length ? (
              s.measurements
                .slice(-8)
                .reverse()
                .map((m) => (
                  <div className="list-line" key={m.id}>
                    <span>
                      {m.part}
                      <small>{formatDate(m.date)}</small>
                    </span>
                    <strong>{m.cm} cm</strong>
                  </div>
                ))
            ) : (
              <p className="muted">
                Optional. Track chest, shoulders, arms, waist, or thighs at your
                own pace.
              </p>
            )}
          </Card>
        </>
      )}
      {tab === "Machine usage" && (
        <>
          <div className="split-grid">
            <Card>
              <SectionTitle title="Most-used machines" />
              <Chart
                data={stats
                  .slice(0, 6)
                  .map(({ m, st }) => ({ label: m.name, value: st.sessions }))}
                label="Sessions"
                bar
              />
            </Card>
            <Card>
              <SectionTitle title="Usage over time" />
              <Chart
                data={history.map((w) => ({
                  label: formatDate(w.finished!),
                  value: new Set(
                    w.entries
                      .filter((e) => working(e).length)
                      .map((e) => e.machineId)
                      .filter(Boolean),
                  ).size,
                }))}
                label="Machines used"
              />
            </Card>
          </div>
          {stats.length ? (
            stats.map(({ m, st }) => (
              <Card key={m.id}>
                <div className="row">
                  <div>
                    <h3>{m.name}</h3>
                    <p className="muted small">
                      {m.muscles.join(" · ")} · Last used {formatDate(st.last!)}
                    </p>
                  </div>
                  <span className="pill">{st.sessions} sessions</span>
                </div>
                <div className="stats-grid compact">
                  <Stat label="Sets" value={st.sets} />
                  <Stat label="Reps" value={st.reps} />
                  <Stat
                    label={`Volume · ${s.profile.units}`}
                    value={Math.round(
                      fromKg(st.volume, s.profile.units),
                    ).toLocaleString()}
                  />
                </div>
                <p className="small">{st.exercises.join(" · ")}</p>
                {pbs
                  .filter((p) => p.machineId === m.id)
                  .slice(0, 3)
                  .map((p, i) => (
                    <p className="accent small" key={i}>
                      {p.name}: {fromKg(p.kg, s.profile.units)}{" "}
                      {s.profile.units} load record · {formatDate(p.date)}
                    </p>
                  ))}
              </Card>
            ))
          ) : (
            <Empty
              title="Get to know your gym"
              description="Your machine usage will appear after your first completed session."
            />
          )}
        </>
      )}
      {tab === "History" && (
        <>
          <Card>
            <SectionTitle title="This week’s review" />
            <p>
              {matched} of {target} planned sessions completed, plus {extra}{" "}
              extra sessions, with {weekly.reduce((n, w) => n + setCount(w), 0)}{" "}
              working sets.
            </p>
            <p className="muted small">
              Plan counts reflect your current schedule. A planned completion
              matches a program and its scheduled calendar day. Repeat sessions
              and sessions on other days are tracked as extras.
            </p>
          </Card>
          {history.length ? (
            history
              .slice()
              .reverse()
              .map((w) => (
                <button
                  className="card history-card"
                  key={w.id}
                  onClick={() => showWorkout(w.id)}
                >
                  <div>
                    <strong>{w.name}</strong>
                    <small>
                      {formatDate(w.finished!)} · {setCount(w)} working sets ·{" "}
                      {
                        new Set(
                          w.entries
                            .filter((e) => working(e).length)
                            .map((e) => e.machineId),
                        ).size
                      }{" "}
                      equipment setups
                    </small>
                  </div>
                  <ArrowUpRight size={20} />
                </button>
              ))
          ) : (
            <Empty
              title="Your training story"
              description="Finish a workout to begin your history. Every real session matters."
            />
          )}
        </>
      )}
      {measure && (
        <Modal title="Add a measurement" onClose={() => setMeasure(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await change((s) => {
                s.measurements.push({
                  id: uid(),
                  date: localDay(),
                  part: part as State["measurements"][number]["part"],
                  cm: Number(cm),
                });
              });
              setMeasure(false);
            }}
          >
            <Field label="Body area">
              <select value={part} onChange={(e) => setPart(e.target.value)}>
                {["Chest", "Shoulders", "Arms", "Waist", "Thighs"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Measurement (cm)">
              <input
                required
                type="number"
                min="1"
                max="500"
                step="0.1"
                value={cm}
                onChange={(e) => setCm(e.target.value)}
              />
            </Field>
            <Button variant="primary">Save measurement</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
