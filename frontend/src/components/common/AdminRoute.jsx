import { Navigate, Outlet, useLocation } from "react-router";
import { useUser } from "../../context/UserContext";
import PageLoader from "./PageLoader";

const AdminRoute = () => {
  const location = useLocation();
  const { loading, isAuthenticated, userInfo } = useUser();

  if (loading) {
    return <PageLoader message="Verificando permisos..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate replace state={{ redirectTo: location.pathname }} to="/login" />
    );
  }

  if (!userInfo?.isAdmin) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
};

export default AdminRoute;
