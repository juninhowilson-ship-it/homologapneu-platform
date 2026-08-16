/**
 * Logotipo no estilo do mockup: wordmark em itálico pesado com "PNEU" em
 * amarelo e um pneu estilizado ao lado. SVG inline (sem asset externo) —
 * substituível pelo arquivo oficial da marca quando ele existir.
 */
export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        aria-hidden
        className="shrink-0"
      >
        {/* Pneu: anel externo escuro com "rasgos" de banda + aro amarelo */}
        <circle cx="17" cy="17" r="15" fill="#1a1a1a" stroke="#FFB81C" strokeWidth="2" />
        <circle cx="17" cy="17" r="8.5" fill="none" stroke="#FFB81C" strokeWidth="2.5" />
        <circle cx="17" cy="17" r="3" fill="#FFB81C" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angulo) => (
          <rect
            key={angulo}
            x="15.75"
            y="2.5"
            width="2.5"
            height="4.5"
            rx="1"
            fill="#FFB81C"
            transform={`rotate(${angulo} 17 17)`}
          />
        ))}
      </svg>

      <div className="leading-none">
        <p className="text-lg font-black italic tracking-tight text-white">
          HOMOLOGA
          <span className="text-brand">PNEU</span>
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Homologações de pneus
        </p>
      </div>
    </div>
  );
}
