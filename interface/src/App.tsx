import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RouteList } from "./pages/RouteList";
import { Dashboard } from "./pages/Dashboard";
import { LimitsPage } from "./pages/Limits";
import { TestingDashboard } from "./pages/TestingDashboard";
import { AuthPage } from "./pages/AuthPage";
import "./App.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("jwt_token");
  const user = localStorage.getItem("auth_user");
  return token && user ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<RequireAuth><RouteList /></RequireAuth>} />
        <Route path="/dashboard/:id" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/limits/:id" element={<RequireAuth><LimitsPage /></RequireAuth>} />
        <Route path="/testing/:id" element={<RequireAuth><TestingDashboard /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
