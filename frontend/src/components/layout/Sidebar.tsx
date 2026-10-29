import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Binary,
  ChevronsLeft,
  ChevronsRight,
  GitBranch,
  LayoutDashboard,
  type LucideIcon,
  Map as MapIcon,
  Wrench,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useUi } from "../../store/ui";
import { IconButton } from "../ui/IconButton";
import { BrandMark } from "./BrandMark";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: MapIcon },
  { to: "/taxonomy", label: "Taxonomy", icon: GitBranch },
  { to: "/workshop", label: "Workshop", icon: Wrench },
  { to: "/index", label: "DBH Index", icon: Binary },
];

export function Sidebar() {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);
  const showLabels = !collapsed;

  return (
    <aside
      className={cn(
        "glass-panel sticky top-3 z-20 m-3 mr-0 flex h-[calc(100vh-1.5rem)] w-[72px] shrink-0 flex-col p-3 transition-[width] duration-300 ease-canopy",
        showLabels && "lg:w-60",
      )}
    >
      <div className="flex h-11 items-center gap-3 px-1.5">
        <BrandMark className="size-8 shrink-0" />
        <div className={cn("hidden min-w-0 flex-col", showLabels && "lg:flex")}>
          <span className="text-base font-extrabold tracking-tight text-white">Canopy</span>
          <span className="truncate text-[11px] text-white/55">Bogota urban forest</span>
        </div>
      </div>

      <nav aria-label="Main" className="mt-6 flex flex-1 flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={label}
            className={({ isActive }) =>
              cn(
                "focus-ring relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                isActive ? "text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-emerald-400/25 bg-emerald-400/10"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                ) : null}
                <Icon className={cn("relative size-5 shrink-0", isActive && "text-emerald-300")} aria-hidden />
                <span className={cn("relative hidden truncate", showLabels && "lg:inline")}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <IconButton
        label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={toggle}
        className="hidden self-center lg:inline-flex"
      >
        {collapsed ? (
          <ChevronsRight className="size-4" aria-hidden />
        ) : (
          <ChevronsLeft className="size-4" aria-hidden />
        )}
      </IconButton>
    </aside>
  );
}
