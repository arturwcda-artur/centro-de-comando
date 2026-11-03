import { ImageResponse } from "next/og";

const TAMANHOS = { "192": { lado: 192, margem: 0 }, "512": { lado: 512, margem: 0 }, "512-maskable": { lado: 512, margem: 0.1 } } as const;

export function generateStaticParams() {
  return Object.keys(TAMANHOS).map((tamanho) => ({ tamanho }));
}

export const dynamicParams = false;

/** Ícones PNG do aplicativo instalável (PWA), desenhados a partir do símbolo da marca. */
export async function GET(_: Request, { params }: RouteContext<"/icones/[tamanho]">) {
  const { tamanho } = await params;
  const { lado, margem } = TAMANHOS[tamanho as keyof typeof TAMANHOS];
  const interno = Math.round(lado * (1 - 2 * margem));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f5fae" }}>
        <svg width={interno * 0.7} height={interno * 0.7} viewBox="0 0 32 32">
          <path d="M8 22V12l8-4 8 4v10" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M13 22v-6h6v6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: lado, height: lado },
  );
}
