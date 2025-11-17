import React, { useCallback, useEffect, useMemo, useState } from "react";
import { callAdminApi, fetchAdminData, ADMIN_API_READY } from "../lib/adminApi";

const formatLocation = (doc) => {
  if (doc.location) return doc.location;
  if (doc.displayLocation) return doc.displayLocation;
  const parts = [doc.address, doc.city, doc.state, doc.postcode];
  return parts.filter(Boolean).join(", ") || "Location unavailable";
};

const formatList = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
};

const formatMapValue = (doc) => {
  if (typeof doc.map === "string" && doc.map.length > 0) return doc.map;
  if (doc.map?.coordinates && Array.isArray(doc.map.coordinates)) {
    const [lon, lat] = doc.map.coordinates;
    if (lon != null && lat != null) return `[${lon}, ${lat}]`;
  }
  return "";
};

const formatCuisines = (doc) => formatList(doc.cuisines || doc.cuisine);

const sanitizeUrl = (url) => {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

export default function ManageRestaurants() {
  const [live, setLive] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

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
      const haystack = [item.name, formatCuisines(item), formatLocation(item)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [live, search]);

  const isExpanded = (doc, scope) =>
    expandedRow?.id === doc.$id && expandedRow?.scope === scope;

  const toggleDetails = (doc, scope) => {
    if (isExpanded(doc, scope)) {
      setExpandedRow(null);
    } else {
      setExpandedRow({ id: doc.$id, scope });
    }
  };

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

  const renderDetailPanel = (doc, scope) => {
    const isLive = scope === "live";
    const detailSpecs = [
      { label: "Cuisines", value: formatCuisines(doc) },
      { label: "Theme", value: doc.theme },
      { label: "Ambience", value: formatList(doc.ambience) },
      { label: "Registration no.", value: doc.registrationNo },
      { label: "Owner ID", value: doc.ownerId },
      { label: "Phone", value: doc.phone },
      { label: "Email", value: doc.email },
      { label: "Address", value: doc.address },
      { label: "Location", value: formatLocation(doc) },
      { label: "Map coordinates", value: formatMapValue(doc) },
      {
        label: "Website",
        value: doc.website,
        render: (value) =>
          value ? (
            <a href={sanitizeUrl(value)} target="_blank" rel="noreferrer">
              {value}
            </a>
          ) : null,
      },
      {
        label: "Added",
        value: doc.$createdAt,
        render: (value) => (value ? new Date(value).toLocaleString() : null),
      },
    ];

    return (
      <div className="detail-panel">
        <div className="detail-panel-header">
          <div>
            <p className="eyebrow">{isLive ? "Restaurant profile" : "Lead details"}</p>
            <h3>{doc.name || "Unnamed partner"}</h3>
            <p className="detail-panel-subtitle">{formatLocation(doc)}</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => toggleDetails(doc, scope)}>
            Close
          </button>
        </div>
        <div className="detail-panel-grid">
          {detailSpecs.map((spec) => (
            <div className="detail-item" key={`${doc.$id}-${spec.label}`}>
              <span className="detail-label">{spec.label}</span>
              <div className="detail-value">
                {spec.render
                  ? spec.render(spec.value, doc) ?? <span className="detail-empty">Not provided</span>
                  : spec.value
                  ? <span>{spec.value}</span>
                  : <span className="detail-empty">Not provided</span>}
              </div>
            </div>
          ))}
        </div>
        {isLive && (
          <div className="detail-panel-actions">
            {doc.website && (
              <a
                className="btn btn-ghost"
                href={sanitizeUrl(doc.website)}
                target="_blank"
                rel="noreferrer"
              >
                Visit website
              </a>
            )}
            <button
              className="btn btn-danger"
              onClick={() => handleRemove(doc)}
              disabled={processing === doc.$id}
            >
              {processing === doc.$id ? "Removing..." : "Remove restaurant"}
            </button>
          </div>
        )}
      </div>
    );
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
            placeholder="Name, cuisines, city"
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
          {filteredLive.map((restaurant) => {
            const expanded = isExpanded(restaurant, "live");
            return (
              <React.Fragment key={restaurant.$id}>
                <article className="list-card">
                  <div className="list-card-content">
                    <div className="list-card-header">
                      <h3>{restaurant.name}</h3>
                      <span className="status-pill status-pill--success">Live</span>
                    </div>
                    <p>{formatCuisines(restaurant) || "Cuisines missing"}</p>
                    <div className="list-meta">
                      <span>{formatLocation(restaurant)}</span>
                      <span>
                        Added{" "}
                        {restaurant.$createdAt
                          ? new Date(restaurant.$createdAt).toLocaleDateString()
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="list-card-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => toggleDetails(restaurant, "live")}
                    >
                      {expanded ? "Hide details" : "View details"}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemove(restaurant)}
                      disabled={processing === restaurant.$id}
                    >
                      {processing === restaurant.$id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </article>
                {expanded && renderDetailPanel(restaurant, "live")}
              </React.Fragment>
            );
          })}
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
          {pending.map((sub) => {
            const expanded = isExpanded(sub, "lead");
            return (
              <React.Fragment key={sub.$id}>
                <article className="list-card">
                  <div className="list-card-content">
                    <div className="list-card-header">
                      <h3>{sub.name}</h3>
                      <span className="status-pill status-pill--info">Awaiting docs</span>
                    </div>
                    <p>{formatCuisines(sub) || "Cuisines unknown"}</p>
                    <div className="list-meta">
                      <span>{formatLocation(sub)}</span>
                      <span>
                        Contacted{" "}
                        {sub.$updatedAt
                          ? new Date(sub.$updatedAt).toLocaleDateString()
                          : sub.$createdAt
                          ? new Date(sub.$createdAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                  </div>
                  <div className="list-card-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => toggleDetails(sub, "lead")}
                    >
                      {expanded ? "Hide details" : "View details"}
                    </button>
                  </div>
                </article>
                {expanded && renderDetailPanel(sub, "lead")}
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </div>
  );
}
