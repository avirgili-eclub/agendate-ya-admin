import {
  CalendarDays,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  Users,
  UserSquare2,
  User,
  Wrench,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  description: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, description: "Panel de control" },
  { label: "Agenda", to: "/agenda", icon: CalendarDays, description: "Turnos y calendario" },
  { label: "Turnos", to: "/turnos", icon: ClipboardList, description: "Gestion de reservas" },
  { label: "Clientes", to: "/clientes", icon: Users, description: "Directorio de clientes" },
  { label: "Locales", to: "/locales", icon: MapPin, description: "Sucursales y sedes" },
  { label: "Equipos", to: "/equipos", icon: UserSquare2, description: "Profesionales y equipos" },
  { label: "Servicios", to: "/servicios", icon: Briefcase, description: "Catalogo de servicios" },
  { label: "Disponibilidad", to: "/disponibilidad", icon: CalendarDays, description: "Reglas y excepciones" },
  { label: "Equipo", to: "/equipo", icon: ShieldCheck, description: "Usuarios internos" },
  { label: "Perfil", to: "/perfil", icon: User, description: "Perfil profesional" },
  { label: "Configuracion", to: "/configuracion", icon: Settings, description: "Ajustes del negocio" },
];

const PROFESSIONAL_HIDDEN_ROUTES = new Set(["/clientes", "/equipos", "/equipo", "/configuracion"]);
const PROFESSIONAL_ONLY_ROUTES = new Set(["/perfil"]);

export function getNavItemsForRole(role?: string) {
  const normalizedRole = role?.toUpperCase() ?? "";

  if (normalizedRole === "PROFESSIONAL") {
    return APP_NAV_ITEMS.filter((item) => !PROFESSIONAL_HIDDEN_ROUTES.has(item.to));
  }

  return APP_NAV_ITEMS.filter((item) => !PROFESSIONAL_ONLY_ROUTES.has(item.to));
}

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Vista general operativa del negocio." },
  "/agenda": { title: "Agenda", subtitle: "Gestion semanal de turnos y disponibilidad." },
  "/turnos": { title: "Turnos", subtitle: "Gestión completa de reservas y turnos del negocio" },
  "/clientes": { title: "Clientes", subtitle: "Gestiona tu base de clientes, historial de turnos y comunicaciones." },
  "/locales": { title: "Locales", subtitle: "Administracion de sedes y sucursales." },
  "/equipos": { title: "Equipos", subtitle: "Profesionales, salas y equipamiento operativo." },
  "/servicios": { title: "Servicios", subtitle: "Gestiona el catálogo de servicios del negocio." },
  "/disponibilidad": { title: "Disponibilidad", subtitle: "Reglas semanales y excepciones por fecha." },
  "/equipo": { title: "Equipo", subtitle: "Usuarios del panel y permisos." },
  "/perfil": { title: "Perfil", subtitle: "Mi informacion y perfil profesional." },
  "/configuracion": { title: "Configuracion", subtitle: "Ajusta la configuración de tu cuenta y preferencias del sistema." },
  "/settings": { title: "Configuracion", subtitle: "Ajusta la configuración de tu cuenta y preferencias del sistema." },
  "/health": { title: "Health", subtitle: "Smoke route tecnica." },
};

export function getPageMeta(pathname: string) {
  return PAGE_META[pathname] ?? { title: "AgendateYA Admin", subtitle: "Panel de administracion" };
}
