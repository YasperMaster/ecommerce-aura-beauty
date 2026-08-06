import toast from "react-hot-toast";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useUser } from "../../context/UserContext";

const UserDropDown = () => {
  const navigate = useNavigate();
  const { userInfo, logout } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await logout();
      toast.success(response.message);
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const userInitial = userInfo?.fullName?.[0]?.toUpperCase() || "A";

  return (
    <div className="dropdown dropdown-end relative z-[200]">
      <div
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Menú de ${userInfo?.fullName || "usuario"}`}
        className="avatar placeholder cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
          if (e.key === "Escape") setIsOpen(false);
        }}
        role="button"
        tabIndex={0}
      >
        <div className="w-10 rounded-full bg-primary text-primary-content">
          <span className="font-semibold">{userInitial}</span>
        </div>
      </div>
      <ul
        className="menu menu-sm dropdown-content rounded-box z-[4000] mt-3 w-64 bg-base-100 p-2 shadow-2xl border border-base-300"
        role="menu"
      >
        <li className="menu-title px-3 py-2">
          <span>{userInfo?.fullName}</span>
          <span className="normal-case text-xs font-normal text-base-content/60">
            {userInfo?.email}
          </span>
        </li>
        <li role="menuitem">
          <Link to="/cart">Mi carrito</Link>
        </li>
        <li role="menuitem">
          <Link to="/mis-compras">Mis compras</Link>
        </li>
        {userInfo?.isAdmin && (
          <li role="menuitem">
            <Link to="/admin">Dashboard</Link>
          </li>
        )}
        <li role="menuitem">
          <Link to="/mi-perfil">Mi perfil</Link>
        </li>
        <li role="menuitem">
          <button onClick={handleLogout} type="button">
            Cerrar sesión
          </button>
        </li>
      </ul>
    </div>
  );
};

export default UserDropDown;
