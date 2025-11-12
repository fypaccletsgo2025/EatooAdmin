import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./Layout.css";
import AdminAccess from "./AdminAccess";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/restaurant-requests", label: "Owner Requests" },
  { to: "/user-submissions", label: "User Submissions" },
  { to: "/manage-restaurants", label: "Restaurants" },
];

export default function Layout() {
  const { isAdmin, logout } = useAuth();

  if (!isAdmin) {
    return <AdminAccess />;
  }

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">EA</div>
            <div>
              <p className="brand-name">Eatoo Admin</p>
              <p className="brand-subtitle">Partner operations</p>
            </div>
          </div>
          <nav className="nav-links">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <span>{label}</span>
                <span className="nav-indicator" aria-hidden="true">
                  &gt;
                </span>
              </NavLink>
            ))}
          </nav>
          <button className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
        <div className="sidebar-footer">
          <p className="sidebar-tip-title">Daily tip</p>
          <p className="sidebar-tip-copy">
            Clear the pending queue to keep new restaurants launching on time.
          </p>
        </div>
      </aside>
      <main className="main-content">
        <div className="main-surface">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
