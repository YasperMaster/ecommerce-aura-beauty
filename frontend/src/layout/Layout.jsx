import Footer from "../components/Footer/Footer";
import NavBar from "../components/Navbar/Navbar";
import { Outlet } from "react-router";

const Layout = () => {
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
