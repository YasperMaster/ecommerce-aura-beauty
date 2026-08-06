import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router";
import { useUser } from "../../context/UserContext";
import { getInputStateClassName } from "../../utils/formHelpers";

const RegisterForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register: registerUser, verifyEmail, resendCode } = useUser();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ mode: "onChange" });

  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null); // set once step 1 succeeds
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const fullNameValue = watch("fullName", "");
  const emailValue = watch("email", "");
  const phoneValue = watch("phone", "");
  const passwordValue = watch("password", "");
  const redirectTo = useMemo(
    () => location.state?.redirectTo || "/",
    [location.state],
  );

  const onSubmit = async (data) => {
    try {
      const response = await registerUser(data);
      toast.success(response.message);
      setPendingEmail(response.email);
      reset();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onVerifyCode = async (event) => {
    event.preventDefault();
    setIsVerifying(true);
    try {
      const response = await verifyEmail({ email: pendingEmail, code });
      toast.success(response.message);
      navigate(redirectTo);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const onResendCode = async () => {
    setIsResending(true);
    try {
      const response = await resendCode(pendingEmail);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsResending(false);
    }
  };

  if (pendingEmail) {
    return (
      <form
        className="mt-8 flex flex-col gap-4 lg:gap-6 max-w-[500px] mx-auto"
        key="verify-email-step"
        onSubmit={onVerifyCode}
      >
        <p className="text-center text-sm text-base-content/70">
          Enviamos un código de 6 dígitos a <strong>{pendingEmail}</strong>.
          Ingresalo para activar tu cuenta.
        </p>

        <input
          autoComplete="one-time-code"
          className="p-3 outline-2 rounded border focus:outline-primary w-full text-center text-2xl tracking-[0.5em]"
          inputMode="numeric"
          maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          pattern="\d{6}"
          placeholder="000000"
          value={code}
        />

        <button
          className="btn btn-primary mt-2"
          disabled={isVerifying || code.length !== 6}
          type="submit"
        >
          {isVerifying ? "Confirmando..." : "Confirmar código"}
        </button>

        <button
          className="btn btn-ghost btn-sm"
          disabled={isResending}
          onClick={onResendCode}
          type="button"
        >
          {isResending ? "Enviando..." : "Reenviar código"}
        </button>
      </form>
    );
  }

  return (
    <form
      className="mt-8 flex flex-col gap-4 lg:gap-6 max-w-[500px] mx-auto"
      key="register-details-step"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label className="label" htmlFor="register-fullname">
          <span className="label-text">Nombre completo</span>
        </label>
        <input
          {...register("fullName", {
            required: "Ingresá tu nombre completo.",
            minLength: {
              value: 3,
              message: "El nombre debe tener al menos 3 caracteres.",
            },
            maxLength: {
              value: 100,
              message: "El nombre debe tener a lo sumo 100 caracteres.",
            },
          })}
          autoComplete="name"
          className={`input input-bordered w-full ${getInputStateClassName(
            Boolean(fullNameValue && !errors.fullName),
            Boolean(errors.fullName),
          )}`}
          id="register-fullname"
          placeholder="Nombre completo"
          type="text"
        />
        {errors.fullName && (
          <p className="text-red-500 text-sm mt-2 ml-1">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="register-email">
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
          id="register-email"
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
        <label className="label" htmlFor="register-phone">
          <span className="label-text">Teléfono móvil</span>
        </label>
        <input
          {...register("phone", {
            required: "Ingresá un número de teléfono.",
            validate: (value) => {
              if (!/^[\d\s-()]+$/.test(value)) {
                return "Ingresá un número de teléfono válido (solo dígitos, espacios, guiones y paréntesis).";
              }
              const digits = value.replace(/\D/g, "");
              if (digits.length < 8 || digits.length > 15) {
                return "El teléfono debe tener entre 8 y 15 dígitos.";
              }
              return true;
            },
          })}
          autoComplete="tel"
          className={`input input-bordered w-full ${getInputStateClassName(
            Boolean(phoneValue && !errors.phone),
            Boolean(errors.phone),
          )}`}
          id="register-phone"
          placeholder="Teléfono Móvil"
          type="tel"
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mt-2 ml-1">
            {errors.phone.message}
          </p>
        )}
        <p className="mt-2 text-sm text-base-content/60">
        </p>
      </div>

      <div className="relative">
        <label className="label" htmlFor="register-password">
          <span className="label-text">Contraseña</span>
        </label>
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
          autoComplete="new-password"
          className={`input input-bordered w-full pr-12 ${getInputStateClassName(
            Boolean(passwordValue && !errors.password),
            Boolean(errors.password),
          )}`}
          id="register-password"
          placeholder="Contraseña"
          type={showPassword ? "text" : "password"}
        />
        <button
          aria-label={
            showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
          }
          className="cursor-pointer absolute right-4 top-[52px] transform -translate-y-1/2 text-gray-600"
          onClick={() => setShowPassword((prev) => !prev)}
          type="button"
        >
          {showPassword ? <FaEyeSlash size={23} /> : <FaEye size={23} />}
        </button>
        {errors.password && (
          <p className="text-red-500 text-sm mt-2 ml-1">
            {errors.password.message}
          </p>
        )}
        <p className="mt-2 text-sm text-base-content/60">
          La contraseña debe tener entre 6 y 30 caracteres.
        </p>
      </div>

      <button
        className="btn btn-primary mt-2"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creando cuenta..." : "Registrarse"}
      </button>

      <p className="text-center text-sm text-base-content/70">
        ¿Ya tenés una cuenta?{" "}
        <Link className="link link-primary" to="/login">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
};

export default RegisterForm;
