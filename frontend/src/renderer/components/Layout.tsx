import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="h-screen overflow-hidden bg-surface-900">
      <main className="h-full">
        <Outlet />
      </main>
    </div>
  );
}
