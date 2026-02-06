"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type NavItem = { href: string; label: string; auth?: boolean; badge?: number };

export default function HeaderTabs({
  isLoggedIn,
  isAdmin,
  friendRequestCount = 0,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  friendRequestCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems: NavItem[] = useMemo(
    () => [
      { href: "/", label: "Feed" },
      { href: "/bets/new", label: "Create Bet", auth: true },
      {
        href: "/friends",
        label: "Friends",
        auth: true,
        badge: friendRequestCount,
      },
      { href: "/groups", label: "Groups", auth: true },
      { href: "/wallet", label: "Wallet", auth: true },
    ],
    [friendRequestCount],
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navHref = (item: NavItem) => {
    if (!item.auth) return item.href;
    if (isLoggedIn) return item.href;
    return `/auth/sign-in?next=${encodeURIComponent(item.href)}`;
  };

  const locked = (item: NavItem) => Boolean(item.auth && !isLoggedIn);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) =>
      e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const badge = (active: boolean, n: number) => (
    <span
      className={cn(
        "ml-2 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1 text-[11px] font-bold",
        active ? "bg-white text-primary-600" : "bg-red-500 text-white",
      )}
    >
      {n > 9 ? "9+" : n}
    </span>
  );

  return (
    <div className="min-w-0 flex items-center">
      {/* Mobile */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-primary-50 transition"
        >
          ☰
        </button>

        {open && (
          <>
            {/* Backdrop: beginnt unter dem Header */}
            <div
              className="fixed left-0 right-0 top-16 bottom-0 z-[60] bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Drawer: beginnt unter dem Header */}
            <div className="fixed left-0 top-16 z-[70] w-[82vw] max-w-[320px] h-[calc(100dvh-4rem)] bg-white shadow-2xl border-r border-gray-100">
              <div className="h-full overflow-y-auto p-4">
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="text-base font-semibold text-gray-900">
                    Menu
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {navItems.map((it) => {
                    const active = isActive(it.href);
                    const isLocked = locked(it);

                    return (
                      <Link
                        key={it.href}
                        href={navHref(it)}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        title={isLocked ? "Sign in required" : undefined}
                        className={cn(
                          "rounded-2xl px-3 py-3 text-sm font-semibold transition",
                          active
                            ? "bg-primary-600 text-white"
                            : "text-gray-700 hover:bg-primary-50 hover:text-primary-700",
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex items-center">
                            {it.label}
                            {!!it.badge &&
                              it.badge > 0 &&
                              !isLocked &&
                              badge(active, it.badge)}
                          </span>

                          {isLocked && (
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                active
                                  ? "border-white/20 bg-white/20 text-white"
                                  : "border-primary-200 bg-primary-100 text-primary-700",
                              )}
                            >
                              locked
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "mt-2 rounded-2xl px-3 py-3 text-sm font-semibold transition",
                        isActive("/admin")
                          ? "bg-primary-900 text-white"
                          : "bg-primary-900 text-white hover:bg-primary-800",
                      )}
                    >
                      Admin
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:flex min-w-0 max-w-full">
        <div className="flex w-full max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-1.5 shadow-sm overflow-x-auto flex-nowrap whitespace-nowrap">
          {navItems.map((it) => {
            const active = isActive(it.href);
            const isLocked = locked(it);
            return (
              <Link
                key={it.href}
                href={navHref(it)}
                aria-current={active ? "page" : undefined}
                title={isLocked ? "Sign in required" : undefined}
                className={cn(
                  "relative inline-flex shrink-0 items-center rounded-full px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-700 hover:text-primary-700 hover:bg-primary-50",
                  isLocked && "opacity-85",
                )}
              >
                {it.label}
                {isLocked && (
                  <span
                    className={cn(
                      "ml-2 inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-primary-100 text-primary-700",
                    )}
                  >
                    locked
                  </span>
                )}
                {!!it.badge &&
                  it.badge > 0 &&
                  !isLocked &&
                  badge(active, it.badge)}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "ml-1 shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition",
                isActive("/admin")
                  ? "bg-primary-900 text-white shadow-sm"
                  : "bg-primary-900 text-white hover:bg-primary-800",
              )}
              aria-current={isActive("/admin") ? "page" : undefined}
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
