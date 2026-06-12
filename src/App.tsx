import { useComposition, type ToolId } from "./store/composition";
import ScalePicker from "./components/ScalePicker";
import ScaleVisualizer from "./components/tools/ScaleVisualizer";
import SoloHelper from "./components/tools/SoloHelper";
import ModulationTool from "./components/tools/ModulationTool";
import CompositionCanvas from "./components/tools/CompositionCanvas";
import ChordSoloBuilder from "./components/tools/ChordSoloBuilder";
import CircleOfFifths from "./components/tools/CircleOfFifths";
import MelodyLayer from "./components/tools/MelodyLayer";
import IntervalVisualizer from "./components/tools/IntervalVisualizer";

const TABS: { id: ToolId; label: string; blurb: string }[] = [
  { id: "scale", label: "Scale Visualizer", blurb: "See a scale on both instruments, with a tonal or modal lens." },
  { id: "circle", label: "Circle of Fifths", blurb: "See how keys relate; click any key to make it the project key." },
  { id: "interval", label: "Interval", blurb: "Click two notes to measure the interval, its size and consonance." },
  { id: "solo", label: "Solo Helper", blurb: "Get ranked next-note suggestions over the active chord." },
  { id: "modulation", label: "Modulation", blurb: "Find where to go next and the pivot chords that bridge the two keys." },
  { id: "canvas", label: "Composition Canvas", blurb: "Build a progression with chord suggestions, then write a melody over it on the piano-roll below." },
  { id: "builder", label: "Chord Builder", blurb: "Create chords from suggestions or note-by-note, then edit them — add 7ths, invert, reharmonize." },
];

function ToolView({ tool }: { tool: ToolId }) {
  switch (tool) {
    case "canvas":
      return (
        <div className="space-y-8">
          <CompositionCanvas />
          <section className="border-t border-slate-800 pt-6">
            <h2 className="mb-1 text-lg font-bold text-white">Melody Layer</h2>
            <p className="mb-4 text-sm text-slate-400">
              Write a melody on the piano-roll over the progression above.
            </p>
            <MelodyLayer />
          </section>
        </div>
      );
    case "builder":
      return <ChordSoloBuilder />;
    case "circle":
      return <CircleOfFifths />;
    case "interval":
      return <IntervalVisualizer />;
    case "solo":
      return <SoloHelper />;
    case "modulation":
      return <ModulationTool />;
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
          <p className="mt-0.5 text-sm text-slate-400">
            Pick a key and scale once — every tool stays in sync.
          </p>

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
        <p className="mb-5 text-sm text-slate-400">{active.blurb}</p>
        <ToolView tool={tool} />
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-slate-600">
        The Composition Canvas and Builder play piano via the Web Audio API.
      </footer>
    </div>
  );
}
