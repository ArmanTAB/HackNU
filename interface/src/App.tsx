import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RouteList } from "./pages/RouteList";
import { Dashboard } from "./pages/Dashboard";
import { TestingDashboard } from "./pages/TestingDashboard";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RouteList />} />
        <Route path="/dashboard/:id" element={<Dashboard />} />
        <Route path="/testing/:id" element={<TestingDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
