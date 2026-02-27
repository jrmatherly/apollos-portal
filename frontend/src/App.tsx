/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProvisioningGate } from "./components/ProvisioningGate";
import { Sidebar } from "./components/Sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";
import { ApiKeys } from "./pages/ApiKeys";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Models } from "./pages/Models";
import { Settings } from "./pages/Settings";
import { Teams } from "./pages/Teams";
import { Usage } from "./pages/Usage";

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden dark">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto bg-bg-primary">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/keys" element={<ApiKeys />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/models" element={<Models />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <ProvisioningGate>
                    <AppLayout />
                  </ProvisioningGate>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
