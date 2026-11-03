"use client";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

const BASE =
  "w-full rounded-lg border bg-superficie-2 px-3 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20";

function Rotulo({ id, rotulo, obrigatorio, children, erro, ajuda }: { id: string; rotulo: string; obrigatorio?: boolean; children: ReactNode; erro?: string; ajuda?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {rotulo}
        {obrigatorio && <span className="text-alerta"> *</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1 text-xs text-alerta">
          {erro}
        </p>
      ) : (
        ajuda && <p className="mt-1 text-xs text-suave">{ajuda}</p>
      )}
    </div>
  );
}

type Comum = { nome: string; rotulo: string; erro?: string; ajuda?: string; id?: string };

export function CampoTexto({ nome, rotulo, erro, ajuda, id, required, className = "", ...props }: Comum & ComponentProps<"input">) {
  const ident = id ?? nome;
  return (
    <Rotulo id={ident} rotulo={rotulo} obrigatorio={required} erro={erro} ajuda={ajuda}>
      <input
        id={ident}
        name={nome}
        required={required}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${ident}-erro` : undefined}
        className={`${BASE} h-10 ${erro ? "border-alerta" : "border-borda"} ${className}`}
        {...props}
      />
    </Rotulo>
  );
}

export function CampoSelecao({
  nome,
  rotulo,
  erro,
  ajuda,
  id,
  required,
  opcoes,
  vazio,
  ...props
}: Comum & ComponentProps<"select"> & { opcoes: readonly { valor: string; rotulo: string }[]; vazio?: string }) {
  const ident = id ?? nome;
  return (
    <Rotulo id={ident} rotulo={rotulo} obrigatorio={required} erro={erro} ajuda={ajuda}>
      <select id={ident} name={nome} required={required} aria-invalid={!!erro} className={`${BASE} h-10 ${erro ? "border-alerta" : "border-borda"}`} {...props}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Rotulo>
  );
}

export function CampoAreaTexto({ nome, rotulo, erro, ajuda, id, required, ...props }: Comum & ComponentProps<"textarea">) {
  const ident = id ?? nome;
  return (
    <Rotulo id={ident} rotulo={rotulo} obrigatorio={required} erro={erro} ajuda={ajuda}>
      <textarea id={ident} name={nome} required={required} aria-invalid={!!erro} rows={3} className={`${BASE} py-2 ${erro ? "border-alerta" : "border-borda"}`} {...props} />
    </Rotulo>
  );
}

export function BotaoEnviar({ children, variante = "primario", ...props }: ComponentProps<"button"> & { variante?: "primario" | "secundario" | "perigo" }) {
  const { pending } = useFormStatus();
  const estilos = {
    primario: "bg-marca text-white hover:opacity-90",
    secundario: "border border-borda bg-superficie hover:bg-superficie-2",
    perigo: "border border-alerta/40 text-alerta hover:bg-alerta-suave",
  }[variante];
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${estilos}`}
      {...props}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}
