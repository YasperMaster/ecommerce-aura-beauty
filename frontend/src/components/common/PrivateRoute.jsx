import { Navigate, Outlet, useLocation } from "react-router";
import { useUser } from "../../context/UserContext";
import PageLoader from "./PageLoader";

const PrivateRoute = () => {
  const location = useLocation();
  const { loading, isAuthenticated } = useUser();

  if (loading) {
    return <PageLoader message="Verificando sesión..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate replace state={{ redirectTo: location.pathname }} to="/login" />
    );
  }

  return <Outlet />;
};

export default PrivateRoute;
