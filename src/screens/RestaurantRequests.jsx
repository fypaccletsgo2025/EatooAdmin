import React, { useCallback, useEffect, useMemo, useState } from "react";
import { callAdminApi, fetchAdminData, ADMIN_API_READY } from "../lib/adminApi";

const formatLocation = (req) => {
  const parts = [req.city, req.state];
  return parts.filter(Boolean).join(", ") || "Location unavailable";
};

const EMPTY_FORM = {
  name: "",
  businessName: "",
  registrationNo: "",
  cuisine: "",
  city: "",
  state: "",
  postcode: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  note: "",
  ownerId: "",
};

export default function RestaurantRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [processing, setProcessing] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

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
      throw err;
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (req) => {
    const reason = window.prompt("Reason for rejection?");
    if (!reason) return;
    callBackend("reject", req, "/reject-restaurant-request", { reason }).catch(() => {
      /* errors handled in callBackend */
    });
  };

  const resetModal = () => {
    setShowApproveModal(false);
    setSelectedRequest(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    const base = (import.meta.env.VITE_ADMIN_API_BASE_URL || "").trim().replace(/\/$/, "");
    if (!base) {
      setError("Admin API base URL is missing. Update VITE_ADMIN_API_BASE_URL and restart the dev server.");
      return;
    }

    try {
      setProcessing({ id: selectedRequest.$id, type: "approve" });
      setBanner(null);
      setError(null);

      const response = await fetch(`${base}/approve-restaurant-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedRequest.$id,
          overrides: formData,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok === false) {
        throw new Error(result?.message || "Approval failed.");
      }

      setBanner(result.message || `${formData.name} approved and moved to live restaurants.`);
      loadRequests();
      resetModal();
    } catch (err) {
      console.error(err);
      setError(err.message || "Approval failed.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <>
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
                <option key={city} value={city.toLowerCase()}>
                  {city}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pending restaurants</h2>
              <p className="panel-description">
                {filteredRequests.length} of {requests.length} requests shown
              </p>
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
            const isSelected = showApproveModal && selectedRequest?.$id === req.$id;

            return (
              <React.Fragment key={req.$id}>
                <article className="list-card">
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
                      <a className="btn btn-ghost" href={req.website} target="_blank" rel="noreferrer">
                        View site
                      </a>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (isSelected) {
                          resetModal();
                          return;
                        }
                        setSelectedRequest(req);
                        setFormData({
                          name: req.businessName || req.name || "",
                          businessName: req.businessName || "",
                          registrationNo: req.registrationNo || "",
                          cuisine: req.cuisine || "",
                          city: req.city || req.location || "",
                          state: req.state || "",
                          postcode: req.postcode || "",
                          address: req.address || "",
                          phone: req.phone || "",
                          email: req.email || "",
                          website: req.website || "",
                          note: req.note || "",
                          ownerId: req.ownerId || "",
                        });
                        setShowApproveModal(true);
                      }}
                      disabled={isProcessing}
                    >
                      {approving && isSelected ? "Approving..." : isSelected ? "Close" : "Approve"}
                    </button>
                    <button className="btn btn-danger" onClick={() => handleReject(req)} disabled={isProcessing}>
                      {rejecting ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </article>

                {isSelected && (
                  <div className="approve-panel">
                    <div className="approve-panel-header">
                      <div>
                        <p className="eyebrow">Quick approve</p>
                        <h3>Finalize {formData.name || req.businessName}</h3>
                      </div>
                      <button className="btn btn-ghost" type="button" onClick={resetModal}>
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
                        <span>Restaurant name *</span>
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
                            onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>Cuisine</span>
                          <input
                            type="text"
                            value={formData.cuisine}
                            onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                          />
                        </label>
                      </div>
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
                        <span>Owner ID</span>
                        <input
                          type="text"
                          value={formData.ownerId}
                          onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
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
                      <div className="modal-actions">
                        <button type="submit" className="btn btn-primary" disabled={approving}>
                          {approving ? "Approving..." : "Confirm approve"}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={resetModal}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </div>
    </>
  );
}
