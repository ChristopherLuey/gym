import {
  Suspense,
  lazy,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Dumbbell,
  House,
  CalendarDays,
  ChartNoAxesCombined,
  Utensils,
  Settings as SettingsIcon,
  Activity,
  WifiOff,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { load, subscribe, getSnapshot, change } from "./db";
import { type Program } from "./model";
import { startWorkout } from "./logic";
import { Onboarding } from "./Onboarding";
import { Today } from "./Today";
import { Programs } from "./Programs";
import { Machines } from "./Machines";
import { Workout, WorkoutSummary } from "./Workout";
import { Nutrition } from "./Nutrition";
import { Settings, downloadBackup } from "./Settings";
import { Button } from "./ui";
const Progress = lazy(() => import("./Progress"));
const nav = [
  ["Today", House],
  ["Workout", Activity],
  ["Programs", CalendarDays],
  ["Machines", Dumbbell],
  ["Progress", ChartNoAxesCombined],
  ["Nutrition", Utensils],
] as const;
export default function App() {
  const {
    state: s,
    loaded,
    error,
    saving,
  } = useSyncExternalStore(subscribe, getSnapshot);
  const [page, setPage] = useState(() => location.hash.slice(1) || "Today"),
    [summary, setSummary] = useState<string | null>(null),
    [online, setOnline] = useState(navigator.onLine);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => {} });
  useEffect(() => {
    void load();
    const hash = () => setPage(location.hash.slice(1) || "Today");
    window.addEventListener("hashchange", hash);
    const network = () => setOnline(navigator.onLine);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = s.profile.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        s.profile.theme === "dark" ? "#101214" : "#f6f7f2",
      );
  }, [s.profile.theme]);
  const navigate = (p: string) => {
    location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const start = async (p: Program) => {
    await change((s) => {
      if (!s.active) s.active = startWorkout(s, p);
    });
    navigate("Workout");
  };
  useEffect(() => {
    if (s.profile.onboarded) window.scrollTo(0, 0);
  }, [s.profile.onboarded]);
  const found = s.history.find((w) => w.id === summary);
  if (!loaded)
    return (
      <div className="loading">
        <Dumbbell size={36} />
        <p>Finding your rhythm…</p>
      </div>
    );
  if (!s.profile.onboarded && !error) return <Onboarding state={s} />;
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#Today">
          <Dumbbell />
          <span>
            GYM<span className="accent">.</span>
          </span>
        </a>
        <span className="sidebar-label">YOUR TRAINING SPACE</span>
        <nav aria-label="Main navigation">
          {nav.map(([name, Icon]) => (
            <a
              href={`#${name}`}
              key={name}
              onClick={(e) => {
                e.preventDefault();
                navigate(name);
              }}
              aria-current={page === name ? "page" : undefined}
              className={page === name ? "active" : ""}
            >
              <Icon size={20} />
              <span>{name}</span>
              {name === "Workout" && s.active && (
                <span className="active-dot" />
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            Progress is built
            <br />
            <span>one session at a time.</span>
          </div>
          <a
            href="#Settings"
            className={`settings-link ${page === "Settings" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              navigate("Settings");
            }}
          >
            <SettingsIcon size={19} />
            Settings
          </a>
          <div className="profile-chip">
            <div>{(s.profile.name || "Y").slice(0, 1).toUpperCase()}</div>
            <span>
              {s.profile.name || "Your profile"}
              <small>Building stronger</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <a href="#Today" className="mobile-brand">
            GYM<span>.</span>
          </a>
          <span className="breadcrumb">
            YOUR PERSONAL FITNESS OS <span>/</span> {page.toUpperCase()}
          </span>
          <div className="row">
            <span className="save-status">
              {online ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}{" "}
              {error
                ? "Save needs attention"
                : saving
                  ? "Saving…"
                  : !online
                    ? "Offline"
                    : offlineReady
                      ? "Offline ready"
                      : "Saved on device"}
            </span>
            <button
              className="mobile-settings"
              aria-label="Settings"
              onClick={() => navigate("Settings")}
            >
              <SettingsIcon size={21} />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {error && (
            <div className="storage-error" role="alert">
              <strong>Your data needs attention.</strong>
              <p>{error}</p>
              <Button onClick={() => void load()}>Retry storage</Button>
              <Button onClick={() => downloadBackup(s)}>
                Export available data
              </Button>
            </div>
          )}
          {needRefresh && (
            <div className="notice">
              A new version is ready.{" "}
              {s.active ? (
                "Finish your workout before updating."
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => void updateServiceWorker(true)}
                >
                  Update GYM
                </Button>
              )}
            </div>
          )}
          {page === "Today" ? (
            <Today
              state={s}
              start={(p) => void start(p)}
              navigate={navigate}
              showWorkout={setSummary}
            />
          ) : page === "Workout" ? (
            <Workout state={s} navigate={navigate} showWorkout={setSummary} />
          ) : page === "Programs" ? (
            <Programs state={s} start={(p) => void start(p)} />
          ) : page === "Machines" ? (
            <Machines state={s} />
          ) : page === "Progress" ? (
            <Suspense fallback={<p>Loading your progress…</p>}>
              <Progress state={s} showWorkout={setSummary} />
            </Suspense>
          ) : page === "Nutrition" ? (
            <Nutrition state={s} />
          ) : (
            <Settings state={s} />
          )}
          <footer className="page-footer">
            <span>GYM · Built for the long run.</span>
            <span>
              Private. Local. Yours. <ArrowUpRight size={12} />
            </span>
          </footer>
        </main>
      </div>
      {found && (
        <WorkoutSummary
          state={s}
          workout={found}
          onClose={() => setSummary(null)}
        />
      )}
    </div>
  );
}
