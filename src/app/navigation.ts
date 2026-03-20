import {
  CalendarDays,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  Users,
  UserSquare2,
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
  { label: "Recursos", to: "/recursos", icon: UserSquare2, description: "Profesionales y equipos" },
  { label: "Servicios", to: "/servicios", icon: Briefcase, description: "Catalogo de servicios" },
  { label: "Disponibilidad", to: "/disponibilidad", icon: CalendarDays, description: "Reglas y excepciones" },
  { label: "Equipo", to: "/equipo", icon: ShieldCheck, description: "Usuarios internos" },
  { label: "Configuracion", to: "/configuracion", icon: Settings, description: "Ajustes del negocio" },
];

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Vista general operativa del negocio." },
  "/agenda": { title: "Agenda", subtitle: "Gestion semanal de turnos y disponibilidad." },
  "/turnos": { title: "Turnos", subtitle: "Administracion completa de reservas y bookings." },
  "/clientes": { title: "Clientes", subtitle: "Historial y datos de clientes del tenant." },
  "/locales": { title: "Locales", subtitle: "Administracion de sedes y sucursales." },
  "/recursos": { title: "Recursos", subtitle: "Profesionales, salas y equipamiento operativo." },
  "/servicios": { title: "Servicios", subtitle: "Catalogo de servicios y reglas comerciales." },
  "/disponibilidad": { title: "Disponibilidad", subtitle: "Reglas semanales y excepciones por fecha." },
  "/equipo": { title: "Equipo", subtitle: "Usuarios del panel y permisos." },
  "/configuracion": { title: "Configuracion", subtitle: "Parametros generales del tenant." },
  "/health": { title: "Health", subtitle: "Smoke route tecnica." },
};

export function getPageMeta(pathname: string) {
  return PAGE_META[pathname] ?? { title: "AgendateYA Admin", subtitle: "Panel de administracion" };
}
