import { Camera } from "lucide-react";
import type { Machine } from "./model";

export const visualNames = {
  auto: "Choose from machine name",
  press: "Incline chest press",
  pulldown: "Lat pulldown",
  row: "Chest-supported row",
  legpress: "Leg press",
  legcurl: "Seated leg curl",
  cable: "Cable station",
  dumbbell: "Dumbbells",
  bench: "Bench & barbell",
  chestfly: "Chest fly machine",
  rearfly: "Reverse fly machine",
  abs: "Ab crunch machine",
  triceps: "Triceps cable",
};
export function visualKind(machine?: Machine) {
  if (!machine) return null;
  if (machine.visual && machine.visual !== "auto") return machine.visual;
  const name = (machine.name + " " + machine.type).toLowerCase();
  if (/reverse.*fly|rear.*fly|rear.*delt/.test(name)) return "rearfly";
  if (/fly|pec.*deck/.test(name)) return "chestfly";
  if (/ab.*crunch|abs.*machine/.test(name)) return "abs";
  if (/tricep/.test(name)) return "triceps";
  if (/bench|barbell/.test(name)) return "bench";
  if (/dumbbell|free weight/.test(name)) return "dumbbell";
  if (/leg.*press/.test(name)) return "legpress";
  if (/leg.*curl/.test(name)) return "legcurl";
  if (/pulldown|pull.down/.test(name)) return "pulldown";
  if (/row/.test(name)) return "row";
  if (/cable/.test(name)) return "cable";
  if (/chest.*press|incline.*press/.test(name)) return "press";
  return null;
}
function Stack({ x, y = 48 }: { x: number; y?: number }) {
  return (
    <g className="art-stack">
      <rect x={x} y={y - 20} width="36" height="134" rx="5" />
      <path d={"M" + (x + 9) + " " + (y - 10) + "v113m18-113v113"} />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={x + 4}
          y={y + 36 + i * 8}
          width="28"
          height="6"
          rx="2"
        />
      ))}
      <circle className="art-accent" cx={x + 19} cy={y + 67} r="3" />
    </g>
  );
}
/** Original equipment diagrams; photos always override the generic illustration. */
export function MachineVisual({
  machine,
  compact = false,
}: {
  machine?: Machine;
  compact?: boolean;
}) {
  const kind = visualKind(machine);
  return (
    <div className={"machine-visual" + (compact ? " compact-visual" : "")}>
      {machine?.photo ? (
        <img src={machine.photo} alt={machine.name} />
      ) : kind ? (
        <svg
          viewBox="0 0 300 210"
          role="img"
          aria-label={visualNames[kind] + " equipment illustration"}
        >
          <ellipse className="art-shadow" cx="151" cy="184" rx="112" ry="12" />
          <g
            className="art-frame"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {kind === "bench" && (
              <>
                <path d="M48 181h203M73 180V62m154 118V62M64 75h19m135 0h18M75 148v32m108-32v32M63 153h133" />
                <path className="art-pad" d="M62 133h133v15H62z" />
                <path className="art-arm" d="M44 67h211" />
                <rect
                  className="art-pad"
                  x="54"
                  y="43"
                  width="12"
                  height="48"
                  rx="3"
                />
                <rect
                  className="art-pad"
                  x="234"
                  y="43"
                  width="12"
                  height="48"
                  rx="3"
                />
                <path d="M48 54v26m204-26v26M98 149l-12 32m81-32 15 32" />
              </>
            )}
            {(kind === "chestfly" || kind === "rearfly") && (
              <>
                <Stack x={205} />
                <path d="M49 182h197M145 181V42m0 0h80M122 148v33m25-30 25 31M145 48 95 54m50-6 38 14" />
                <path
                  className="art-pad"
                  d="M131 80h24v62h-24zM111 143h57v12h-57z"
                />
                {kind === "chestfly" ? (
                  <>
                    <path
                      className="art-arm"
                      d="M95 54 65 92l24 31m94-61 16 37-29 27"
                    />
                    <path
                      className="art-pad"
                      d="m73 99 11-5 14 22-11 6zm102 10 11 6-12 21-11-6z"
                    />
                    <path d="m96 126 13-5m54 15-12-6" />
                  </>
                ) : (
                  <>
                    <path
                      className="art-arm"
                      d="M95 54 52 89v35m131-62 31 38v30"
                    />
                    <path d="M43 125h26m132 5h26" />
                    <path className="art-pad" d="M126 88h34v38h-34z" />
                  </>
                )}
                <circle cx="95" cy="54" r="5" />
                <circle cx="183" cy="62" r="5" />
              </>
            )}
            {kind === "abs" && (
              <>
                <Stack x={216} />
                <path d="M48 182h196M97 144v38m0-18 78 18M145 140l33 42M148 111l40-66h42M102 145l-27 24m0 0h30" />
                <path
                  className="art-pad"
                  d="M83 134h66v13H83zm47-11 14-44 17 6-14 44z"
                />
                <path
                  className="art-arm"
                  d="M184 50 126 61l-25 27m24-27 37 32M91 89h28m31 4h25"
                />
                <rect
                  className="art-pad"
                  x="80"
                  y="164"
                  width="39"
                  height="12"
                  rx="6"
                />
                <circle cx="184" cy="50" r="6" />
              </>
            )}
            {kind === "triceps" && (
              <>
                <Stack x={187} />
                <path d="M72 182h170M204 29h-76v24M128 29l-27 17m27-17 37 16M128 54v42" />
                <circle cx="128" cy="29" r="7" />
                <path className="art-arm" d="M128 96l-19 34m19-34 19 34" />
                <path d="m103 131 12 5m26 0 12-5" />
              </>
            )}
            {kind === "press" && (
              <>
                <Stack x={214} />
                <path d="M62 180h179M96 180l33-66m0 0 28 66m-7-14 52-133h35v147M99 135l35 6" />
                <path
                  className="art-pad"
                  d="m121 135 30-72 17 7-29 72zM91 141h47v11H91z"
                />
                <path
                  className="art-arm"
                  d="m192 55-49 15-32 39m65-42-38 49M102 106l16 7m11 0 17 7"
                />
                <circle cx="192" cy="55" r="7" />
                <path d="M110 151v27m37-23 20 25" />
              </>
            )}
            {kind === "pulldown" && (
              <>
                <Stack x={211} />
                <path d="M61 181h183M226 29H112v82M112 29l-33 9m33-9 39 11M112 49v13M78 71l34-9 40 9M78 71l-11 11m85-11 11 11M110 140v40m0-16 58 16" />
                <path
                  className="art-pad"
                  d="M88 132h57v12H88zM93 113h44v10H93z"
                />
                <path d="M137 119h30v62" />
                <circle cx="112" cy="29" r="7" />
              </>
            )}
            {kind === "row" && (
              <>
                <Stack x={216} />
                <path d="M49 182h196M83 146v36m0-15 79 15m-21-59 21 59M152 121l34-74h48M186 47l-25 53M161 100l-24 11m33-4-25 10M65 170l-11-16m17 6-10-16" />
                <path
                  className="art-pad"
                  d="M68 135h51v12H68zm57-20 20-31 15 10-20 31z"
                />
                <path
                  className="art-arm"
                  d="m182 53-32 43m-13 15-12-8m20 14-12-8"
                />
                <circle cx="186" cy="47" r="7" />
              </>
            )}
            {kind === "legpress" && (
              <>
                <path d="M42 182h213M67 174 193 45m-102 135L217 51M193 45l31 3 30 134M74 147l58 32M48 137l40 43M214 71l34 111M178 71l-16-20 25-23 19 24z" />
                <path
                  className="art-pad"
                  d="m43 125 18-12 35 50-17 11zm44 41 23-17 13 13-25 18z"
                />
                <path className="art-arm" d="m148 100 40-41m-29 51 40-41" />
                <ellipse
                  cx="211"
                  cy="94"
                  rx="11"
                  ry="20"
                  transform="rotate(-40 211 94)"
                />
                <ellipse
                  cx="219"
                  cy="99"
                  rx="11"
                  ry="20"
                  transform="rotate(-40 219 99)"
                />
              </>
            )}
            {kind === "legcurl" && (
              <>
                <Stack x={213} />
                <path d="M47 182h197M91 139v42m0-16 86 16M146 126l25 55M165 79l25-49h37M95 145l-28 20m0 0-5-20M147 125l25 19" />
                <path
                  className="art-pad"
                  d="m128 124 23-66 17 6-23 67zM80 131h65v13H80z"
                />
                <path className="art-arm" d="M91 121h45m-4 0 8-19M70 164h43" />
                <rect
                  className="art-pad"
                  x="63"
                  y="158"
                  width="49"
                  height="14"
                  rx="7"
                />
                <rect
                  className="art-pad"
                  x="89"
                  y="113"
                  width="42"
                  height="13"
                  rx="6"
                />
                <circle cx="147" cy="132" r="6" />
              </>
            )}
            {kind === "cable" && (
              <>
                <Stack x={48} y={49} />
                <Stack x={215} y={49} />
                <path d="M42 181h47m121 0h47M65 29h166M76 40h145M80 32l28 18h80l28-18M83 52l41 33v43m92-76-41 33v43M120 127l-7 12 17 2-6-14m47 0-6 14 17-2-7-12" />
                <path className="art-arm" d="M108 50h80" />
                <circle cx="82" cy="52" r="6" />
                <circle cx="216" cy="52" r="6" />
              </>
            )}
            {kind === "dumbbell" && (
              <>
                <path d="m74 161 141-92m-117 104 141-92" />
                <g transform="translate(62 119) rotate(-33)">
                  <rect
                    className="art-pad"
                    x="0"
                    y="-29"
                    width="17"
                    height="58"
                    rx="5"
                  />
                  <rect
                    className="art-pad"
                    x="20"
                    y="-36"
                    width="20"
                    height="72"
                    rx="5"
                  />
                  <path className="art-arm" d="M40 0h74" />
                  <rect
                    className="art-pad"
                    x="114"
                    y="-36"
                    width="20"
                    height="72"
                    rx="5"
                  />
                  <rect
                    className="art-pad"
                    x="137"
                    y="-29"
                    width="17"
                    height="58"
                    rx="5"
                  />
                </g>
                <path d="m97 173-7-13m149-79-10-13" />
              </>
            )}
          </g>
        </svg>
      ) : (
        <div
          className="machine-visual-empty"
          role="img"
          aria-label="No machine photo yet"
        >
          <Camera />
          <span>Add a machine photo</span>
        </div>
      )}
    </div>
  );
}
