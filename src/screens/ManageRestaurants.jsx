import React, { useCallback, useEffect, useMemo, useState } from "react";
import { callAdminApi, fetchAdminData, ADMIN_API_READY } from "../lib/adminApi";

const formatLocation = (doc) => {
  if (doc.location) return doc.location;
  const parts = [doc.address, doc.city, doc.state];
  return parts.filter(Boolean).join(", ") || "Location unavailable";
};

export default function ManageRestaurants() {
  const [live, setLive] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(null);

  const loadData = useCallback(async () => {
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
      const data = await fetchAdminData("/manage-restaurants");
      setLive(data.live || []);
      setPending(data.contacted || []);
    } catch (err) {
      console.error("Failed to load restaurants", err);
      setError("Unable to fetch restaurants. Try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLive = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return live;
    return live.filter((item) => {
      const haystack = [item.name, item.cuisine, formatLocation(item)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [live, search]);

  const handleRemove = async (restaurant) => {
    const reason = window.prompt("Reason for removal?");
    if (!reason) return;
    setProcessing(restaurant.$id);
    setBanner(null);
    setError(null);
    try {
      await callAdminApi("/remove-restaurant", {
        documentId: restaurant.$id,
        reason,
      });
      setBanner(`${restaurant.name} removed from the catalog.`);
      loadData();
    } catch (err) {
      console.error("Failed to remove restaurant", err);
      setError("Removal failed. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Manage restaurants</h1>
          <p className="page-description">
            Quickly search, audit, or remove restaurants. Keep the list tidy so diners always have a
            great experience.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {banner && <div className="inline-alert inline-alert--success">{banner}</div>}
      {error && <div className="inline-alert inline-alert--error">{error}</div>}

      <div className="filter-row">
        <label className="field-control">
          <span className="field-label">Search</span>
          <input
            className="field-input"
            type="search"
            placeholder="Name, cuisine, city"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Live restaurants</h2>
            <p className="panel-description">
              {filteredLive.length} of {live.length} partners visible
            </p>
          </div>
        </div>
        <div className="panel-body">
          {loading && <p className="loading-indicator">Loading live restaurants...</p>}
          {!loading && filteredLive.length === 0 && (
            <div className="empty-state">
              <strong>No restaurants match your search</strong>
              Try a different keyword or clear the search box.
            </div>
          )}
          {filteredLive.map((restaurant) => (
            <article key={restaurant.$id} className="list-card">
              <div className="list-card-content">
                <div className="list-card-header">
                  <h3>{restaurant.name}</h3>
                  <span className="status-pill status-pill--success">Live</span>
                </div>
                <p>{restaurant.cuisine || "Cuisine missing"}</p>
                <div className="list-meta">
                  <span>{formatLocation(restaurant)}</span>
                  {restaurant.contact && <span>{restaurant.contact}</span>}
                </div>
              </div>
              <div className="list-card-actions">
                <button
                  className="btn btn-danger"
                  onClick={() => handleRemove(restaurant)}
                  disabled={processing === restaurant.$id}
                >
                  {processing === restaurant.$id ? "Removing..." : "Remove"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Contacted submissions</h2>
            <p className="panel-description">
              Leads awaiting final approval once paperwork is complete.
            </p>
          </div>
        </div>
        <div className="panel-body">
          {!loading && pending.length === 0 && (
            <div className="empty-state">
              <strong>No contacted submissions</strong>
              Move user submissions here after outreach so you can activate them later.
            </div>
          )}
          {pending.map((sub) => (
            <article key={sub.$id} className="list-card">
              <div className="list-card-content">
                <div className="list-card-header">
                  <h3>{sub.name}</h3>
                  <span className="status-pill status-pill--info">Awaiting docs</span>
                </div>
                <p>{sub.cuisine || "Cuisine unknown"}</p>
                <div className="list-meta">
                  <span>{sub.location || "Location unavailable"}</span>
                  {sub.contact && <span>{sub.contact}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
