import React, { useCallback, useEffect, useMemo, useState } from "react";
import { callAdminApi, fetchAdminData, ADMIN_API_READY } from "../lib/adminApi";

const buildLocationString = (entry) =>
  entry.location || [entry.address, entry.city, entry.state, entry.postcode].filter(Boolean).join(", ");

const formatCuisines = (entry) => {
  if (Array.isArray(entry.cuisines)) return entry.cuisines.join(", ");
  return entry.cuisines || entry.cuisine || "";
};
const formatLocation = (entry) => buildLocationString(entry) || "Location unavailable";

const formatMapValue = (entry) => {
  if (typeof entry.map === "string" && entry.map.length > 0) {
    return entry.map;
  }
  if (entry.map?.coordinates && Array.isArray(entry.map.coordinates)) {
    const [lon, lat] = entry.map.coordinates;
    if (lon != null && lat != null) return `[${lon}, ${lat}]`;
  }
  return "";
};

const EMPTY_FORM = {
  name: "",
  registrationNo: "",
  cuisines: "",
  theme: "",
  ambience: "",
  location: "",
  city: "",
  state: "",
  postcode: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  map: "",
  note: "",
  ownerId: "",
};

const filterByQuery = (items, query, cuisineFilter) => {
  const term = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCuisine =
      cuisineFilter === "all" || formatCuisines(item).toLowerCase() === cuisineFilter;
    if (!term) return matchesCuisine;
    const haystack = [
      item.name,
      item.location,
      item.city,
      item.state,
      formatCuisines(item),
      item.theme,
      item.ambience,
      item.email,
    ]
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

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const loadSubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!ADMIN_API_READY) {
      setError("Missing API base URL. Check your .env file.");
      setLoading(false);
      return;
    }

    try {
      const data = await fetchAdminData("/user-submissions");
      setPendingSubs(data.pending || []);
      setContactedSubs(data.contacted || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load submissions. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  const cuisineOptions = useMemo(() => {
    const set = new Set();
    [...pendingSubs, ...contactedSubs].forEach((sub) => {
      const value = formatCuisines(sub);
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pendingSubs, contactedSubs]);

  const visiblePending = useMemo(
    () => filterByQuery(pendingSubs, search, cuisineFilter),
    [pendingSubs, search, cuisineFilter]
  );

  const visibleContacted = useMemo(
    () => filterByQuery(contactedSubs, search, cuisineFilter),
    [contactedSubs, search, cuisineFilter]
  );

  const callBackend = async (action, sub, path, extraData = {}) => {
    setProcessing({ id: sub.$id, type: action });
    setError(null);
    setBanner(null);

    try {
      const data = await callAdminApi(path, { documentId: sub.$id, ...extraData });
      setBanner(data.message || "Updated successfully.");
      loadSubs();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleContactOwner = (sub) =>
    callBackend("contact", sub, "/contact-user-submission");

  const handleReject = (sub) => {
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;
    callBackend("reject", sub, "/reject-user-submission", { reason });
  };

  const handleApproveToggle = (sub) => {
    if (selectedSubmission?.$id === sub.$id) {
      setSelectedSubmission(null);
      setFormData({ ...EMPTY_FORM });
      return;
    }

    setSelectedSubmission(sub);
    setFormData({
      name: sub.name || "",
      registrationNo: sub.registrationNo || "",
      cuisines: formatCuisines(sub),
      theme: sub.theme || "",
      ambience: sub.ambience || "",
      location: "",
      city: sub.city || "",
      state: sub.state || "",
      postcode: sub.postcode || "",
      address: sub.address || "",
      phone: sub.phone || "",
      email: sub.email || "",
      website: sub.website || "",
      map: formatMapValue(sub),
      note: sub.note || "",
      ownerId: "",
    });
  };

  const handleConfirmApprove = async () => {
    if (!selectedSubmission) return;
    const base = (import.meta.env.VITE_ADMIN_API_BASE_URL || "").trim().replace(/\/$/, "");
    if (!base) {
      setError("Missing admin API base URL.");
      return;
    }

    try {
      setProcessing({ id: selectedSubmission.$id, type: "approve" });
      setBanner(null);
      const { note: _note, map: _map, ...approvalOverrides } = formData;
      const mapValue = (formData.map || "").trim();
      if (!mapValue) {
        setError("Map coordinates are required.");
        setProcessing(null);
        return;
      }
      approvalOverrides.map = mapValue;
      const response = await fetch(`${base}/approve-user-submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedSubmission.$id,
          overrides: approvalOverrides,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Approval failed.");

      setBanner(result.message || `${formData.name} approved and added.`);
      setSelectedSubmission(null);
      setFormData({ ...EMPTY_FORM });
      loadSubs();
    } catch (err) {
      console.error(err);
      setError(err.message || "Approval failed.");
    } finally {
      setProcessing(null);
    }
  };

  const renderSubmission = (sub, canContact) => {
    const isProcessing = processing?.id === sub.$id;
    const isContacting = isProcessing && processing?.type === "contact";
    const isRejecting = isProcessing && processing?.type === "reject";
    const isApproving = isProcessing && processing?.type === "approve";
    const isSelected = selectedSubmission?.$id === sub.$id;

    return (
      <React.Fragment key={sub.$id}>
        <article className="list-card">
          <div className="list-card-content">
            <div className="list-card-header">
              <h3>{sub.name || "Unnamed Restaurant"}</h3>
              <span
                className={`status-pill ${
                  canContact ? "status-pill--pending" : "status-pill--info"
                }`}
              >
                {canContact ? "Pending outreach" : "Contacted"}
              </span>
            </div>
            <p>{formatCuisines(sub) || "Cuisines unknown"}</p>
            <div className="list-meta">
              <span>{formatLocation(sub)}</span>
              <span>Added {new Date(sub.$createdAt).toLocaleDateString()}</span>
            </div>
            {sub.note && <p className="list-note">Note: {sub.note}</p>}
          </div>

          <div className="list-card-actions">
            {canContact ? (
              <button
                className="btn btn-secondary"
                onClick={() => handleContactOwner(sub)}
                disabled={isProcessing}
              >
                {isContacting ? "Updating..." : "Contact"}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleApproveToggle(sub)}
                disabled={isProcessing}
              >
                {isSelected ? (isApproving ? "Approving..." : "Close") : "Approve"}
              </button>
            )}
            <button
              className="btn btn-danger"
              onClick={() => handleReject(sub)}
              disabled={isProcessing}
            >
              {isRejecting ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </article>

        {isSelected && (
          <div className="approve-panel">
            <div className="approve-panel-header">
              <div>
                <p className="eyebrow">Quick approve</p>
                <h3>Finalize {formData.name || sub.name}</h3>
              </div>
              <button className="btn btn-ghost" type="button" onClick={() => handleApproveToggle(sub)}>
                Close
              </button>
            </div>
            <form
              className="approve-panel-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleConfirmApprove();
              }}
            >
              <label>
                <span>Business name *</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </label>
              <div className="approve-panel-grid">
                <label>
                  <span>Registration number</span>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) =>
                    setFormData({ ...formData, registrationNo: e.target.value })
                  }
                />
                </label>
                <label>
                  <span>Cuisines</span>
                <input
                  type="text"
                  value={formData.cuisines}
                  onChange={(e) => setFormData({ ...formData, cuisines: e.target.value })}
                />
                </label>
                <label>
                  <span>Theme</span>
                <input
                  type="text"
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                />
                </label>
                <label>
                  <span>Ambience</span>
                <input
                  type="text"
                  value={formData.ambience}
                  onChange={(e) => setFormData({ ...formData, ambience: e.target.value })}
                />
                </label>
              </div>
              <label>
                <span>Location shown to diners *</span>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Brisbane Southbank"
                  required
                />
              </label>
              <div className="approve-panel-grid">
                <label>
                  <span>City</span>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                </label>
                <label>
                  <span>State</span>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                </label>
                <label>
                  <span>Postcode</span>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                />
                </label>
              </div>
              <label>
                <span>Address</span>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </label>
              <div className="approve-panel-grid">
                <label>
                  <span>Phone</span>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                </label>
                <label>
                  <span>Email</span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                </label>
                <label>
                  <span>Website</span>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
                </label>
              </div>
              <label>
                <span>Map coordinates *</span>
                <input
                  type="text"
                  value={formData.map}
                  onChange={(e) => setFormData({ ...formData, map: e.target.value })}
                  placeholder="[longitude, latitude]"
                  required
                />
              </label>
              <label>
                <span>Internal note</span>
                <textarea
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </label>
              <label>
                <span>Owner ID</span>
                <input
                  type="text"
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={isApproving}>
                  {isApproving ? "Approving..." : "Confirm approve"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => handleApproveToggle(sub)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow">Community leads</p>
            <h1>User submissions</h1>
            <p className="page-description">
              Compare community tips, keep outreach organized, and add worthy restaurants in minutes.
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
              placeholder="Name, cuisines, city, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="field-control">
            <span className="field-label">Cuisines</span>
            <select
              className="field-input"
              value={cuisineFilter}
              onChange={(e) => setCuisineFilter(e.target.value)}
            >
              <option value="all">All cuisines</option>
              {cuisineOptions.map((option) => (
                <option key={option} value={option.toLowerCase()}>
                  {option}
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
                {visiblePending.length} of {pendingSubs.length} leads awaiting outreach
              </p>
            </div>
          </div>
          <div className="panel-body">
            {loading && <p className="loading-indicator">Loading submissions...</p>}
            {!loading && visiblePending.length === 0 && (
              <div className="empty-state">
                <strong>No pending leads match your filters</strong>
                Adjust search or check back later.
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
                {visibleContacted.length} of {contactedSubs.length} ready for approval
              </p>
            </div>
          </div>
          <div className="panel-body">
            {loading && contactedSubs.length === 0 && (
              <p className="loading-indicator">Loading contacted submissions...</p>
            )}
            {!loading && visibleContacted.length === 0 && (
              <div className="empty-state">
                <strong>No contacted leads yet</strong>
                Mark a submission as contacted once you've spoken with them.
              </div>
            )}
            {visibleContacted.map((sub) => renderSubmission(sub, false))}
          </div>
        </section>
      </div>
    </>
  );
}
