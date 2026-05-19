import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  User,
  UserSquare2,
  Users,
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
  { label: "Membresias", to: "/membresias", icon: BadgeCheck, description: "Planes y clientes suscriptos" },
  { label: "Locales", to: "/locales", icon: MapPin, description: "Sucursales y sedes" },
  { label: "Equipos", to: "/equipos", icon: UserSquare2, description: "Profesionales y equipos" },
  { label: "Servicios", to: "/servicios", icon: Briefcase, description: "Catalogo de servicios" },
  { label: "Disponibilidad", to: "/disponibilidad", icon: CalendarDays, description: "Reglas y excepciones" },
  { label: "Usuarios", to: "/equipo", icon: ShieldCheck, description: "Usuarios internos" },
  { label: "Perfil", to: "/perfil", icon: User, description: "Perfil profesional" },
  { label: "Configuracion", to: "/configuracion", icon: Settings, description: "Ajustes del negocio" },
];

const PROFESSIONAL_HIDDEN_ROUTES = new Set(["/clientes", "/membresias", "/equipos", "/equipo", "/configuracion"]);
const PROFESSIONAL_ONLY_ROUTES = new Set(["/perfil"]);

type GetNavItemsOptions = {
  showMemberships?: boolean;
};

export function getNavItemsForRole(role?: string, options: GetNavItemsOptions = {}) {
  const normalizedRole = role?.toUpperCase() ?? "";
  const showMemberships = options.showMemberships ?? true;

  if (normalizedRole === "PROFESSIONAL") {
    return APP_NAV_ITEMS.filter((item) => {
      if (!showMemberships && item.to === "/membresias") {
        return false;
      }
      return !PROFESSIONAL_HIDDEN_ROUTES.has(item.to);
    });
  }

  return APP_NAV_ITEMS.filter((item) => {
    if (!showMemberships && item.to === "/membresias") {
      return false;
    }
    return !PROFESSIONAL_ONLY_ROUTES.has(item.to);
  });
}

type BasePageMeta = {
  title: string;
  subtitle: string;
};

export type PageMeta = BasePageMeta & {
  breadcrumb: string;
};

export const PAGE_META: Record<string, BasePageMeta> = {
  "/": { title: "Panel", subtitle: "Vista general operativa del negocio." },
  "/dashboard": { title: "Dashboard", subtitle: "Vista general operativa del negocio." },
  "/agenda": { title: "Agenda", subtitle: "Gestion semanal de turnos y disponibilidad." },
  "/turnos": { title: "Turnos", subtitle: "Gestion completa de reservas y turnos del negocio" },
  "/clientes": { title: "Clientes", subtitle: "Gestiona tu base de clientes, historial de turnos y comunicaciones." },
  "/membresias": { title: "Membresias", subtitle: "Planes, suscripciones de clientes y cupos recurrentes." },
  "/locales": { title: "Locales", subtitle: "Administracion de sedes y sucursales." },
  "/equipos": { title: "Equipos", subtitle: "Profesionales, salas y equipamiento operativo." },
  "/servicios": { title: "Servicios", subtitle: "Gestiona el catalogo de servicios del negocio." },
  "/disponibilidad": { title: "Disponibilidad", subtitle: "Reglas semanales y excepciones por fecha." },
  "/equipo": { title: "Equipo", subtitle: "Usuarios del panel y permisos." },
  "/perfil": { title: "Perfil", subtitle: "Mi informacion y perfil profesional." },
  "/configuracion": { title: "Configuracion", subtitle: "Ajusta la configuracion de tu cuenta y preferencias del sistema." },
  "/settings": { title: "Configuracion", subtitle: "Ajusta la configuracion de tu cuenta y preferencias del sistema." },
  "/health": { title: "Health", subtitle: "Smoke route tecnica." },
};

type GetPageMetaInput = {
  pathname: string;
  role?: string;
  professionalResourceName?: string | null;
};

function isDashboardPath(pathname: string) {
  return pathname === "/" || pathname === "/dashboard";
}

export function getPageMeta({
  pathname,
  role,
  professionalResourceName,
}: GetPageMetaInput): PageMeta {
  const normalizedRole = role?.toUpperCase() ?? "";

  if (normalizedRole === "PROFESSIONAL" && isDashboardPath(pathname)) {
    return {
      breadcrumb: "Panel / Dashboard",
      title: professionalResourceName?.trim() || "Mi agenda",
      subtitle: "Vista general operativa de tu agenda.",
    };
  }

  if (normalizedRole === "TENANT_ADMIN" && isDashboardPath(pathname)) {
    return {
      breadcrumb: "Admin / Dashboard",
      title: "Panel",
      subtitle: "Vista general operativa del negocio.",
    };
  }

  const baseMeta = PAGE_META[pathname] ?? {
    title: "AgendateYA Admin",
    subtitle: "Panel de administracion",
  };

  return {
    breadcrumb: `Admin / ${baseMeta.title}`,
    title: baseMeta.title,
    subtitle: baseMeta.subtitle,
  };
}
