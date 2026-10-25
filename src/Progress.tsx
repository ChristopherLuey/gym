import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import {
  TrendingUp,
  Trophy,
  ArrowUpRight,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { type State, fromKg, formatDate, localDay, uid } from "./model";
import {
  volume,
  setCount,
  machineStats,
  working,
  records,
  plannedCompletion,
  trainingFrequency,
} from "./logic";
import { change } from "./db";
import { MachineVisual } from "./MachineVisual";
import { Button, Card, Field, Heading, SectionTitle, Stat, Modal } from "./ui";
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
  const fillId = useId();
  return data.length ? (
    <div
      className="chart"
      role="img"
      aria-label={`${label}. ${data.map((p) => `${p.label}: ${Math.round(p.value * 10) / 10}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height={210}>
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
              isAnimationActive={false}
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
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
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
              isAnimationActive={false}
              type="monotone"
              dataKey="value"
              name={label}
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              dot={{ r: 3, fill: "var(--accent)" }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  ) : (
    <div className="progress-chart-empty">
      <TrendingUp size={24} aria-hidden="true" />
      <span>No data yet</span>
    </div>
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
    [chart, setChart] = useState("Strength"),
    [selection, setSelection] = useState(""),
    [detailsOpen, setDetailsOpen] = useState(false),
    [measure, setMeasure] = useState(false),
    [part, setPart] = useState("Arms"),
    [cm, setCm] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);
  const previousTab = useRef(tab);
  useEffect(() => {
    if (previousTab.current === tab) return;
    previousTab.current = tab;
    const heading = pageRef.current?.querySelector<HTMLElement>(
      tab === "Overview" ? ".page-heading h1" : ".progress-subhead h2",
    );
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [tab]);
  const since = range ? Date.now() - range * 86400000 : 0;
  const history = s.history
    .filter((w) => (w.finished ?? 0) >= since)
    .sort((a, b) => a.finished! - b.finished!);
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
  // Only offer combinations with logged sets, keeping each machine's loads separate.
  const combinations = new Map<
    string,
    { exerciseId: string; machineId: string; label: string }
  >();
  history
    .slice()
    .reverse()
    .forEach((w) =>
      w.entries
        .filter((e) => working(e).length)
        .forEach((e) => {
          const key = JSON.stringify([e.exerciseId, e.machineId]);
          const machineName =
            s.machines.find((m) => m.id === e.machineId)?.name ||
            e.machineName ||
            "Unassigned";
          if (!combinations.has(key))
            combinations.set(key, {
              exerciseId: e.exerciseId,
              machineId: e.machineId,
              label:
                e.exerciseName.toLowerCase() === machineName.toLowerCase()
                  ? e.exerciseName
                  : `${e.exerciseName} · ${machineName}`,
            });
        }),
    );
  const selectedKey = combinations.has(selection)
    ? selection
    : ([...combinations.keys()][0] ?? "");
  const selected = combinations.get(selectedKey);
  const strengthData = history.flatMap((w) => {
    const sets = w.entries
      .filter(
        (e) =>
          e.exerciseId === selected?.exerciseId &&
          e.machineId === selected?.machineId,
      )
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
  const chartData = chart === "Strength" ? strengthData : weightData;
  const latest = chartData.at(-1);
  const workoutRows = (limit?: number) =>
    history
      .slice()
      .reverse()
      .slice(0, limit)
      .map((w) => (
        <button
          className="history-card progress-workout"
          key={w.id}
          onClick={() => showWorkout(w.id)}
        >
          <div>
            <strong>{w.name}</strong>
            <small>
              {formatDate(w.finished!)} · {setCount(w)} sets
            </small>
          </div>
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      ));
  return (
    <div className="simple-progress" ref={pageRef}>
      <Heading
        title="Progress"
        action={
          <select
            className="progress-range"
            aria-label="Progress period"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            {[
              [7, "Week"],
              [30, "Month"],
              [90, "3 months"],
              [0, "All time"],
            ].map(([n, label]) => (
              <option key={n} value={n}>
                {label}
              </option>
            ))}
          </select>
        }
      />
      {tab !== "Overview" && (
        <div className="progress-subhead">
          <Button
            variant="icon ghost"
            aria-label="Back to overview"
            onClick={() => setTab("Overview")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h2>{tab}</h2>
        </div>
      )}
      {tab === "Overview" && (
        <>
          <Card className="progress-summary">
            <Stat label="Workouts" value={history.length} />
            <Stat
              label="Sets"
              value={history.reduce((n, w) => n + setCount(w), 0)}
            />
            <Stat
              label="New records"
              value={pbs.filter((r) => !r.first).length}
            />
          </Card>
          <Card className="progress-main-chart">
            <div className="progress-chart-switch" aria-label="Chart">
              {["Strength", "Bodyweight"].map((name) => (
                <button
                  key={name}
                  aria-pressed={chart === name}
                  onClick={() => setChart(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            {chart === "Strength" && combinations.size > 0 && (
              <select
                aria-label="Exercise and machine"
                value={selectedKey}
                onChange={(e) => setSelection(e.target.value)}
              >
                {[...combinations].map(([key, combo]) => (
                  <option key={key} value={key}>
                    {combo.label}
                  </option>
                ))}
              </select>
            )}
            {latest && (
              <div className="progress-chart-value">
                <strong>
                  {latest.value}
                  <span>{s.profile.units}</span>
                </strong>
                <small>
                  {chart === "Strength" ? "Heaviest set" : "Latest weight"} ·{" "}
                  {latest.label}
                </small>
              </div>
            )}
            <Chart
              data={chartData}
              label={`${chart === "Strength" ? "Heaviest working set" : "Bodyweight"} (${s.profile.units})`}
            />
          </Card>
          <Card className="progress-workouts">
            <SectionTitle
              title="Recent workouts"
              extra={
                <Button variant="ghost" onClick={() => setTab("History")}>
                  History <ArrowUpRight size={16} aria-hidden="true" />
                </Button>
              }
            />
            {history.length ? (
              workoutRows(3)
            ) : (
              <p className="muted small">No workouts yet</p>
            )}
          </Card>
          <details
            className="progress-details"
            open={detailsOpen}
            onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
          >
            <summary>
              Details <ChevronDown size={18} aria-hidden="true" />
            </summary>
            {detailsOpen && (
              <div>
                <Button
                  className="progress-detail-link"
                  variant="full"
                  onClick={() => setTab("Machine usage")}
                >
                  Machine usage <ArrowUpRight size={18} aria-hidden="true" />
                </Button>
                <Card>
                  <SectionTitle title="Personal records" />
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
                    <p className="muted small">No records yet</p>
                  )}
                </Card>
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
                    <p className="muted">No measurements yet.</p>
                  )}
                </Card>
                <Card>
                  <SectionTitle
                    title="Training volume"
                    extra={
                      <span className="muted small">
                        {s.profile.units} × reps
                      </span>
                    }
                  />
                  <Chart data={volumeData} label="Working volume" bar />
                </Card>
                <div className="split-grid">
                  <Card>
                    <SectionTitle title="Workouts per week" />
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
                    <SectionTitle title="Sets by muscle" />
                    <Chart
                      data={Object.entries(coverage).map(([label, value]) => ({
                        label,
                        value,
                      }))}
                      label="Direct working sets"
                      bar
                    />
                  </Card>
                </div>
              </div>
            )}
          </details>
        </>
      )}
      {tab === "Machine usage" && (
        <>
          <Card>
            <SectionTitle title="Most-used machines" />
            {stats.length ? (
              stats.map(({ m, st }) => (
                <details className="progress-machine" key={m.id}>
                  <summary>
                    <MachineVisual machine={m} compact />
                    <div>
                      <strong>{m.name}</strong>
                      <small>{formatDate(st.last!)}</small>
                    </div>
                    <span>{st.sessions}×</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
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
                  <p className="small muted">{m.muscles.join(" · ")}</p>
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
                </details>
              ))
            ) : (
              <p className="muted small">No machine usage yet</p>
            )}
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
        </>
      )}
      {tab === "History" && (
        <>
          <Card className="progress-week">
            <span>This week</span>
            <strong>
              {matched}/{target} planned{extra > 0 ? ` · ${extra} extra` : ""}
            </strong>
          </Card>
          <Card className="progress-workouts">
            {history.length ? (
              workoutRows()
            ) : (
              <p className="muted small">No workouts yet</p>
            )}
          </Card>
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
    </div>
  );
}
