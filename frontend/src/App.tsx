/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProvisioningGate } from "./components/ProvisioningGate";
import { Sidebar } from "./components/Sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";
import { Login } from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const ApiKeys = lazy(() => import("./pages/ApiKeys").then((m) => ({ default: m.ApiKeys })));
const Usage = lazy(() => import("./pages/Usage").then((m) => ({ default: m.Usage })));
const Models = lazy(() => import("./pages/Models").then((m) => ({ default: m.Models })));
const Teams = lazy(() => import("./pages/Teams").then((m) => ({ default: m.Teams })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-secondary border-t-accent-primary" />
    </div>
  );
}

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden dark">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto bg-bg-primary">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/keys" element={<ApiKeys />} />
            <Route path="/usage" element={<Usage />} />
            <Route path="/models" element={<Models />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
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
