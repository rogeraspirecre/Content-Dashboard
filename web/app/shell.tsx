"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const I = {
  dashboard: (
    <svg viewBox="0 0 20 20">
      <path d="M3 3h6v8H3V3Zm8 0h6v5h-6V3ZM3 13h6v4H3v-4Zm8-3h6v7h-6v-7Z" />
    </svg>
  ),
  suite: (
    <svg viewBox="0 0 20 20">
      <path d="M10 1.8 17.5 6v8L10 18.2 2.5 14V6L10 1.8Zm0 2.3L4.5 7.2v5.6L10 15.9l5.5-3.1V7.2L10 4.1Zm0 2.2 3.5 2L10 10.2l-3.5-1.9L10 6.3Z" />
    </svg>
  ),
  generate: (
    <svg viewBox="0 0 20 20">
      <path d="M10 2l1.7 4.3L16 8l-4.3 1.7L10 14l-1.7-4.3L4 8l4.3-1.7L10 2Zm6 9 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 20 20">
      <path d="M3 3h3v14H3V3Zm5 0h3v14H8V3Zm5.2.6 2.9-.8 3 13.6-2.9.8-3-13.6Z" transform="scale(.85) translate(1.5 1.5)" />
    </svg>
  ),
  ideas: (
    <svg viewBox="0 0 20 20">
      <path d="M10 2a6 6 0 0 1 3.6 10.8c-.5.4-.6.8-.6 1.2H7c0-.4-.1-.8-.6-1.2A6 6 0 0 1 10 2ZM7.5 15.5h5V17a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 7.5 17v-1.5Z" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 20 20">
      <path d="M3 17V9h3v8H3Zm5.5 0V3h3v14h-3ZM14 17v-6h3v6h-3Z" />
    </svg>
  ),
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Create",
    items: [
      { href: "/", label: "Dashboard", icon: I.dashboard },
      { href: "/suite", label: "Full suite", icon: I.suite },
      { href: "/generate", label: "Generate ideas", icon: I.generate },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/library", label: "Library", icon: I.library },
      { href: "/ideas", label: "Ideas backlog", icon: I.ideas },
      { href: "/performance", label: "Performance", icon: I.performance },
    ],
  },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app">
      <aside className="side">
        <div className="side-brand">
          <div className="side-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M11 2 2 22h4.4l1.9-4.6h2.4L11 2Zm2 0 9 20h-4.4l-7-20h2.4Z" />
            </svg>
          </div>
          <div className="side-name">
            <strong>Aspire CRE</strong>
            <span>Content Console</span>
          </div>
        </div>

        <nav className="side-nav">
          {GROUPS.map((g) => (
            <div className="side-group" key={g.label}>
              <div className="side-label">{g.label}</div>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={path === it.href ? "side-link on" : "side-link"}
                >
                  <span className="side-ic" aria-hidden="true">{it.icon}</span>
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <div className="side-ava" aria-hidden="true">BA</div>
          <div className="side-who">
            <strong>Brandon Avedikian</strong>
            <span>@bavedikian &middot; Houston</span>
          </div>
        </div>
      </aside>

      <div className="main">{children}</div>
    </div>
  );
}
