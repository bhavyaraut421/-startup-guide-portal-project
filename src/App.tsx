/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import IdeaGenerator from "./pages/IdeaGenerator";
import CostCalculator from "./pages/CostCalculator";
import Schemes from "./pages/Schemes";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import ResourceCenter from "./pages/ResourceCenter";
import FAQ from "./pages/FAQ";
import Profile from "./pages/Profile";
import OAuthSuccess from "./pages/OAuthSuccess";   // ⭐ ADD THIS
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppRoutes() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  // If NOT logged in
  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />

        {/* ⭐ Google OAuth redirect page */}
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* Redirect everything else */}
        <Route path="*" element={<Navigate to="/login" state={{ from: location }} replace />} />
      </Routes>
    );
  }

  // If logged in
  return (
    <Routes>
      <Route element={<DashboardLayout />}>

        <Route path="/" element={<DashboardHome />} />
        <Route path="/idea-generator" element={<IdeaGenerator />} />
        <Route path="/calculator" element={<CostCalculator />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/downloads" element={<ResourceCenter />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/profile" element={<Profile />} />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}