import { HiSparkles } from "react-icons/hi2";
import { Link } from "react-router";
import LoginForm from "../components/Login/LoginForm";

const Login = () => {
    return (
        <div className="mt-10 mx-auto max-w-5xl px-4">
            <div className="grid overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm lg:grid-cols-2">
                {/* Left: the actual login form */}
                <div className="p-6 sm:p-10">
                    <h1 className="text-3xl font-bold">Iniciá sesión</h1>
                    <p className="mt-2 text-base text-base-content/70">
                        Ingresá con tu correo y contraseña.
                    </p>
                    <div className="mt-8">
                        <LoginForm />
                    </div>
                </div>

                {/* Right: always-visible switch-to-register panel (desktop only) */}
                <div className="relative hidden flex-col items-center justify-center gap-4 overflow-hidden border-t border-base-300 bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent p-10 text-center lg:flex lg:border-t-0 lg:border-l">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-2xl"
                    />
                    <HiSparkles className="relative text-primary/70" size={32} />
                    <p className="relative font-display text-2xl italic font-semibold text-base-content">
                        ¿Todavía no tenés cuenta?
                    </p>
                    <p className="relative max-w-xs text-base-content/70">
                        Creá tu cuenta y empezá a
                        comprar en Aura Beauty.
                    </p>
                    <Link className="btn btn-primary relative" to="/register">
                        Creala acá
                    </Link>
                </div>
            </div>

            {/* Mobile-only equivalent — kept short and right under the form,
                not at the bottom of a long page, so it needs no scrolling. */}
            <div className="mt-4 flex flex-col items-center gap-2 rounded-box border border-base-300 bg-base-100 p-6 text-center shadow-sm lg:hidden">
                <p className="text-base-content/70">¿Todavía no tenés cuenta?</p>
                <Link className="btn btn-outline btn-primary w-full" to="/register">
                    Creala acá
                </Link>
            </div>
        </div>
    );
};

export default Login;