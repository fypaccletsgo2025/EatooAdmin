import React, { useEffect, useState } from "react";
import { db, DB_ID } from "../appwrite";

export default function PendingRestaurants() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchRequests() {
      try {
        const res = await db.listDocuments(DB_ID, "restaurant_request");
        if (!isMounted) return;
        setRequests(res.documents);
        setError(null);
      } catch (err) {
        console.error("Failed to load pending requests", err);
        if (isMounted) {
          setError("Unable to load pending requests right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  const sanitizePayload = (payload) => {
    const {
      $id,
      $createdAt,
      $updatedAt,
      $collectionId,
      $databaseId,
      $permissions,
      ...rest
    } = payload;
    return rest;
  };

  const handleApprove = async (id) => {
    try {
      const request = requests.find((r) => r.$id === id);
      if (!request) return;

      await db.createDocument(DB_ID, "restaurants", id, sanitizePayload(request));
      await db.deleteDocument(DB_ID, "restaurant_request", id);
      setRequests((prev) => prev.filter((r) => r.$id !== id));
      setError(null);
    } catch (err) {
      console.error("Failed to approve request", err);
      setError("Unable to approve this request. Please try again.");
    }
  };

  const handleReject = async (id) => {
    try {
      await db.deleteDocument(DB_ID, "restaurant_request", id);
      setRequests((prev) => prev.filter((r) => r.$id !== id));
      setError(null);
    } catch (err) {
      console.error("Failed to reject request", err);
      setError("Unable to reject this request. Please try again.");
    }
  };

  const requestLabel =
    requests.length === 1 ? "request" : "requests";

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Approvals</p>
          <h1>Pending Restaurant Requests</h1>
          <p className="page-description">
            Quickly review and approve new partners to keep the marketplace
            fresh.
          </p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Requests in queue</h2>
            <p className="panel-description">
              {loading
                ? "Fetching latest submissions..."
                : `You have ${requests.length} ${requestLabel} awaiting review.`}
            </p>
          </div>
          {!loading && requests.length > 0 && (
            <span className="tag">{requests.length} waiting</span>
          )}
        </div>
        <div className="panel-body">
          {error && <p className="error-text">{error}</p>}

          {loading && (
            <div className="empty-state">
              <strong>Loading requests</strong>
              Please hold on while we load the queue.
            </div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="empty-state">
              <strong>No pending requests</strong>
              All caught up for now.
            </div>
          )}

          {!loading && !error && requests.length > 0 && (
            <div className="data-list">
              {requests.map((req) => (
                <article key={req.$id} className="list-card">
                  <div className="list-card-content">
                    <h3>{req.name || "Untitled restaurant"}</h3>
                    <p>{req.location || "Location not provided"}</p>
                    <div className="list-meta">
                      {req.cuisine && <span>{req.cuisine}</span>}
                      {req.phone && <span>{req.phone}</span>}
                    </div>
                  </div>
                  <div className="list-card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleApprove(req.$id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleReject(req.$id)}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
