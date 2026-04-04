import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RouteList } from "./pages/RouteList";
import { Dashboard } from "./pages/Dashboard";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RouteList />} />
        <Route path="/dashboard/:id" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
