import { useEffect, useState } from "react";
import {
  Download,
  Upload,
  Shield,
  Smartphone,
  Sun,
  Moon,
  Database,
  RotateCcw,
} from "lucide-react";
import { type State, type Profile, localDay } from "./model";
import { change, db, encodeBackup, decodeBackup, importState } from "./db";
import { Button, Card, Field, Heading, Modal, SectionTitle } from "./ui";
export function downloadBackup(state: State) {
  const url = URL.createObjectURL(
    new Blob([encodeBackup(state)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `gym-backup-${localDay()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Settings({ state: s }: { state: State }) {
  const [p, setP] = useState<Profile>(s.profile),
    [message, setMessage] = useState(""),
    [imported, setImported] = useState<State | null>(null),
    [recovery, setRecovery] = useState<{ id: string; created: number }[]>([]),
    [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    void db.recovery
      .orderBy("created")
      .reverse()
      .toArray()
      .then((r) => setRecovery(r.map(({ id, created }) => ({ id, created }))));
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);
  const patch = (v: Partial<Profile>) => setP({ ...p, ...v });
  const read = async (file: File) => {
    try {
      if (file.size > 30_000_000)
        throw new Error("Choose a backup smaller than 30 MB.");
      setImported(decodeBackup(await file.text()));
      setMessage("");
    } catch (e) {
      setMessage(
        "Import rejected. Your data is unchanged. " +
          (e instanceof Error ? e.message : "Invalid backup."),
      );
    }
  };
  return (
    <>
      <Heading
        eyebrow="MAKE IT YOURS"
        title="Your space. Your settings."
        subtitle="Simple controls for training and peace of mind."
      />
      <div className="split-grid">
        <Card>
          <SectionTitle title="Your profile" />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await change((s) => {
                s.profile = p;
              });
              setMessage("Profile saved.");
            }}
          >
            <Field label="Name">
              <input
                maxLength={80}
                value={p.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Height (cm)">
                <input
                  required
                  type="number"
                  min="50"
                  max="250"
                  value={p.heightCm}
                  onChange={(e) => patch({ heightCm: Number(e.target.value) })}
                />
              </Field>
              <Field label="Weight units">
                <select
                  value={p.units}
                  onChange={(e) =>
                    patch({ units: e.target.value as Profile["units"] })
                  }
                >
                  <option value="lb">Pounds (lb)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </Field>
              <Field label="Experience">
                <select
                  value={p.experience}
                  onChange={(e) =>
                    patch({
                      experience: e.target.value as Profile["experience"],
                    })
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="returning">Returning</option>
                  <option value="experienced">Experienced</option>
                </select>
              </Field>
              <Field label="Session target (minutes)">
                <input
                  required
                  type="number"
                  min="15"
                  max="180"
                  value={p.minutes}
                  onChange={(e) => patch({ minutes: Number(e.target.value) })}
                />
              </Field>
              <Field label="Default rest (seconds)">
                <input
                  required
                  type="number"
                  min="0"
                  max="900"
                  value={p.rest}
                  onChange={(e) => patch({ rest: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field
              label="Preferences or limitations (optional)"
              hint="Only what you choose to record. No restrictions are assumed."
            >
              <textarea
                value={p.limitations}
                onChange={(e) => patch({ limitations: e.target.value })}
                maxLength={3000}
              />
            </Field>
            <Button variant="primary">Save profile</Button>
          </form>
          <p className="muted small">
            Change training days in each program. Existing loads are converted
            for display when units change; history retains its original meaning.
          </p>
        </Card>
        <div className="stack">
          <Card>
            <SectionTitle title="Appearance" />
            <div className="theme-options">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  className={s.profile.theme === t ? "selected" : ""}
                  aria-pressed={s.profile.theme === t}
                  onClick={() => {
                    patch({ theme: t });
                    void change((s) => {
                      s.profile.theme = t;
                    }).catch(() => {});
                  }}
                >
                  {t === "dark" ? <Moon /> : <Sun />}
                  {t === "dark" ? "After hours" : "Daylight"}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle
              title="Private by design"
              extra={<Shield size={20} className="accent" />}
            />
            <p>
              Your workouts, machine settings, and body metrics live in this
              browser’s IndexedDB. No account, advertising, or analytics service
              receives them.
            </p>
            <div className="note">
              <strong>Local to this device</strong>
              <p>
                Automatic cloud sync is not configured. Your iPhone and laptop
                keep separate data. Export a backup and import it on another
                device to transfer your history.
              </p>
            </div>
            <small>
              Import replaces the receiving device’s data after creating a
              recovery copy. It does not merge two independently edited
              histories.
            </small>
          </Card>
        </div>
      </div>
      <Card>
        <SectionTitle
          title="Backups & recovery"
          extra={<Database size={20} />}
        />
        <p>
          Keep an exported copy somewhere you trust. Browser storage can be
          cleared or evicted; private browsing may not retain it.
        </p>
        <div className="actions left">
          <Button
            variant="primary"
            onClick={() => {
              downloadBackup(s);
              setMessage("Backup exported. Keep the file in a safe place.");
            }}
          >
            <Download size={18} />
            Export all data
          </Button>
          <label className="button secondary file-button">
            <Upload size={18} />
            Import backup
            <input
              aria-label="Import backup"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                if (e.target.files?.[0]) void read(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          <Button
            variant="ghost"
            onClick={async () => {
              const granted = await navigator.storage?.persist?.();
              setPersisted(granted ?? false);
              setMessage(
                granted
                  ? "Persistent storage granted. Keep exporting backups too."
                  : "This browser has not granted persistent storage. Export backups regularly.",
              );
            }}
          >
            Protect device storage
          </Button>
        </div>
        <p className="small muted">
          Storage protection:{" "}
          {persisted === null
            ? "browser status unavailable"
            : persisted
              ? "granted"
              : "not yet granted"}
          . Schema version 2. Backup files include personal data and machine
          photos.
        </p>
        {recovery.length > 0 && (
          <>
            <h3>Recovery snapshots</h3>
            {recovery.slice(0, 5).map((r) => (
              <div className="list-line" key={r.id}>
                <span>
                  Before import · {new Date(r.created).toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const row = await db.recovery.get(r.id);
                    if (row) setImported(row.value);
                  }}
                >
                  <RotateCcw size={15} />
                  Review restore
                </Button>
              </div>
            ))}
          </>
        )}
      </Card>
      <Card>
        <SectionTitle
          title="At home on your iPhone"
          extra={<Smartphone size={20} />}
        />
        <ol className="install-steps">
          <li>
            Open{" "}
            <a href="https://christopherluey.github.io/gym/">
              christopherluey.github.io/gym
            </a>{" "}
            in Safari.
          </li>
          <li>Tap Share, then Add to Home Screen.</li>
          <li>Keep the name GYM and tap Add.</li>
          <li>
            Open GYM from its icon while online once, then look for “Offline
            ready.”
          </li>
        </ol>
        <p className="muted small">
          Your home-screen app and browser may use different storage contexts.
          Export a backup before moving between them. Offline timers work while
          the app is open; iOS may suspend sound or notifications in the
          background.
        </p>
      </Card>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {imported && (
        <Modal title="Review this backup" onClose={() => setImported(null)}>
          <p>
            This backup contains {imported.history.length} completed workouts,{" "}
            {imported.machines.length} machines, {imported.programs.length}{" "}
            programs, and {imported.weights.length} weigh-ins.
          </p>
          <p>
            {imported.active ? "It also includes an active workout." : ""}{" "}
            Importing replaces this device’s current data. A recovery snapshot
            is saved first.
          </p>
          {s.active && (
            <p className="notice">
              Finish or discard your active workout before importing.
            </p>
          )}
          <div className="actions">
            <Button variant="ghost" onClick={() => downloadBackup(s)}>
              Export current data first
            </Button>
            <Button
              variant="primary"
              disabled={!!s.active}
              onClick={async () => {
                try {
                  await importState(imported);
                  setP(imported.profile);
                  setImported(null);
                  setMessage(
                    "Backup restored. Your previous data is available as a recovery snapshot.",
                  );
                  const rows = await db.recovery.toArray();
                  setRecovery(rows.map(({ id, created }) => ({ id, created })));
                } catch (e) {
                  setMessage("Import failed. " + String(e));
                }
              }}
            >
              Restore backup
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
