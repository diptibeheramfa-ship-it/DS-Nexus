import type { LucideIcon } from "lucide-react";
import {
  CalendarIcon,
  ChevronRightIcon,
  IndianRupee,
  FileTextIcon,
  LayoutGridIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
  XIcon,
  LogOutIcon,
  Loader2,
  Award,
  MessageSquarePlus,
  MessageSquare,
  ShieldCheck,
  Building2,
  CalendarDays,
  BadgePercent,
  ScrollText,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../api/axios";
import logo from "../assets/favicon.png";
import InstallPwaButton from "./InstallPwaButton";

type NavChild = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  id: string;
  name: string;
  icon: LucideIcon;
  href?: string;
  children?: NavChild[];
};

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isCbiRoute = pathname.startsWith("/cbi");
  const [fetchedName, setFetchedName] = useState("");
  const [fetchedCode, setFetchedCode] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const { user, logout, loading } = useAuth();

  // Periodic poll for unread chat messages to display unread badge on sidebar
  useEffect(() => {
    if (!user) return;
    const fetchChatUnread = () => {
      api.get("/chat/conversations")
        .then(({ data }) => {
          if (data?.success && typeof data.totalUnread === "number") {
            setChatUnread(data.totalUnread);
          }
        })
        .catch(() => {});
    };
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 12000);
    return () => clearInterval(interval);
  }, [user, pathname]);

  useEffect(() => {
    api.get("/profile")
      .then(({ data }) => {
        if (data && data.firstName) {
          setFetchedName(`${data.firstName} ${data.lastName || ""}`.trim());
        }
        if (data && data.employeeCode) {
          setFetchedCode(data.employeeCode);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const formattedEmailName = user?.email ? user.email.split("@")[0] : "";
  const userName =
    fetchedName || user?.name || formattedEmailName;

  const cbiNavGroups: NavGroup[] = [
    {
      id: "cbi-dashboard",
      name: "Executive Overview",
      href: "/cbi/dashboard",
      icon: LayoutGridIcon,
    },
    {
      id: "cbi-clients",
      name: "Client Database",
      href: "/cbi/clients",
      icon: Building2,
    },
    {
      id: "cbi-onboarding",
      name: "Client Onboard",
      href: "/cbi/onboarding",
      icon: UserPlus,
    },
    {
      id: "cbi-portfolio-review",
      name: "Portfolio Review",
      href: "/cbi/portfolio-review",
      icon: UserCheck,
    },
    ...(isAdmin
      ? [
          {
            id: "cbi-authorization",
            name: "Roles Authorization",
            href: "/cbi/authorization",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const emsNavGroups: NavGroup[] = [
    {
      id: "dashboard",
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutGridIcon,
    },
    ...(isAdmin
      ? [
        {
          id: "workforce",
          name: "Workforce",
          icon: Users,
          children: [
            { name: "Employees", href: "/employees", icon: UserIcon },
            { name: "Department", href: "/departments", icon: Building2 },
            { name: "Holidays", href: "/holidays", icon: CalendarDays },
          ],
        },
      ]
      : []),
    {
      id: "time-leave",
      name: "Time & Leave",
      icon: CalendarIcon,
      children: [
        { name: "Attendance", href: "/attendance", icon: CalendarIcon },
        { name: "Leave", href: "/leave", icon: FileTextIcon },
      ],
    },
    ...(isAdmin
      ? [
        {
          id: "payroll",
          name: "Payroll & Finance",
          icon: IndianRupee,
          children: [
            { name: "Payslips", href: "/payslips", icon: IndianRupee },
            { name: "Incentive", href: "/incentives", icon: BadgePercent },
          ],
        },
      ]
      : [
        {
          id: "payslips",
          name: "Payslips",
          href: "/payslips",
          icon: IndianRupee,
        },
      ]),
    {
      id: "performance",
      name: "Performance",
      icon: Award,
      children: [
        {
          name: isAdmin ? "KPA & Appraisal" : "My KPA Scorecard",
          href: isAdmin ? "/kpa" : "/kpa/scorecard",
          icon: Award,
        },
        { name: "Feedback", href: "/feedback", icon: MessageSquarePlus },
      ],
    },
    {
      id: "chat",
      name: "Team Chat",
      href: "/chat",
      icon: MessageSquare,
    },
    ...(isAdmin
      ? [
        {
          id: "administration",
          name: "Administration",
          icon: ShieldCheck,
          children: [
            { name: "Authorization", href: "/authorization", icon: ShieldCheck },
            { name: "Activity Logs", href: "/activity-logs", icon: ScrollText },
            { name: "Settings", href: "/settings", icon: SettingsIcon },
          ],
        },
      ]
      : [
        {
          id: "settings",
          name: "Settings",
          href: "/settings",
          icon: SettingsIcon,
        },
      ]),
  ];

  const navGroups: NavGroup[] = isCbiRoute ? cbiNavGroups : emsNavGroups;

  // Track expanded parent menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      if (
        g.children?.some((c) =>
          c.href === "/dashboard" ? pathname === c.href : pathname.startsWith(c.href)
        )
      ) {
        initial[g.id] = true;
      }
    });
    return initial;
  });

  // Automatically ensure active route's group is open
  useEffect(() => {
    navGroups.forEach((g) => {
      if (
        g.children?.some((c) =>
          c.href === "/dashboard" ? pathname === c.href : pathname.startsWith(c.href)
        )
      ) {
        setOpenMenus((prev) => ({ ...prev, [g.id]: true }));
      }
    });
  }, [pathname, isAdmin, isCbiRoute]);

  const toggleMenu = (groupId: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logo}
              alt="D&S Investment Logo"
              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 shrink-0 border border-white/10"
            />
            <div className="min-w-0">
              <p className="font-semibold text-[13px] text-white tracking-wide">
                DS Nexus
              </p>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Employee Management System
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <XIcon size={20} />
          </button>
        </div>
      </div>

      {userName && (
        <div className="mx-3 mt-4 mb-1 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center ring-1 ring-white/10 shrink-0">
              <span className="text-slate-400 text-xs font-semibold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-slate-200 truncate">
                {userName}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[11px] text-slate-500 truncate">
                  {isAdmin ? "Administrator" : "Employee"}
                </p>
                {(fetchedCode || user?.employeeCode) && (
                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30">
                    #{fetchedCode || user?.employeeCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Portal Switcher Button */}
      <div className="mx-3 mt-3 mb-1">
        {isCbiRoute ? (
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="group relative flex flex-col p-3 rounded-xl bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950/60 border border-slate-700/80 hover:border-indigo-400/60 shadow-md transition-all duration-200 cursor-pointer"
            title="Return to Employee Management System"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-white group-hover:text-indigo-200 transition-colors">
                DS Nexus HR & EMS
              </p>
              <span className="text-[11px] font-semibold text-indigo-400 group-hover:-translate-x-0.5 transition-transform flex items-center gap-1">
                ← Return
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-1">
              Workforce, Attendance, Payroll & Admin
            </p>
          </Link>
        ) : (
          <Link
            to="/cbi/dashboard"
            onClick={() => setMobileOpen(false)}
            className="group relative flex flex-col p-3 rounded-xl bg-linear-to-r from-indigo-950/90 via-purple-950/70 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-950/60 hover:shadow-indigo-900/40 transition-all duration-200 overflow-hidden cursor-pointer"
            title="Launch Client & Business Intelligence Dashboard"
          >
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/15 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-white group-hover:text-indigo-200 transition-colors">
                Client & Business Intel (CBI)
              </p>
              <ChevronRightIcon className="size-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-1">
              Open dedicated CBI Dashboard →
            </p>
          </Link>
        )}
      </div>

      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Navigation
        </p>
      </div>

      <nav
        className="flex-1 px-3 space-y-1 overflow-y-auto"
        aria-label="Main navigation"
      >
        {loading ? (
          <div className="flex items-center gap-2 p-3 text-slate-400">
            <Loader2 className="animate-spin w-4 h-4" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          navGroups.map((group) => {
            const Icon = group.icon;
            const hasChildren = Boolean(group.children && group.children.length > 0);

            // Standalone direct item (e.g. Dashboard or CBI items)
            if (!hasChildren && group.href) {
              const isActive =
                group.href === "/dashboard" || group.href === "/cbi/dashboard"
                  ? pathname === group.href
                  : pathname.startsWith(group.href);

              return (
                <Link
                  key={group.id}
                  to={group.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150 relative ${isActive
                    ? "bg-indigo-500/15 text-indigo-300 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-indigo-500" />
                  )}
                  <Icon
                    className={`size-4 shrink-0 transition-colors ${isActive
                      ? "text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-300"
                      }`}
                  />
                  <span className="flex-1">{group.name}</span>
                  {group.id === "chat" && chatUnread > 0 && (
                    <span className="bg-[#25d366] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                      {chatUnread}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRightIcon className="size-4 text-indigo-400" />
                  )}
                </Link>
              );
            }

            // Parent Menu with expandable children
            const isGroupActive = Boolean(
              group.children?.some((child) =>
                child.href === "/dashboard"
                  ? pathname === child.href
                  : pathname.startsWith(child.href)
              )
            );
            const isOpen = Boolean(openMenus[group.id]);

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleMenu(group.id)}
                  className={`group flex items-center gap-3 w-full px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 text-left select-none cursor-pointer ${isGroupActive
                    ? "text-white bg-white/5 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <Icon
                    className={`size-4 shrink-0 transition-colors ${isGroupActive
                      ? "text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-300"
                      }`}
                  />
                  <span className="flex-1">{group.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      {group.children!.length}
                    </span>
                    <ChevronRightIcon
                      className={`size-3.5 transition-transform duration-200 ${isOpen
                        ? "rotate-90 text-indigo-400"
                        : "text-slate-500 group-hover:text-slate-300"
                        }`}
                    />
                  </div>
                </button>

                {/* Submenu Children */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen
                    ? "max-h-96 opacity-100 my-0.5"
                    : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                >
                  <div className="ml-5 pl-2.5 border-l border-white/10 space-y-0.5 py-0.5">
                    {group.children!.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive =
                        child.href === "/dashboard"
                          ? pathname === child.href
                          : pathname.startsWith(child.href);

                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all duration-150 relative ${isChildActive
                            ? "bg-indigo-500/20 text-indigo-200 font-semibold"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                          {isChildActive && (
                            <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-indigo-500" />
                          )}
                          <ChildIcon
                            className={`size-3.5 shrink-0 transition-colors ${isChildActive
                              ? "text-indigo-400"
                              : "text-slate-500 group-hover:text-slate-300"
                              }`}
                          />
                          <span className="flex-1 truncate">{child.name}</span>
                          {isChildActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <InstallPwaButton />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[13px] font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/8 transition-all duration-150 cursor-pointer"
        >
          <LogOutIcon className="w-4.25 h-4.25" />
          <span className="ml-2 text-sm font-medium">Log Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg border border-white/10 cursor-pointer"
        aria-label="Open sidebar"
      >
        <MenuIcon size={20} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className="hidden lg:flex flex-col h-full w-65 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 text-white shrink-0 border-r border-white/10">
        {sidebarContent}
      </aside>

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 text-white z-[70] flex flex-col transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
