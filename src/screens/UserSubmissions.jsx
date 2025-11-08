import React, { useEffect, useState } from "react";
import { db, DB_ID } from "../appwrite";

export default function UserSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const formatSubmittedAt = (timestamp) => {
    if (!timestamp) {
      return null;
    }
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchSubmissions() {
      try {
        const res = await db.listDocuments(
          DB_ID,
          "user_submitted_restaurants"
        );
        if (!isMounted) return;
        setSubmissions(res.documents);
        setError(null);
      } catch (err) {
        console.error("Failed to load user submissions", err);
        if (isMounted) {
          setError("Unable to load submissions right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSubmissions();

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
      const submission = submissions.find((s) => s.$id === id);
      if (!submission) return;

      await db.createDocument(
        DB_ID,
        "restaurants",
        id,
        sanitizePayload(submission)
      );
      await db.deleteDocument(DB_ID, "user_submitted_restaurants", id);
      setSubmissions((prev) => prev.filter((s) => s.$id !== id));
      setError(null);
    } catch (err) {
      console.error("Failed to approve submission", err);
      setError("Unable to approve this submission. Please try again.");
    }
  };

  const handleReject = async (id) => {
    try {
      await db.deleteDocument(DB_ID, "user_submitted_restaurants", id);
      setSubmissions((prev) => prev.filter((s) => s.$id !== id));
      setError(null);
    } catch (err) {
      console.error("Failed to reject submission", err);
      setError("Unable to reject this submission. Please try again.");
    }
  };

  const submissionLabel =
    submissions.length === 1 ? "submission" : "submissions";

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Community</p>
          <h1>User Submitted Restaurants</h1>
          <p className="page-description">
            Verify community recommendations before promoting them to the live
            marketplace.
          </p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Submissions queue</h2>
            <p className="panel-description">
              {loading
                ? "Fetching the latest submissions..."
                : `You have ${submissions.length} ${submissionLabel} awaiting review.`}
            </p>
          </div>
          {!loading && submissions.length > 0 && (
            <span className="tag">{submissions.length} to review</span>
          )}
        </div>
        <div className="panel-body">
          {error && <p className="error-text">{error}</p>}

          {loading && (
            <div className="empty-state">
              <strong>Loading submissions</strong>
              Hang tight while we gather community picks.
            </div>
          )}

          {!loading && !error && submissions.length === 0 && (
            <div className="empty-state">
              <strong>No submissions right now</strong>
              Encourage diners to share their favourite spots.
            </div>
          )}

          {!loading && !error && submissions.length > 0 && (
            <div className="data-list">
              {submissions.map((submission) => {
                const submittedAt = formatSubmittedAt(
                  submission.$createdAt || submission.createdAt
                );

                return (
                  <article key={submission.$id} className="list-card">
                    <div className="list-card-content">
                      <h3>{submission.name || "Untitled restaurant"}</h3>
                      <p>{submission.location || "Location not provided"}</p>
                      <div className="list-meta">
                        {submission.cuisine && (
                          <span>{submission.cuisine}</span>
                        )}
                        {submittedAt && <span>Submitted {submittedAt}</span>}
                      </div>
                    </div>
                    <div className="list-card-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleApprove(submission.$id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleReject(submission.$id)}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
