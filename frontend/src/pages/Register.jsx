import { HiSparkles } from "react-icons/hi2";
import { Link } from "react-router";
import RegisterForm from "../components/Register/RegisterForm";

const Register = () => {
    return (
        <div className="mt-10 mx-auto max-w-5xl px-4">
            <div className="grid overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm lg:grid-cols-2">
                {/* Left: the actual register form */}
                <div className="p-6 sm:p-10">
                    <h1 className="text-3xl font-bold">Creá tu cuenta</h1>
                    <p className="mt-2 text-base text-base-content/70">
                        Sumate a Aura Beauty en un par de minutos.
                    </p>
                    <div className="mt-8">
                        <RegisterForm />
                    </div>
                </div>

                {/* Right: always-visible switch-to-login panel (desktop only) */}
                <div className="relative hidden flex-col items-center justify-center gap-4 overflow-hidden border-t border-base-300 bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent p-10 text-center lg:flex lg:border-t-0 lg:border-l">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-2xl"
                    />
                    <HiSparkles className="relative text-primary/70" size={32} />
                    <p className="relative font-display text-2xl italic font-semibold text-base-content">
                        ¿Ya tenés una cuenta?
                    </p>
                    <p className="relative max-w-xs text-base-content/70">
                        Iniciá sesión con tu correo y contraseña para seguir
                        comprando en Aura Beauty.
                    </p>
                    <Link className="btn btn-primary relative" to="/login">
                        Iniciá sesión
                    </Link>
                </div>
            </div>

            {/* Mobile-only equivalent — kept short and right under the form,
                not at the bottom of a long page, so it needs no scrolling. */}
            <div className="mt-4 flex flex-col items-center gap-2 rounded-box border border-base-300 bg-base-100 p-6 text-center shadow-sm lg:hidden">
                <p className="text-base-content/70">¿Ya tenés una cuenta?</p>
                <Link className="btn btn-outline btn-primary w-full" to="/login">
                    Iniciá sesión
                </Link>
            </div>
        </div>
    );
};

export default Register;