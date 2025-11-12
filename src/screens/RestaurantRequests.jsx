import React, { useCallback, useEffect, useMemo, useState } from "react";
import { callAdminApi, fetchAdminData, ADMIN_API_READY } from "../lib/adminApi";

const formatLocation = (req) => {
  const parts = [req.city, req.state];
  return parts.filter(Boolean).join(", ") || "Location unavailable";
};

export default function RestaurantRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [processing, setProcessing] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!ADMIN_API_READY) {
      setError(
        "Admin API base URL is missing. Add VITE_ADMIN_API_BASE_URL to your .env and restart the dev server."
      );
      setLoading(false);
      return;
    }
    try {
      const res = await fetchAdminData("/restaurant-requests");
      setRequests(res.documents || []);
    } catch (err) {
      console.error("Failed to load restaurant requests", err);
      setError("Could not load requests. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const cities = useMemo(() => {
    const set = new Set();
    requests.forEach((req) => { if (req.city) set.add(req.city); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const text = search.trim().toLowerCase();
    return requests.filter((req) => {
      const matchesCity = cityFilter === "all" || (req.city || "").toLowerCase() === cityFilter;
      if (!text) return matchesCity;
      const haystack = [
        req.businessName,
        req.city,
        req.state,
        req.cuisine,
        req.registrationNo
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesCity && haystack.includes(text);
    });
  }, [requests, search, cityFilter]);

  const callBackend = async (type, req, path, extraData) => {
    setProcessing({ id: req.$id, type });
    setBanner(null);
    setError(null);

    if (!ADMIN_API_READY) {
      setError(
        "Admin API base URL is missing. Add VITE_ADMIN_API_BASE_URL to your .env and restart the dev server."
      );
      setProcessing(null);
      return;
    }

    try {
      const data = await callAdminApi(path, { documentId: req.$id, ...extraData });
      setBanner(data.message || "Request updated.");
      loadRequests();
    } catch (err) {
      console.error(`Failed to ${type} request`, err);
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleApprove = (req) =>
    callBackend("approve", req, "/approve-restaurant-request");

  const handleReject = (req) => {
    const reason = window.prompt("Reason for rejection?");
    if (!reason) return;
    callBackend("reject", req, "/reject-restaurant-request", { reason });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Owner onboarding</p>
          <h1>Restaurant requests</h1>
          <p className="page-description">
            Work through the queue, check compliance data, and launch qualified partners quickly.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={loadRequests} disabled={loading}>
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
            type="search"
            className="field-input"
            placeholder="Name, cuisine, registration no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="field-control">
          <span className="field-label">City</span>
          <select
            className="field-input"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="all">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city.toLowerCase()}>{city}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Pending restaurants</h2>
            <p className="panel-description">{filteredRequests.length} of {requests.length} requests shown</p>
          </div>
        </div>
        <div className="panel-body">
          {loading && <p className="loading-indicator">Loading requests...</p>}
          {!loading && filteredRequests.length === 0 && (
            <div className="empty-state">
              <strong>No requests match your filters</strong>
              Clear filters or check back later for new submissions.
            </div>
          )}
          {filteredRequests.map((req) => {
            const isProcessing = processing?.id === req.$id;
            const approving = isProcessing && processing?.type === "approve";
            const rejecting = isProcessing && processing?.type === "reject";

            return (
              <article key={req.$id} className="list-card">
                <div className="list-card-content">
                  <div className="list-card-header">
                    <h3>{req.businessName}</h3>
                    <span className="status-pill status-pill--pending">Pending review</span>
                  </div>
                  <p>{req.cuisine || "Cuisine unavailable"}</p>
                  <div className="list-meta">
                    <span>{formatLocation(req)}</span>
                    <span>Contact {req.phone}</span>
                    <span>{req.email}</span>
                  </div>
                  {req.note && <p className="list-note">Note: {req.note}</p>}
                </div>
                <div className="list-card-actions">
                  {req.website && (
                    <a className="btn btn-ghost" href={req.website} target="_blank" rel="noreferrer">View site</a>
                  )}
                  <button className="btn btn-primary" onClick={() => handleApprove(req)} disabled={isProcessing}>
                    {approving ? "Approving..." : "Approve"}
                  </button>
                  <button className="btn btn-danger" onClick={() => handleReject(req)} disabled={isProcessing}>
                    {rejecting ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
