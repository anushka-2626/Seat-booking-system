"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/week-view", label: "Week View" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/holidays", label: "Holidays" },
  { href: "/admin/allocations", label: "Allocations" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <nav className="w-full h-16 bg-white border-b border-slate-200 shadow-sm px-8 flex items-center justify-between gap-8">
      {/* Left: Admin Panel Title */}
      <div className="flex-shrink-0">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          ADMIN PANEL
        </h1>
      </div>

      {/* Center: Navigation Links */}
      <div className="flex-1 flex items-center justify-center gap-8">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition duration-200 border-b-2 ${
                active
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-700 border-transparent hover:text-blue-600"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Right: Profile and Logout Buttons */}
      <div className="flex-shrink-0 flex items-center gap-4">
        <Link
          href="/profile"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Profile
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}


