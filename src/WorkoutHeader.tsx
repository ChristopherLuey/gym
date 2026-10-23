import { List, Pause, Play } from "lucide-react";
import { Button } from "./ui";

export function WorkoutHeader({
  name,
  done,
  total,
  paused,
  busy,
  onPause,
  onPlan,
}: {
  name: string;
  done: number;
  total: number;
  paused: boolean;
  busy?: boolean;
  onPause: () => void;
  onPlan?: () => void;
}) {
  return (
    <header className="workout-header">
      <a href="#Today" className="workout-brand" aria-label="GYM Today">
        GYM<span>.</span>
      </a>
      <h1 title={name}>{name}</h1>
      <output aria-label="Sets complete">
        {done}/{total}
      </output>
      {onPlan && (
        <Button variant="icon ghost" aria-label="Workout plan" onClick={onPlan}>
          <List size={18} />
        </Button>
      )}
      <Button
        variant="icon ghost"
        disabled={busy}
        aria-label={paused ? "Resume workout" : "Pause workout"}
        onClick={onPause}
      >
        {paused ? <Play size={18} /> : <Pause size={18} />}
      </Button>
    </header>
  );
}
