/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { ApiKeys } from "./pages/ApiKeys";
import { Usage } from "./pages/Usage";
import { Models } from "./pages/Models";
import { Teams } from "./pages/Teams";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <Router>
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
    </Router>
  );
}
