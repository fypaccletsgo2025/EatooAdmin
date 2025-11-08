import React, { useEffect, useState } from "react";
import { db, DB_ID } from "../appwrite";

export default function ManageRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchRestaurants() {
      try {
        const res = await db.listDocuments(DB_ID, "restaurants");
        if (!isMounted) return;
        setRestaurants(res.documents);
        setError(null);
      } catch (err) {
        console.error("Failed to load restaurants", err);
        if (isMounted) {
          setError("Unable to load restaurants right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRestaurants();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this restaurant?")) {
      return;
    }

    try {
      await db.deleteDocument(DB_ID, "restaurants", id);
      setRestaurants((prev) => prev.filter((r) => r.$id !== id));
      setError(null);
    } catch (err) {
      console.error("Failed to delete restaurant", err);
      setError("Unable to delete the restaurant. Please try again.");
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Manage Restaurants</h1>
          <p className="page-description">
            Quickly audit live restaurants and remove listings that are no
            longer available.
          </p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Live partners</h2>
            <p className="panel-description">
              {loading
                ? "Loading restaurants..."
                : `${restaurants.length} restaurant${
                    restaurants.length === 1 ? "" : "s"
                  } currently live`}
            </p>
          </div>
        </div>
        <div className="panel-body">
          {error && <p className="error-text">{error}</p>}

          {loading && (
            <div className="empty-state">
              <strong>Loading restaurants</strong>
              This might take just a moment.
            </div>
          )}

          {!loading && restaurants.length === 0 && (
            <div className="empty-state">
              <strong>No restaurants yet</strong>
              Approve pending partners to grow your catalog.
            </div>
          )}

          {!loading && restaurants.length > 0 && (
            <div className="data-list">
              {restaurants.map((restaurant) => (
                <article key={restaurant.$id} className="list-card">
                  <div className="list-card-content">
                    <h3>{restaurant.name || "Untitled restaurant"}</h3>
                    <p>{restaurant.location || "Location not provided"}</p>
                    <div className="list-meta">
                      {restaurant.cuisine && (
                        <span>{restaurant.cuisine}</span>
                      )}
                      {restaurant.status && (
                        <span>Status: {restaurant.status}</span>
                      )}
                    </div>
                  </div>
                  <div className="list-card-actions">
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(restaurant.$id)}
                    >
                      Delete
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
