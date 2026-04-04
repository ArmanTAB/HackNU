import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RouteList } from "./pages/RouteList";
import { Dashboard } from "./pages/Dashboard";
import { LimitsPage } from "./pages/Limits";
import { TestingDashboard } from "./pages/TestingDashboard";
import { AuthPage } from "./pages/AuthPage";
import "./App.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem("auth_user");
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<RouteList />} />
        <Route path="/dashboard/:id" element={<Dashboard />} />
        <Route path="/limits/:id" element={<LimitsPage />} />
        <Route path="/testing/:id" element={<TestingDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
