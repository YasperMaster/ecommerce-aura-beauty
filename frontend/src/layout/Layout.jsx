import { Outlet } from "react-router"
import NavBar from "../components/Navbar/Navbar"
const Layout = () => {
    return <div className="w-full max-w-[1000px] mx-auto px-6 pb-10">
        <NavBar/>

        <main>
            <Outlet/>
        </main>
    </div>
}

export default Layout