import { useState } from "react";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Play,
  BookOpen,
  Settings2,
} from "lucide-react";
import {
  type State,
  type Program,
  type Exercise,
  uid,
  days,
  fromKg,
  repTarget,
} from "./model";
import { change } from "./db";
import { working } from "./logic";
import { Button, Card, Field, Heading, Modal, SectionTitle } from "./ui";
export function ExerciseDetail({
  state: s,
  id,
  onClose,
}: {
  state: State;
  id: string;
  onClose: () => void;
}) {
  const e = s.exercises.find((e) => e.id === id);
  const [notes, setNotes] = useState(e?.notes ?? ""),
    [saved, setSaved] = useState(false);
  if (!e) return null;
  const history = s.history.flatMap((w) =>
    w.entries.filter((x) => x.exerciseId === id).map((entry) => ({ w, entry })),
  );
  const bests = new Map<string, { name: string; kg: number }>();
  for (const { entry } of history) {
    const sets = working(entry);
    if (!sets.length) continue;
    const kg = Math.max(...sets.map((s) => s.kg));
    if (!bests.has(entry.machineId) || kg > bests.get(entry.machineId)!.kg)
      bests.set(entry.machineId, { name: entry.machineName, kg });
  }
  return (
    <Modal title={e.name} onClose={onClose}>
      <div className="tag-row">
        {e.muscles.map((m) => (
          <span className="pill" key={m}>
            {m}
          </span>
        ))}
        {e.secondary.map((m) => (
          <span className="muscle-tag" key={m}>
            {m} · secondary
          </span>
        ))}
      </div>
      <h3>Equipment</h3>
      <p>{e.equipment}</p>
      <h3>Planned sets</h3>
      {s.programs
        .filter((p) => !p.archived)
        .flatMap((p) =>
          p.items
            .filter((i) => i.exerciseId === id)
            .map((i) => (
              <p className="small" key={`${p.id}-${i.id}`}>
                <strong>{p.name}</strong> · {i.sets} × {repTarget(i.min, i.max)}{" "}
                · {i.rest}s rest
                <br />
                {s.machines.find((m) => m.id === i.machineId)?.name ??
                  "Unassigned equipment"}
              </p>
            )),
        )}
      <h3>Alternatives</h3>
      <p>
        {e.alternatives
          .map((id) => {
            const alternative = s.exercises.find((x) => x.id === id);
            return alternative
              ? `${alternative.name} (${alternative.equipment})`
              : null;
          })
          .filter(Boolean)
          .join(" · ") || "None saved."}
      </p>
      <h3>Personal records by machine</h3>
      {bests.size ? (
        [...bests].map(([machine, best]) => (
          <div className="list-line" key={machine}>
            <span>{best.name}</span>
            <strong>
              {fromKg(best.kg, s.profile.units)} {s.profile.units}
            </strong>
          </div>
        ))
      ) : (
        <p className="muted">No records yet.</p>
      )}
      <p className="small muted">Heaviest working load per machine.</p>
      <Field label="Personal exercise notes">
        <textarea
          value={notes}
          maxLength={2000}
          onChange={(ev) => {
            setNotes(ev.target.value);
            setSaved(false);
          }}
          placeholder="Your cues, preferences, or limitations"
        />
      </Field>
      <Button
        onClick={async () => {
          await change((s) => {
            s.exercises.find((x) => x.id === id)!.notes = notes;
          });
          setSaved(true);
        }}
      >
        Save exercise notes
      </Button>
      {saved && <p role="status">Exercise notes saved.</p>}
      <h3>Exercise history</h3>
      {history.length ? (
        history
          .slice()
          .reverse()
          .map(({ w, entry }) => (
            <div className="list-line" key={entry.id}>
              <div>
                <strong>{entry.machineName}</strong>
                <small>{new Date(w.finished!).toLocaleDateString()}</small>
                {Object.entries(entry.setup)
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <small key={key}>
                      {key}: {value}
                    </small>
                  ))}
              </div>
              <span>
                {working(entry)
                  .map(
                    (set) =>
                      `${fromKg(set.kg, s.profile.units)} ${s.profile.units} × ${set.reps}`,
                  )
                  .join(" / ")}
              </span>
            </div>
          ))
      ) : (
        <p className="muted">No completed sets yet.</p>
      )}
    </Modal>
  );
}
export function ExerciseEditor({ onClose }: { onClose: () => void }) {
  const [e, setE] = useState<Exercise>({
    id: uid(),
    name: "",
    muscles: ["Shoulders"],
    secondary: [],
    equipment: "",
    instructions: "",
    mistakes: "",
    alternatives: [],
    notes: "",
  });
  return (
    <Modal title="Create an exercise" onClose={onClose}>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          await change((s) => {
            s.exercises.push(e);
          });
          onClose();
        }}
      >
        <Field label="Exercise name">
          <input
            required
            maxLength={120}
            value={e.name}
            onChange={(v) => setE({ ...e, name: v.target.value })}
          />
        </Field>
        <Field label="Primary muscle">
          <select
            value={e.muscles[0]}
            onChange={(v) => setE({ ...e, muscles: [v.target.value] })}
          >
            {[
              "Upper chest",
              "Chest",
              "Rear shoulders",
              "Back",
              "Shoulders",
              "Biceps",
              "Triceps",
              "Quads",
              "Hamstrings",
              "Glutes",
              "Calves",
              "Core",
            ].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Equipment">
          <input
            value={e.equipment}
            onChange={(v) => setE({ ...e, equipment: v.target.value })}
          />
        </Field>
        <Button variant="primary">Create exercise</Button>
      </form>
    </Modal>
  );
}
export function ProgramEditor({
  state: s,
  program,
  onClose,
}: {
  state: State;
  program: Program | null;
  onClose: () => void;
}) {
  const [p, setP] = useState<Program>(
    program
      ? structuredClone(program)
      : { id: uid(), name: "My program", days: [], items: [], archived: false },
  );
  const [add, setAdd] = useState(s.exercises[0].id),
    [error, setError] = useState("");
  const move = (i: number, d: number) => {
    const items = [...p.items];
    [items[i], items[i + d]] = [items[i + d], items[i]];
    setP({ ...p, items });
  };
  return (
    <Modal
      title={program ? "Edit program" : "Create a program"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!p.items.length) {
            setError("Add at least one exercise.");
            return;
          }
          try {
            await change((s) => {
              const i = s.programs.findIndex((x) => x.id === p.id);
              if (i < 0) s.programs.push(p);
              else s.programs[i] = p;
              s.profile.days = [
                ...new Set(
                  s.programs.filter((x) => !x.archived).flatMap((x) => x.days),
                ),
              ];
              if (!s.profile.days.length) s.profile.days = [1, 3, 5];
            });
            onClose();
          } catch {
            setError("Check your repetition ranges and try again.");
          }
        }}
      >
        <Field label="Program name">
          <input
            required
            maxLength={120}
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
          />
        </Field>
        <Field label="Scheduled days">
          <div className="days">
            {days.map((d, i) => (
              <button
                type="button"
                key={d}
                aria-pressed={p.days.includes(i)}
                className={p.days.includes(i) ? "selected" : ""}
                onClick={() =>
                  setP({
                    ...p,
                    days: p.days.includes(i)
                      ? p.days.filter((x) => x !== i)
                      : [...p.days, i],
                  })
                }
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </Field>
        {p.items.map((item, i) => (
          <div key={item.id} className="program-edit-item">
            <div className="row">
              <strong>
                {s.exercises.find((e) => e.id === item.exerciseId)?.name}
              </strong>
              <div className="row">
                <Button
                  type="button"
                  variant="icon ghost"
                  disabled={!i}
                  aria-label={`Move exercise ${i + 1} up`}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="icon ghost"
                  disabled={i === p.items.length - 1}
                  aria-label={`Move exercise ${i + 1} down`}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  type="button"
                  variant="icon ghost"
                  aria-label={`Remove exercise ${i + 1}`}
                  onClick={() =>
                    setP({
                      ...p,
                      items: p.items.filter((x) => x.id !== item.id),
                    })
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
            <Field label="Assigned machine">
              <select
                value={item.machineId}
                onChange={(e) =>
                  setP({
                    ...p,
                    items: p.items.map((x) =>
                      x.id === item.id
                        ? { ...x, machineId: e.target.value }
                        : x,
                    ),
                  })
                }
              >
                <option value="">Choose during workout</option>
                {s.machines
                  .filter((m) => !m.archived)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="form-grid four">
              {(["sets", "min", "max", "rest"] as const).map((key) => (
                <Field
                  key={key}
                  label={
                    {
                      sets: "Sets",
                      min: "Min reps",
                      max: "Max reps",
                      rest: "Rest (sec)",
                    }[key]
                  }
                >
                  <input
                    required
                    type="number"
                    min={key === "rest" ? 0 : 1}
                    max={key === "rest" ? 900 : key === "sets" ? 20 : 100}
                    value={item[key]}
                    onChange={(e) =>
                      setP({
                        ...p,
                        items: p.items.map((x) =>
                          x.id === item.id
                            ? { ...x, [key]: Number(e.target.value) }
                            : x,
                        ),
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}
        <div className="row">
          <select
            aria-label="Exercise to add"
            value={add}
            onChange={(e) => setAdd(e.target.value)}
          >
            {s.exercises
              .filter((e) => !e.archived)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
          <Button
            type="button"
            onClick={() =>
              setP({
                ...p,
                items: [
                  ...p.items,
                  {
                    id: uid(),
                    exerciseId: add,
                    machineId: "",
                    sets: 4,
                    min: 10,
                    max: 10,
                    rest: 90,
                  },
                ],
              })
            }
          >
            <Plus size={16} />
            Add
          </Button>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="actions">
          <Button variant="primary">Save program</Button>
        </div>
      </form>
    </Modal>
  );
}
export function Programs({
  state: s,
  start,
}: {
  state: State;
  start: (p: Program) => void;
}) {
  const [editor, setEditor] = useState<Program | null | undefined>(),
    [exercise, setExercise] = useState<string | null>(null),
    [custom, setCustom] = useState(false),
    [search, setSearch] = useState("");
  const coverage: Record<string, number> = {};
  s.programs
    .filter((p) => !p.archived)
    .forEach((p) =>
      p.items.forEach((i) => {
        s.exercises
          .find((e) => e.id === i.exerciseId)
          ?.muscles.forEach(
            (m) => (coverage[m] = (coverage[m] ?? 0) + i.sets * p.days.length),
          );
      }),
    );
  return (
    <>
      <Heading
        title="Programs"
        action={
          <Button variant="primary" onClick={() => setEditor(null)}>
            <Plus size={18} />
            Create program
          </Button>
        }
      />
      <div className="program-grid">
        {s.programs
          .filter((p) => !p.archived)
          .map((p, i) => (
            <Card key={p.id}>
              <div className="row">
                <span className="letter">{i < 3 ? "ABC"[i] : i + 1}</span>
                <Button
                  variant="icon ghost"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => setEditor(p)}
                >
                  <Settings2 size={18} />
                </Button>
              </div>
              <div className="eyebrow space-top">
                {p.days.map((d) => days[d]).join(" · ") || "ON YOUR SCHEDULE"}
              </div>
              <h2>{p.name}</h2>
              <p className="muted small">
                {p.items.length} exercises ·{" "}
                {p.items.reduce((n, i) => n + i.sets, 0)} working sets
              </p>
              {p.items.map((item) => (
                <button
                  className="program-exercise"
                  key={item.id}
                  onClick={() => setExercise(item.exerciseId)}
                >
                  <div>
                    <strong>
                      {s.exercises.find((e) => e.id === item.exerciseId)?.name}
                    </strong>
                    <small>
                      {s.machines.find((m) => m.id === item.machineId)?.name ??
                        "Choose equipment"}
                    </small>
                  </div>
                  <span>
                    {item.sets} × {repTarget(item.min, item.max)}
                  </span>
                </button>
              ))}
              <Button
                variant="secondary full space-top"
                onClick={() => start(p)}
              >
                <Play size={16} />
                Start this session
              </Button>
              <Button
                variant="ghost full"
                onClick={() =>
                  void change((s) => {
                    s.programs.find((x) => x.id === p.id)!.archived = true;
                  }).catch(() => {})
                }
              >
                Archive program
              </Button>
            </Card>
          ))}
      </div>
      <Card>
        <SectionTitle
          title="Weekly muscle coverage"
          extra={
            <span className="muted small">Direct working sets · planned</span>
          }
        />
        <div className="coverage">
          {Object.entries(coverage).map(([muscle, sets]) => (
            <div key={muscle}>
              <div>
                <span>{muscle}</span>
                <strong>{sets}</strong>
              </div>
              <div className="bar">
                <span
                  style={{
                    width: `${Math.min(100, (sets / Math.max(...Object.values(coverage))) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="small muted">Primary muscles only.</p>
      </Card>
      <Card>
        <SectionTitle
          title="Exercise library"
          extra={
            <Button variant="ghost" onClick={() => setCustom(true)}>
              <Plus size={16} />
              Custom exercise
            </Button>
          }
        />
        <input
          aria-label="Search exercises"
          placeholder="Find an exercise"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="library">
          {s.exercises
            .filter((e) => !e.archived)
            .filter((e) =>
              `${e.name} ${e.muscles.join(" ")}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((e) => (
              <button key={e.id} onClick={() => setExercise(e.id)}>
                <BookOpen size={18} />
                <span>
                  {e.name}
                  <small>{e.muscles.join(" · ")}</small>
                </span>
              </button>
            ))}
        </div>
      </Card>
      {s.programs.some((p) => p.archived) && (
        <Card>
          <h3>Archived programs</h3>
          {s.programs
            .filter((p) => p.archived)
            .map((p) => (
              <div className="list-line" key={p.id}>
                {p.name}
                <Button
                  variant="ghost"
                  onClick={() =>
                    void change((s) => {
                      s.programs.find((x) => x.id === p.id)!.archived = false;
                    }).catch(() => {})
                  }
                >
                  Restore
                </Button>
              </div>
            ))}
        </Card>
      )}
      {editor !== undefined && (
        <ProgramEditor
          state={s}
          program={editor}
          onClose={() => setEditor(undefined)}
        />
      )}{" "}
      {exercise && (
        <ExerciseDetail
          state={s}
          id={exercise}
          onClose={() => setExercise(null)}
        />
      )}{" "}
      {custom && <ExerciseEditor onClose={() => setCustom(false)} />}
    </>
  );
}
