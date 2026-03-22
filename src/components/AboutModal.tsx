interface Props {
  onClose: () => void
}

export default function AboutModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong max-w-md w-full mx-4 p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-5">
          <span className="text-purple-400 text-xs uppercase tracking-widest font-medium">About</span>
        </div>

        <h2 className="text-slate-100 text-lg font-semibold mb-3">Pyth Radar</h2>

        <p className="text-slate-400 text-sm leading-relaxed mb-3">
          Pyth aggregates prices from institutional market makers — Citadel, Jane Street, Jump Trading.
          That makes Pyth the benchmark, not a price to be verified.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">
          Pyth Radar shows where CEX markets deviate from that benchmark in real time,
          using Pyth's confidence interval as the signal threshold —
          deviation inside CI is noise, deviation outside is opportunity.
        </p>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-600">
          <span>Built for Pyth Community Hackathon 2026</span>
          <a
            href="https://pyth.network"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-400 transition-colors"
          >
            pyth.network →
          </a>
        </div>
      </div>
    </div>
  )
}
