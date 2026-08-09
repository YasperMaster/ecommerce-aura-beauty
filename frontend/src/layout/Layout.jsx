import { useEffect } from "react";
import { useLocation, Outlet } from "react-router";
import Footer from "../components/Footer/Footer";
import NavBar from "../components/Navbar/Navbar";

const Layout = () => {
  // Scroll to top on every navigation so users always land at the top
  // of the page instead of inheriting the previous page's scroll position.
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen w-full">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-content focus:shadow-lg"
        href="#main-content"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 pb-12 md:px-6">
        <NavBar />
        <main className="flex-1" id="main-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
