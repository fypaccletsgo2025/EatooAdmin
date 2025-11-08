import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./screens/Dashboard";
import PendingRestaurants from "./screens/PendingRestaurants";
import UserSubmissions from "./screens/UserSubmissions";
import ManageRestaurants from "./screens/ManageRestaurants";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pending" element={<PendingRestaurants />} />
          <Route path="submissions" element={<UserSubmissions />} />
          <Route path="manage-restaurants" element={<ManageRestaurants />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
