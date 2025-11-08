import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, DB_ID } from "../appwrite";

export default function Dashboard() {
  const [stats, setStats] = useState({ totalRestaurants: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        const [restaurants, pending] = await Promise.all([
          db.listDocuments(DB_ID, "restaurants"),
          db.listDocuments(DB_ID, "restaurant_request"),
        ]);

        if (!isMounted) return;

        setStats({
          totalRestaurants:
            restaurants.total ?? restaurants.documents?.length ?? 0,
          pending: pending.total ?? pending.documents?.length ?? 0,
        });
        setError(null);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
        if (isMounted) {
          setError(
            "We could not load the latest stats. Please refresh to try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const approvals = Math.max(stats.totalRestaurants - stats.pending, 0);
  const approvalRate = stats.totalRestaurants
    ? Math.round((approvals / stats.totalRestaurants) * 100)
    : 0;

  const quickActions = [
    { to: "/pending", label: "Review pending requests", variant: "primary" },
    { to: "/submissions", label: "User submissions", variant: "secondary" },
    {
      to: "/manage-restaurants",
      label: "Manage live restaurants",
      variant: "ghost",
    },
  ];

  const formatValue = (value, suffix = "") =>
    loading ? "--" : `${value}${suffix}`;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Admin Dashboard</h1>
          <p className="page-description">
            Track the health of the marketplace and keep partner onboarding on
            schedule.
          </p>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}

      <div className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Total restaurants</p>
          <p className="stat-value">{formatValue(stats.totalRestaurants)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Pending approvals</p>
          <p className="stat-value">{formatValue(stats.pending)}</p>
          <p className="stat-trend">
            {loading
              ? "Loading..."
              : stats.pending > 10
              ? "Queue is getting long"
              : "Queue is healthy"}
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Approval rate</p>
          <p className="stat-value">
            {loading ? "--" : `${Math.min(100, Math.max(0, approvalRate))}%`}
          </p>
          <p className="stat-trend">vs pending backlog</p>
        </article>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Quick actions</h2>
            <p className="panel-description">
              Jump straight to the workflows you run most.
            </p>
          </div>
        </div>
        <div className="panel-body quick-actions">
          {quickActions.map(({ to, label, variant }) => (
            <Link key={to} to={to} className={`btn btn-${variant}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Operational health</h2>
            <p className="panel-description">
              Keep the pending queue manageable to launch partners quickly.
            </p>
          </div>
          {stats.pending > 0 && !loading && <span className="tag">Action needed</span>}
        </div>
        <div className="panel-body data-list">
          <div className="data-list-row">
            <div>
              <p className="data-list-row-title">Pending requests</p>
              <p className="data-list-row-subtitle">
                Aim for fewer than 10 at any point in the day.
              </p>
            </div>
            <span className="data-list-row-value">
              {formatValue(stats.pending)}
            </span>
          </div>
          <div className="data-list-row">
            <div>
              <p className="data-list-row-title">Live restaurants</p>
              <p className="data-list-row-subtitle">
                Total partners currently visible in the app.
              </p>
            </div>
            <span className="data-list-row-value">
              {formatValue(stats.totalRestaurants)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
