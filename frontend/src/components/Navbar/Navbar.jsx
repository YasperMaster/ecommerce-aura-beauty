import { Link } from "react-router"
import Cart from "./Cart"
import AuthButtons from "./AuthButtons"
import UserDropDown from "./UserDropDown"

const Navbar = () => {
    return (
        <header>
            <AuthButtons/>
            <nav className="navbar bg-base-100 shadow-sm lg:rounded-box w-full">
                <div className="navbar-start">
                    <Link className="btn btn-ghost text-xl" to="/">Aura Beauty</Link>
                </div>
                <div className="navbar-end gap-3">
                    <a className="btn btn-primary">Dashboard</a>
                    <Cart />
                    <UserDropDown/>
                </div>
            </nav>
        </header>
    )
}

export default Navbar