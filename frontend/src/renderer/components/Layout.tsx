import { NavLink, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: "◉" },
  { to: "/theory", label: "Music Theory", icon: "♩" },
  { to: "/library", label: "Library", icon: "♫" },
  { to: "/ai-studio", label: "AI Studio", icon: "💬" },
  { to: "/samples", label: "Samples", icon: "▤" },
];

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 bg-surface-800 border-r border-surface-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-surface-700">
          <h1 className="text-sm font-bold text-accent-300">Music Copilot</h1>
          <p className="text-xs text-gray-600 mt-0.5">v0.1.0</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? "bg-accent-500/15 text-accent-300"
                    : "text-gray-500 hover:text-gray-300 hover:bg-surface-700/50"
                }`
              }
            >
              <span className="w-4 text-center text-sm">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-surface-700 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Backend connected
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-surface-900">
        {isDashboard ? (
          <div className="p-4 h-full">
            <Outlet />
          </div>
        ) : (
          <div className="p-6 max-w-5xl mx-auto">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
