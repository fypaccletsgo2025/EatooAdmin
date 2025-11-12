import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./screens/Dashboard";
import RestaurantRequests from "./screens/RestaurantRequests";
import UserSubmissions from "./screens/UserSubmissions";
import ManageRestaurants from "./screens/ManageRestaurants";

function NotFound() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Missing page</p>
          <h1>We could not find that screen</h1>
          <p className="page-description">
            The link you followed is outdated or the screen was removed. Pick a section from the
            left navigation to get back on track.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loading-shell">Loading console...</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/restaurant-requests" element={<RestaurantRequests />} />
            <Route path="/user-submissions" element={<UserSubmissions />} />
            <Route path="/manage-restaurants" element={<ManageRestaurants />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
