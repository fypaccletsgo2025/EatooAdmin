import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./screens/Dashboard";
import RestaurantRequests from "./screens/RestaurantRequests";
import UserSubmissions from "./screens/UserSubmissions";
import ManageRestaurants from "./screens/ManageRestaurants";
import ManageUsers from "./screens/ManageUser";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/restaurant-requests" element={<RestaurantRequests />} />
        <Route path="/user-submissions" element={<UserSubmissions />} />
        <Route path="/manage-restaurants" element={<ManageRestaurants />} />
      </Routes>
    </Router>
  );
}

export default App;
