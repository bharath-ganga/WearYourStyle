import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Loading = () => <div style={{ minHeight: "55vh", display: "grid", placeItems: "center" }}>Loading your account…</div>;

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/sign_in" replace state={{ from: location.pathname }} />;
};

export const AdminRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/admin" replace />;
};
