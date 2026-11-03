/** Marca do sistema: símbolo + nome. `clara` para fundos escuros (menu lateral). */
export function Marca({ clara = false, compacta = false }: { clara?: boolean; compacta?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#1f5fae" />
        <path d="M8 22V12l8-4 8 4v10" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M13 22v-6h6v6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      {!compacta && (
        <span className={`leading-tight ${clara ? "text-white" : "text-texto"}`}>
          <span className="block text-sm font-semibold tracking-tight">Centro de Comando</span>
          <span className={`block text-[11px] ${clara ? "text-lateral-texto" : "text-suave"}`}>Gestão de obras</span>
        </span>
      )}
    </span>
  );
}
