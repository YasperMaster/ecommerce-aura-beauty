import LoginForm from "../components/Login/LoginForm"

const Login = () => {
    return (
        <div className="mt-16">
            <h1 className="text-3xl font-bold text-center">Iniciá sesión</h1>
            <p className="mt-2 text-center text-base text-base-content/70 px-4">
                Ingresá con tu correo y contraseña si ya tenés una cuenta.
                <br />
                Si es tu primera vez en Aura Beauty, creá tu cuenta más abajo.
            </p>
            <LoginForm/>
        </div>
    )
}

export default Login