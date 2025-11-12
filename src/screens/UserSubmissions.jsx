import React, { useCallback, useEffect, useMemo, useState } from "react";
import { callAdminApi, fetchAdminData, ADMIN_API_READY } from "../lib/adminApi";

const filterByQuery = (items, query, cuisine) => {
  const term = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCuisine = cuisine === "all" || (item.cuisine || "").toLowerCase() === cuisine;
    if (!term) return matchesCuisine;
    const haystack = [item.name, item.location, item.cuisine, item.contact]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesCuisine && haystack.includes(term);
  });
};

export default function UserSubmissions() {
  const [pendingSubs, setPendingSubs] = useState([]);
  const [contactedSubs, setContactedSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [processing, setProcessing] = useState(null);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!ADMIN_API_READY) {
      setError(
        "Admin API base URL missing. Set VITE_ADMIN_API_BASE_URL in your .env file and restart the dev server."
      );
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAdminData("/user-submissions");
      setPendingSubs(data.pending || []);
      setContactedSubs(data.contacted || []);
    } catch (err) {
      console.error("Failed to load submissions", err);
      setError("Unable to fetch user submissions. Try reloading.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  const cuisines = useMemo(() => {
    const set = new Set();
    [...pendingSubs, ...contactedSubs].forEach((sub) => {
      if (sub.cuisine) set.add(sub.cuisine);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pendingSubs, contactedSubs]);

  const visiblePending = useMemo(() => filterByQuery(pendingSubs, search, cuisineFilter), [
    pendingSubs,
    search,
    cuisineFilter,
  ]);
  const visibleContacted = useMemo(
    () => filterByQuery(contactedSubs, search, cuisineFilter),
    [contactedSubs, search, cuisineFilter]
  );

  const callBackend = async (action, sub, path, extraData) => {
    setProcessing({ id: sub.$id, type: action });
    setBanner(null);
    setError(null);

    if (!ADMIN_API_READY) {
      setError(
        "Admin API base URL missing. Set VITE_ADMIN_API_BASE_URL in your .env file and restart the dev server."
      );
      setProcessing(null);
      return;
    }

    try {
      const data = await callAdminApi(path, { documentId: sub.$id, ...extraData });
      setBanner(data.message || "Submission updated.");
      loadSubs();
    } catch (err) {
      console.error(`Failed to ${action} submission`, err);
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleContactOwner = (sub) =>
    callBackend("contact", sub, "/contact-user-submission");
  const handleApprove = (sub) =>
    callBackend("approve", sub, "/approve-user-submission");
  const handleReject = (sub) => {
    const reason = window.prompt("Enter rejection reason");
    if (!reason) return;
    callBackend("reject", sub, "/reject-user-submission", { reason });
  };

  const renderSubmission = (sub, canContact = false) => {
    const isProcessing = processing?.id === sub.$id;
    const isContacting = isProcessing && processing?.type === "contact";
    const isApproving = isProcessing && processing?.type === "approve";
    const isRejecting = isProcessing && processing?.type === "reject";

    return (
      <article key={sub.$id} className="list-card">
        <div className="list-card-content">
          <div className="list-card-header">
            <h3>{sub.name}</h3>
            <span
              className={`status-pill ${
                canContact ? "status-pill--pending" : "status-pill--info"
              }`}
            >
              {canContact ? "Pending outreach" : "Contacted"}
            </span>
          </div>
          <p>{sub.cuisine || "Cuisine unknown"}</p>
          <div className="list-meta">
            <span>{sub.location || "Location unavailable"}</span>
            {sub.contact && <span>{sub.contact}</span>}
            <span>Added {new Date(sub.$createdAt).toLocaleDateString()}</span>
          </div>
          {sub.note && <p className="list-note">User note: {sub.note}</p>}
        </div>
        <div className="list-card-actions">
          {canContact && (
            <button
              className="btn btn-secondary"
              onClick={() => handleContactOwner(sub)}
              disabled={isProcessing}
            >
              {isContacting ? "Updating..." : "Contact owner"}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => handleApprove(sub)}
            disabled={isProcessing}
          >
            {isApproving ? "Approving..." : "Approve"}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => handleReject(sub)}
            disabled={isProcessing}
          >
            {isRejecting ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Community leads</p>
          <h1>User submissions</h1>
          <p className="page-description">
            Each submission is a high-intent suggestion from diners. Contact them, capture more context, and
            graduate the best into the live catalog.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={loadSubs} disabled={loading}>
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
            placeholder="Restaurant, city, contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="field-control">
          <span className="field-label">Cuisine</span>
          <select
            className="field-input"
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
          >
            <option value="all">All cuisines</option>
            {cuisines.map((cuisine) => (
              <option key={cuisine} value={cuisine.toLowerCase()}>
                {cuisine}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Pending submissions</h2>
            <p className="panel-description">
              {visiblePending.length} of {pendingSubs.length} leads awaiting first touch
            </p>
          </div>
        </div>
        <div className="panel-body">
          {loading && <p className="loading-indicator">Loading submissions...</p>}
          {!loading && visiblePending.length === 0 && (
            <div className="empty-state">
              <strong>No pending submissions found</strong>
              Community leads will show up here as soon as they come in.
            </div>
          )}
          {visiblePending.map((sub) => renderSubmission(sub, true))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Contacted leads</h2>
            <p className="panel-description">
              Keep an eye on who is ready to be approved once paperwork lands.
            </p>
          </div>
        </div>
        <div className="panel-body">
          {!loading && visibleContacted.length === 0 && (
            <div className="empty-state">
              <strong>No contacted leads yet</strong>
              Move submissions into this view once you have reached out.
            </div>
          )}
          {visibleContacted.map((sub) => renderSubmission(sub, false))}
        </div>
      </section>
    </div>
  );
}
