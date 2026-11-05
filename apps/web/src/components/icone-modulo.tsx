import {
  Building2,
  CalendarDays,
  CalendarRange,
  FileText,
  FolderOpen,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Plug,
  ShieldAlert,
  Sun,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Modulo } from "@/lib/navegacao";

const ICONES: Record<Modulo["icone"], LucideIcon> = {
  painel: LayoutDashboard,
  dia: Sun,
  obras: Building2,
  tarefas: ListChecks,
  equipe: UsersRound,
  agenda: CalendarDays,
  planejamento: CalendarRange,
  contratos: Landmark,
  documentos: FolderOpen,
  riscos: ShieldAlert,
  relatorios: FileText,
  integracoes: Plug,
  cadastros: Users,
};

export function IconeModulo({ icone, className = "size-4" }: { icone: Modulo["icone"]; className?: string }) {
  const Icone = ICONES[icone];
  return <Icone className={className} aria-hidden="true" />;
}
