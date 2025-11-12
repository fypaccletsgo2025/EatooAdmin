import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminData, ADMIN_API_READY } from "../lib/adminApi";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "Unknown";

const formatLocation = (doc) => {
  const city = doc.city || doc.location;
  const state = doc.state;
  return [city, state].filter(Boolean).join(", ") || "Location unavailable";
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    pendingOwner: 0,
    pendingUser: 0,
    contacted: 0,
  });
  const [recentRestaurants, setRecentRestaurants] = useState([]);
  const [ownerQueue, setOwnerQueue] = useState([]);
  const [userQueue, setUserQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!ADMIN_API_READY) {
      setError(
        "Admin API base URL missing. Set VITE_ADMIN_API_BASE_URL in .env and restart the dev server."
      );
      setLoading(false);
      return;
    }

    try {
      const data = await fetchAdminData("/dashboard-metrics");
      const statsPayload = data.stats || {};
      setStats({
        totalRestaurants: statsPayload.totalRestaurants ?? 0,
        pendingOwner: statsPayload.pendingOwner ?? 0,
        pendingUser: statsPayload.pendingUser ?? 0,
        contacted: statsPayload.contacted ?? 0,
      });
      setRecentRestaurants(data.recentRestaurants || []);
      setOwnerQueue(data.ownerQueue || []);
      setUserQueue(data.userQueue || []);
    } catch (err) {
      console.error("Failed to load dashboard", err);
      setError(err.message || "Could not fetch metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Command center</p>
          <h1>Eatoo Admin Dashboard</h1>
          <p className="page-description">
            Track the health of the onboarding pipeline, clear pending queues, and keep partner
            restaurants up-to-date.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
          <Link className="btn btn-primary" to="/restaurant-requests">
            Review owner queue
          </Link>
        </div>
      </div>

      {error && <div className="inline-alert inline-alert--error">{error}</div>}

      <div className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Live restaurants</p>
          <p className="stat-value">{stats.totalRestaurants}</p>
          <p className="stat-trend">Growing catalog</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Owner approvals pending</p>
          <p className="stat-value">{stats.pendingOwner}</p>
          <p className="stat-trend">Triage to keep SLAs</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">User submissions pending</p>
          <p className="stat-value">{stats.pendingUser}</p>
          <p className="stat-trend">High-signal leads</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Contacted leads</p>
          <p className="stat-value">{stats.contacted}</p>
          <p className="stat-trend">Ready for activation</p>
        </article>
      </div>

      {loading && <p className="loading-indicator">Syncing latest numbers...</p>}

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Recent owner requests</h2>
              <p className="panel-description">Clear this queue to move restaurants into the live catalog.</p>
            </div>
            <Link className="btn btn-secondary" to="/restaurant-requests">Go to requests</Link>
          </div>
          <div className="panel-body">
            {ownerQueue.length === 0 && (
              <div className="empty-state">
                <strong>No owner requests pending</strong>
                Great job! New submissions will appear here automatically.
              </div>
            )}
            {ownerQueue.map((req) => (
              <article key={req.$id} className="list-card">
                <div className="list-card-content">
                  <h3>{req.businessName}</h3>
                  <p>{req.cuisine || "Cuisine unavailable"}</p>
                  <div className="list-meta">
                    <span>{formatLocation(req)}</span>
                    <span>Submitted {formatDate(req.$createdAt)}</span>
                    <span>Reg #{req.registrationNo}</span>
                  </div>
                </div>
                <div className="list-card-actions">
                  <a className="btn btn-ghost" href={`mailto:${req.email}`}>Email owner</a>
                  <Link className="btn btn-primary" to="/restaurant-requests">Review</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Recent user submissions</h2>
              <p className="panel-description">Tap into community picks. Contact and convert them inside submissions.</p>
            </div>
            <Link className="btn btn-secondary" to="/user-submissions">View submissions</Link>
          </div>
          <div className="panel-body">
            {userQueue.length === 0 && (
              <div className="empty-state">
                <strong>No pending user submissions</strong>
                Things look quiet. Ask the community for their favorite spots.
              </div>
            )}
            {userQueue.map((sub) => (
              <article key={sub.$id} className="list-card">
                <div className="list-card-content">
                  <h3>{sub.name}</h3>
                  <p>{sub.cuisine || "Cuisine unspecified"}</p>
                  <div className="list-meta">
                    <span>{sub.location || "Location unknown"}</span>
                    <span>Submitted {formatDate(sub.$createdAt)}</span>
                  </div>
                </div>
                <div className="list-card-actions">
                  {sub.contact && <a className="btn btn-ghost" href={`mailto:${sub.contact}`}>Contact</a>}
                  <Link className="btn btn-primary" to="/user-submissions">Prioritize</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Newly live restaurants</h2>
            <p className="panel-description">Recently approved partners appear here for a quick quality check.</p>
          </div>
          <Link className="btn btn-secondary" to="/manage-restaurants">Manage catalog</Link>
        </div>
        <div className="panel-body">
          {recentRestaurants.length === 0 && (
            <div className="empty-state">
              <strong>No restaurants yet</strong>
              Approve requests to start building your supply.
            </div>
          )}
          {recentRestaurants.map((restaurant) => (
            <div key={restaurant.$id} className="data-list-row">
              <div>
                <p className="data-list-row-title">{restaurant.name}</p>
                <p className="data-list-row-subtitle">{formatLocation(restaurant)} • {restaurant.cuisine || "Cuisine pending"}</p>
              </div>
              <p className="data-list-row-value">{formatDate(restaurant.$createdAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
