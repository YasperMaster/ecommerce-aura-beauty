import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router";
import { useUser } from "../../context/UserContext";
import { getInputStateClassName } from "../../utils/formHelpers";

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUser();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ mode: "onChange" });

  const [showPassword, setShowPassword] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const emailValue = watch("email", "");
  const passwordValue = watch("password", "");
  const redirectTo = useMemo(
    () => location.state?.redirectTo || "/",
    [location.state],
  );

  const onSubmit = async (data) => {
    setLoginFailed(false);
    try {
      const response = await login(data);
      toast.success(response.message);
      reset();
      navigate(redirectTo);
    } catch (error) {
      toast.error(error.message);
      setLoginFailed(true);
    }
  };

  return (
    <form
      className="mt-8 flex flex-col gap-4 lg:gap-6 max-w-[500px] mx-auto"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label className="label" htmlFor="login-email">
          <span className="label-text">Correo electrónico</span>
        </label>
        <input
          {...register("email", {
            required: "Ingresá un correo electrónico.",
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: "Ingresá un correo electrónico válido.",
            },
            maxLength: {
              value: 254,
              message: "Tu correo debe tener a lo sumo 254 caracteres.",
            },
          })}
          autoComplete="email"
          className={`input input-bordered w-full ${getInputStateClassName(
            Boolean(emailValue && !errors.email),
            Boolean(errors.email),
          )}`}
          id="login-email"
          placeholder="Correo electrónico"
          type="email"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-2 ml-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="login-password">
          <span className="label-text">Contraseña</span>
        </label>
        <div className="relative">
          <input
            {...register("password", {
              required: "Ingresá una contraseña.",
              minLength: {
                value: 6,
                message: "La contraseña debe tener al menos 6 caracteres.",
              },
              maxLength: {
                value: 30,
                message: "La contraseña debe tener a lo sumo 30 caracteres.",
              },
            })}
            autoComplete="current-password"
            className={`input input-bordered w-full pr-12 ${getInputStateClassName(
              Boolean(passwordValue && !errors.password),
              Boolean(errors.password),
            )}`}
            id="login-password"
            placeholder="Contraseña"
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
            onClick={() => setShowPassword((prev) => !prev)}
            type="button"
          >
            {showPassword ? <FaEyeSlash size={23} /> : <FaEye size={23} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-sm mt-2 ml-1">
            {errors.password.message}
          </p>
        )}
        <p className="text-right text-sm mt-2">
          <Link className="link link-primary" to="/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>

      {loginFailed && (
        <div className="alert alert-warning text-sm">
          <span>
            Revisá tu correo y contraseña. Si todavía no tenés una cuenta en
            Aura Beauty, no hace falta que sigas intentando ingresar —{" "}
            <Link className="link link-primary font-semibold" to="/register">
              creá tu cuenta acá
            </Link>
            .
          </span>
        </div>
      )}

      <button
        className="btn btn-primary mt-2"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Ingresando..." : "Iniciá sesión"}
      </button>

      <div className="flex items-center gap-3 text-sm text-base-content/50">
        <div className="h-px flex-1 bg-base-300" />
        o
        <div className="h-px flex-1 bg-base-300" />
      </div>
      <Link className="btn btn-outline btn-primary" to="/register">
        ¿Todavía no tenés cuenta? Creala acá
      </Link>
    </form>
  );
};

export default LoginForm;