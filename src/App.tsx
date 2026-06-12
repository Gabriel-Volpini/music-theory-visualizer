import { useComposition, type ToolId } from "./store/composition";
import ScalePicker from "./components/ScalePicker";
import ScaleVisualizer from "./components/tools/ScaleVisualizer";
import SoloHelper from "./components/tools/SoloHelper";
import ModulationTool from "./components/tools/ModulationTool";
import ChordSoloBuilder from "./components/tools/ChordSoloBuilder";
import CircleOfFifths from "./components/tools/CircleOfFifths";
import IntervalVisualizer from "./components/tools/IntervalVisualizer";

const TABS: { id: ToolId; label: string; blurb: string }[] = [
  { id: "interval", label: "Interval", blurb: "Click two notes to measure the interval, its size and consonance." },
  { id: "scale", label: "Scales", blurb: "See a scale on both instruments, with a tonal or modal lens." },
  { id: "modulation", label: "Modulation", blurb: "See how keys relate on the circle of fifths, then find where to go next and the pivot chords that bridge the two keys." },
  { id: "solo", label: "Solo Helper", blurb: "Get ranked next-note suggestions over the active chord." },
  { id: "builder", label: "Builder", blurb: "" },
];

function ToolView({ tool }: { tool: ToolId }) {
  switch (tool) {
    case "builder":
      return <ChordSoloBuilder />;
    case "interval":
      return <IntervalVisualizer />;
    case "solo":
      return <SoloHelper />;
    case "modulation":
      return (
        <div className="space-y-8">
          <CircleOfFifths />
          <section className="border-t border-slate-800 pt-6">
            <ModulationTool />
          </section>
        </div>
      );
    case "scale":
    default:
      return <ScaleVisualizer />;
  }
}

export default function App() {
  const { tool, setTool } = useComposition();
  const active = TABS.find((t) => t.id === tool) ?? TABS[0];

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6 pt-5">
          <h1 className="text-xl font-bold tracking-tight">
            🎵 Music Theory Visualizer
          </h1>

          <div className="mt-5">
            <ScalePicker />
          </div>

          <nav className="-mb-px mt-5 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={
                  "rounded-t-lg border px-4 py-2 text-sm font-medium transition " +
                  (tool === t.id
                    ? "border-slate-800 border-b-transparent bg-slate-950 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {active.blurb && <p className="mb-5 text-sm text-slate-400">{active.blurb}</p>}
        <ToolView tool={tool} />
      </main>
    </div>
  );
}
