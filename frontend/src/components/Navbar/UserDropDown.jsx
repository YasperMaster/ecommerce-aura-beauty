const UserDropDown = () => {
    return (
        <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                    <img src="https://images.meme-arsenal.com/77371b56a8decd0d685d4c8eeb79f389.jpg" alt="avatar" />
                </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow">
                <li>
                    <a className="justify-between">Mi perfil<span className="badge">Nuevo</span>
                    </a>
                </li>
                <li>
                    <a className="justify-between">Configuración</a>
                </li>
                <li>
                    <a className="justify-between">Cerrar sesión</a>
                </li>
            </ul>
        </div>
    )
}

export default UserDropDown