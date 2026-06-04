import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: "◉" },
  { to: "/theory", label: "Music Theory", icon: "♩" },
  { to: "/library", label: "Library", icon: "♫" },
  { to: "/ai-studio", label: "AI Studio", icon: "💬" },
  { to: "/samples", label: "Samples", icon: "▤" },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-surface-800 border-r border-surface-700 flex flex-col">
        <div className="p-4 border-b border-surface-700">
          <h1 className="text-lg font-bold text-primary-400">Music Copilot</h1>
          <p className="text-xs text-gray-500 mt-1">v0.1.0</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-700"
                }`
              }
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-surface-700 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Backend connected
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-surface-900">
        <div className="p-6 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
