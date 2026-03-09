"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/simulator", label: "Patient Simulator", icon: "🧪" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/feedback", label: "Feedback Monitor", icon: "💬" },
  { href: "/tickets", label: "Complaint Tickets", icon: "🎫" },
  { href: "/heatmap", label: "Department Heatmap", icon: "🗺️" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">R</div>
          <div>
            <p className="text-white font-bold text-sm">Recovery Agent</p>
            <p className="text-gray-400 text-xs">Hospital AI System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                active
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs text-center">GlitchCon 2.0 — GKM_3</p>
      </div>
    </aside>
  );
}