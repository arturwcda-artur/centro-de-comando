import { NextResponse, type NextRequest } from "next/server";

/** Diz ao Claude onde autorizar o acesso ao conector. Não tem dado do sistema. */
export function GET(request: NextRequest) {
  return NextResponse.json({
    resource: `${request.nextUrl.origin}/api/mcp`,
    authorization_servers: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Centro de Comando",
  });
}
