"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Generate"],
  ["/library", "Library"],
  ["/ideas", "Ideas"],
  ["/performance", "Performance"],
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="brandmark">
        <div className="m" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M11 2 2 22h4.4l1.9-4.6h2.4L11 2Zm2 0 9 20h-4.4l-7-20h2.4Z" />
          </svg>
        </div>
        <span className="wordmark">Content Console</span>
      </div>
      <div className="navlinks">
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "navlink on" : "navlink"}
          >
            {label}
          </Link>
        ))}
      </div>
      <span className="navclient">Aspire CRE</span>
    </nav>
  );
}
