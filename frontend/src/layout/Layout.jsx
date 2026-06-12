import Footer from "../components/Footer/Footer";
import NavBar from "../components/Navbar/Navbar";
import { Outlet } from "react-router";

const Layout = () => {
  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 pb-12 md:px-6">
        <NavBar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
