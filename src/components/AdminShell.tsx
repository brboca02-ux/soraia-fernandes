import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingBag, Megaphone, Settings, LogOut, ShieldCheck, ExternalLink, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminNotificationsBell } from "@/components/admin/AdminNotificationsBell";
import { BrandLogo } from "@/components/BrandLogo";

type MenuKey = "dashboard" | "produtos" | "pedidos" | "marketing" | "configuracoes";

const MENU: { key: MenuKey; label: string; to: string; icon: typeof LayoutDashboard; match: string[] }[] = [
  { key: "dashboard", label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  { key: "produtos", label: "Produtos", to: "/produtos", icon: Package, match: ["/produtos", "/categorias"] },
  { key: "pedidos", label: "Pedidos", to: "/pedidos", icon: ShoppingBag, match: ["/pedidos"] },
  
  { key: "marketing", label: "Marketing", to: "/marketing", icon: Megaphone, match: ["/marketing"] },
  { key: "configuracoes", label: "Configurações", to: "/admin", icon: Settings, match: ["/admin"] },
];

export type AdminTab = { label: string; to: string };

export function AdminShell({
  active,
  tabs,
  children,
}: {
  active: MenuKey;
  tabs?: AdminTab[];
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMobile, setOpenMobile] = useState(false);
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      if (!pathname.startsWith("/login")) {
        navigate({ to: "/login", search: { redirect: pathname } });
      }
      return;
    }

    // Verify admin role
    const checkRole = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin");
      setIsAdmin(!!hasAdminRole);

      if (!hasAdminRole) {
        toast.error("Acesso negado: você não tem permissão de administrador.");
        navigate({ to: "/" });
      }
    };

    checkRole();
  }, [loading, session, navigate, pathname]);

  // Fecha o menu mobile ao trocar de rota e bloqueia scroll do body enquanto aberto
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname]);

  useEffect(() => {
    if (openMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [openMobile]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  }

  if (loading || !session || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="text-sm text-muted-foreground">Verificando permissões...</div>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex admin-scope">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-[#0b0b0f] text-white sticky top-0 h-screen">
        <div className="px-5 h-24 flex items-center gap-3 border-b border-white/10">
          <BrandLogo eager variant="header" className="h-14 w-auto max-w-[160px] shrink-0" />
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-semibold">
            Painel admin
          </div>
        </div>

        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/15 border border-primary/30">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Modo administrador
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {MENU.map((m) => {
            const isActive = active === m.key;
            const Icon = m.icon;
            return (
              <Link
                key={m.key}
                to={m.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-12px_var(--primary)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-[11px] font-medium text-white/60 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/5 transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver loja
            </span>
          </a>
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[11px] font-bold text-primary uppercase">
              {(session.user.email ?? "?").slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-white truncate" title={session.user.email ?? ""}>
                {session.user.email}
              </div>
              <div className="text-[10px] text-white/50">Administrador</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-white/80 hover:text-white px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 transition border border-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair do painel
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[#0b0b0f] text-white border-b border-white/10 flex items-center justify-between px-4">
        <button
          onClick={() => setOpenMobile(true)}
          className="text-sm font-medium px-3 py-1.5 rounded-md border border-white/20"
        >
          Menu
        </button>
        <BrandLogo eager variant="header" className="h-10 w-auto max-w-[136px]" />
        <AdminNotificationsBell />
      </div>

      {openMobile && typeof document !== "undefined" && createPortal(
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpenMobile(false)} />
          <aside className="absolute left-0 top-0 h-full w-[85%] max-w-xs bg-[#0b0b0f] text-white shadow-2xl flex flex-col animate-in slide-in-from-left">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <BrandLogo eager variant="header" className="h-12 w-auto max-w-[150px] shrink-0" />
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-semibold">
                  Painel admin
                </div>
              </div>
              <button
                onClick={() => setOpenMobile(false)}
                aria-label="Fechar menu"
                className="h-9 w-9 flex items-center justify-center rounded-md border border-white/10 hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/15 border border-primary/30 mb-4">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Modo administrador
                </span>
              </div>
              <nav className="space-y-1">
                {MENU.map((m) => {
                  const isActive = active === m.key;
                  const Icon = m.icon;
                  return (
                    <Link
                      key={m.key}
                      to={m.to}
                      onClick={() => setOpenMobile(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive ? "bg-primary text-primary-foreground" : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {m.label}
                    </Link>
                  );
                })}
              </nav>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-2 text-xs text-white/70 hover:text-white px-3 py-2 rounded-md bg-white/5 border border-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver loja pública
              </a>
            </div>
            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[11px] font-bold text-primary uppercase">
                  {(session.user.email ?? "?").slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate" title={session.user.email ?? ""}>
                    {session.user.email}
                  </div>
                  <div className="text-[10px] text-white/50">Administrador</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-white/90 px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair do painel
              </button>
            </div>
          </aside>
        </div>,
        document.body,
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 pt-14 lg:pt-0">
        {/* Admin top bar */}
        <div className="hidden lg:flex sticky top-0 z-30 h-12 items-center justify-between px-6 lg:px-10 bg-gradient-to-r from-[#0b0b0f] via-[#161118] to-[#0b0b0f] border-b border-primary/30 text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                Painel administrativo
              </span>
            </div>
            <span className="text-[11px] text-white/50">
              {MENU.find((m) => m.key === active)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/60">
            <a href="/" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1.5">
              <ExternalLink className="h-3 w-3" /> Ver loja pública
            </a>
            <span className="text-white/20">|</span>
            <span className="truncate max-w-[180px]">{session.user.email}</span>
            <AdminNotificationsBell />
          </div>
        </div>

        {tabs && tabs.length > 0 && (
          <div className="sticky top-14 lg:top-12 z-20 bg-background/95 backdrop-blur border-b border-border">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map((t) => {
                  const isActive = pathname === t.to || pathname.startsWith(t.to + "/");
                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export const PRODUCTS_TABS: AdminTab[] = [
  { label: "Produtos", to: "/produtos" },
  { label: "Categorias", to: "/categorias" },
];

export const MARKETING_TABS: AdminTab[] = [
  { label: "Leads", to: "/marketing" },
  { label: "Cupons", to: "/marketing" },
  { label: "Newsletter", to: "/marketing" },
];
