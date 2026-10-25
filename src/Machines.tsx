import { useState, useEffect } from "react";
import { Plus, Search, Star, Archive, Check } from "lucide-react";
import {
  type State,
  type Machine,
  type Setup,
  emptySetup,
  uid,
  fromKg,
  toKg,
  formatDate,
  machineVisuals,
} from "./model";
import { MachineVisual, visualNames } from "./MachineVisual";
import { machineStats, nextProgram } from "./logic";
import { change } from "./db";
import {
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Modal,
  Stat,
  SectionTitle,
} from "./ui";
export const setupLabels: Record<keyof Setup, string> = {
  seat: "Seat position",
  pad: "Pad position",
  handle: "Handle selection",
  pin: "Pin setting",
  attachment: "Attachment",
  resistance: "Resistance profile",
  notes: "Setup notes",
};
export function SetupFields({
  value,
  onChange,
}: {
  value: Setup;
  onChange: (v: Setup) => void;
}) {
  return (
    <div className="form-grid">
      {Object.entries(setupLabels).map(([k, label]) => (
        <Field key={k} label={label}>
          <input
            value={value[k as keyof Setup]}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            maxLength={k === "notes" ? 2000 : 100}
          />
        </Field>
      ))}
    </div>
  );
}
function AddMachine({
  state: s,
  onClose,
}: {
  state: State;
  onClose: () => void;
}) {
  const [m, setM] = useState<Machine>(() => ({
    id: uid(),
    name: "",
    area: "",
    type: "Machine",
    muscles: ["Upper chest"],
    brand: "",
    model: "",
    setup: emptySetup(),
    favorite: false,
    archived: false,
    photo: "",
    incrementKg: 2.5,
  }));
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  const patch = (v: Partial<Machine>) => setM({ ...m, ...v });
  const photo = async (file: File) => {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1_000_000
    ) {
      setErr("Choose a JPEG, PNG, or WebP image smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ photo: String(reader.result) });
    reader.readAsDataURL(file);
  };
  return (
    <Modal title="Add a machine" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await change((s) => {
              s.machines.push(m);
            });
            onClose();
          } catch {
            setErr("Could not save. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Machine name">
          <input
            required
            autoFocus
            value={m.name}
            maxLength={120}
            placeholder="Chest press near mirrors"
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Gym area">
            <input
              value={m.area}
              placeholder="Chest & shoulders"
              onChange={(e) => patch({ area: e.target.value })}
            />
          </Field>
          <Field label="Equipment type">
            <select
              value={m.type}
              onChange={(e) => patch({ type: e.target.value })}
            >
              {[
                "Machine",
                "Cable",
                "Free weights",
                "Bodyweight",
                "Cardio",
                "Other",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <input
              value={m.brand}
              onChange={(e) => patch({ brand: e.target.value })}
            />
          </Field>
          <Field label="Model">
            <input
              value={m.model}
              onChange={(e) => patch({ model: e.target.value })}
            />
          </Field>
          <Field label="Muscles (comma separated)">
            <input
              value={m.muscles.join(",")}
              onChange={(e) => patch({ muscles: e.target.value.split(",") })}
            />
          </Field>
          <Field label={`Smallest increase (${s.profile.units})`}>
            <input
              type="number"
              required
              min="0.1"
              max="100"
              step="0.1"
              value={fromKg(m.incrementKg, s.profile.units)}
              onChange={(e) =>
                patch({
                  incrementKg: toKg(Number(e.target.value), s.profile.units),
                })
              }
            />
          </Field>
        </div>
        <h3>Machine settings</h3>
        <SetupFields value={m.setup} onChange={(setup) => patch({ setup })} />
        <Field label="Machine photo (optional)" hint="Maximum 1 MB.">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              if (e.target.files?.[0]) void photo(e.target.files[0]);
            }}
          />
        </Field>
        {m.photo && (
          <>
            <img className="machine-photo" src={m.photo} alt={m.name} />
            <Button
              type="button"
              variant="ghost"
              onClick={() => patch({ photo: "" })}
            >
              Remove photo
            </Button>
          </>
        )}
        <Field label="Machine illustration">
          <select
            value={m.visual ?? "auto"}
            onChange={(event) =>
              patch({ visual: event.target.value as Machine["visual"] })
            }
          >
            {machineVisuals.map((kind) => (
              <option value={kind} key={kind}>
                {visualNames[kind]}
              </option>
            ))}
          </select>
        </Field>
        {err && <p role="alert">{err}</p>}
        <div className="actions">
          <Button variant="primary" disabled={busy}>
            Save machine
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Machines({
  state: s,
  initialSelection,
}: {
  state: State;
  initialSelection?: string | null;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [area, setArea] = useState("All areas"),
    [filters, setFilters] = useState(false),
    [adding, setAdding] = useState(false),
    [detail, setDetail] = useState<string | null>(initialSelection ?? null);
  useEffect(() => setDetail(initialSelection ?? null), [initialSelection]);
  const next = nextProgram(s);
  const planned = new Set(
    s.active
      ? s.active.entries.map((i) => i.machineId)
      : next?.program.items.map((i) => i.machineId),
  );
  const shown = s.machines.filter(
    (m) =>
      (filter === "Archived" ? m.archived : !m.archived) &&
      (filter !== "Favorites" || m.favorite) &&
      (filter !== "Next workout" || planned.has(m.id)) &&
      (filter !== "Recently used" ||
        (machineStats(s, m.id).last ?? 0) > Date.now() - 21 * 86400000) &&
      (filter !== "Not recently used" ||
        (machineStats(s, m.id).last ?? 0) < Date.now() - 21 * 86400000) &&
      (area === "All areas" || m.area === area) &&
      `${m.name} ${m.brand} ${m.model} ${m.muscles.join(" ")} ${m.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const grouping = s.profile.equipmentGroup;
  const groups = new Map<string, Machine[]>();
  for (const m of shown) {
    const keys =
      grouping === "muscle"
        ? [...new Set(m.muscles.filter(Boolean))]
        : [grouping === "area" ? m.area : grouping === "type" ? m.type : ""];
    for (const key of keys.length ? keys : ["Unassigned"]) {
      const label = key || "Unassigned";
      groups.set(label, [...(groups.get(label) ?? []), m]);
    }
  }
  const selected = s.machines.find((m) => m.id === detail),
    stats = selected ? machineStats(s, selected.id) : null;
  return (
    <>
      <Heading
        title="Machines"
        action={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={18} />
            Add machine
          </Button>
        }
      />
      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input
            aria-label="Search machines"
            placeholder="Search machines, muscles, or brands"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          Filters & groups
        </Button>
      </div>
      {filters && (
        <div className="machine-filters">
          <select
            aria-label="Filter by gym area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option>All areas</option>
            {[...new Set(s.machines.map((m) => m.area).filter(Boolean))].map(
              (a) => (
                <option key={a}>{a}</option>
              ),
            )}
          </select>
          <select
            aria-label="Group machines by"
            value={grouping}
            onChange={(e) => {
              const value = e.target
                .value as State["profile"]["equipmentGroup"];
              void change((s) => {
                s.profile.equipmentGroup = value;
              }).catch(() => {});
            }}
          >
            <option value="none">Simple list</option>
            <option value="area">Gym area</option>
            <option value="type">Equipment type</option>
            <option value="muscle">Muscle group</option>
          </select>
        </div>
      )}
      <div className="tabs wrap">
        {[
          "All",
          "Next workout",
          "Favorites",
          ...(filters
            ? ["Recently used", "Not recently used", "Archived"]
            : []),
        ].map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {[...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, items]) => (
          <section key={group} className="machine-group">
            {grouping !== "none" && (
              <SectionTitle
                title={group}
                extra={
                  <span className="muted small">{items.length} machines</span>
                }
              />
            )}
            <div className="machine-grid">
              {items.map((m) => {
                const st = machineStats(s, m.id);
                return (
                  <Card key={m.id} className="machine-card">
                    <div className="machine-card-top">
                      <button
                        className="machine-picture-button"
                        aria-label={"View " + m.name}
                        onClick={() => setDetail(m.id)}
                      >
                        <MachineVisual machine={m} />
                      </button>
                      <Button
                        aria-label={`${m.favorite ? "Unfavorite" : "Favorite"} ${m.name}`}
                        variant={`icon ghost ${m.favorite ? "accent" : ""}`}
                        onClick={() =>
                          void change((s) => {
                            s.machines.find((x) => x.id === m.id)!.favorite =
                              !m.favorite;
                          }).catch(() => {})
                        }
                      >
                        <Star
                          size={20}
                          fill={m.favorite ? "currentColor" : "none"}
                        />
                      </Button>
                    </div>
                    <button
                      className="machine-title"
                      onClick={() => setDetail(m.id)}
                    >
                      <h3>{m.name}</h3>
                    </button>
                    <p className="muted small">
                      {m.area || "No area assigned"} · {m.type}
                    </p>
                    <div className="tag-row">
                      {m.muscles.map((x, i) => (
                        <span className="muscle-tag" key={i}>
                          {x}
                        </span>
                      ))}
                    </div>
                    {st.last && (
                      <small className="machine-last-used">
                        Last used {formatDate(st.last)} · {st.sessions} sessions
                      </small>
                    )}
                    <div className="machine-card-bottom">
                      <span
                        className={
                          planned.has(m.id) ? "accent small" : "muted small"
                        }
                      >
                        {planned.has(m.id) ? (
                          <>
                            <Check size={14} />
                            Next workout
                          </>
                        ) : m.archived ? (
                          "Archived"
                        ) : (
                          "Ready for your plan"
                        )}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      {!shown.length && (
        <Empty
          title="No machines found"
          action={<Button onClick={() => setAdding(true)}>Add machine</Button>}
        />
      )}
      <div className="note">
        Different machines can have different resistance. Your loads, setup
        notes, and records stay separate for each machine.
      </div>
      {adding && <AddMachine state={s} onClose={() => setAdding(false)} />}
      {selected && stats && (
        <Modal title={selected.name} onClose={() => setDetail(null)}>
          <MachineVisual machine={selected} />
          <p>
            {[selected.brand, selected.model, selected.area]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="stats-grid compact">
            <Stat label="Sessions" value={stats.sessions} />
            <Stat label="Working sets" value={stats.sets} />
            <Stat label="Reps" value={stats.reps} />
            <Stat
              label={`Volume (${s.profile.units})`}
              value={Math.round(
                fromKg(stats.volume, s.profile.units),
              ).toLocaleString()}
            />
          </div>
          <h3>Saved setup</h3>
          {Object.entries(selected.setup)
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div className="list-line" key={k}>
                <span>{setupLabels[k as keyof Setup]}</span>
                <strong>{v}</strong>
              </div>
            ))}
          {!Object.values(selected.setup).some(Boolean) && (
            <p className="muted">No saved settings.</p>
          )}
          <h3>Exercises performed</h3>
          {stats.exercises.length ? (
            stats.exercises.map((e) => <p key={e}>{e}</p>)
          ) : (
            <p className="muted">No completed working sets yet.</p>
          )}
          <div className="actions">
            <Button
              variant="ghost"
              onClick={async () => {
                await change((s) => {
                  s.machines.find((m) => m.id === selected.id)!.archived =
                    !selected.archived;
                  if (!selected.archived)
                    s.programs.forEach((p) =>
                      p.items.forEach((i) => {
                        if (i.machineId === selected.id) i.machineId = "";
                      }),
                    );
                });
                setDetail(null);
              }}
            >
              <Archive size={16} />
              {selected.archived ? "Restore machine" : "Archive machine"}
            </Button>
          </div>
          <small>
            Archiving preserves history and removes future program assignments.
          </small>
        </Modal>
      )}
    </>
  );
}
