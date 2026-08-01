import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router";
import { useUser } from "../../context/UserContext";
import { getInputStateClassName } from "../../utils/formHelpers";

const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { forgotPassword, resetPassword } = useUser();

  const [pendingEmail, setPendingEmail] = useState(null); // set once step 1 succeeds
  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If we arrived here from the logged-in user's dropdown, the email is
  // already known — prefill it so they don't have to retype it.
  const emailForm = useForm({
    defaultValues: { email: location.state?.email || "" },
    mode: "onChange",
  });
  const resetForm = useForm({ mode: "onChange" });
  const newPasswordValue = resetForm.watch("newPassword", "");
  const codeValue = resetForm.watch("code", "");

  const onRequestCode = async ({ email }) => {
    setIsRequesting(true);
    try {
      const response = await forgotPassword(email);
      toast.success(response.message);
      resetForm.reset({ code: "", newPassword: "" }); // defend against stale/autofilled values
      setPendingEmail(email);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsRequesting(false);
    }
  };

  const onResendCode = async () => {
    setIsRequesting(true);
    try {
      const response = await forgotPassword(pendingEmail);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsRequesting(false);
    }
  };

  const onResetPassword = async ({ code, newPassword }) => {
    setIsResetting(true);
    try {
      const response = await resetPassword({
        email: pendingEmail,
        code,
        newPassword,
      });
      toast.success(response.message);
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Step 2: enter the code + new password
  if (pendingEmail) {
    return (
      <form
        className="mt-8 flex flex-col gap-4 lg:gap-6 max-w-[500px] mx-auto"
        key="reset-password-step"
        onSubmit={resetForm.handleSubmit(onResetPassword)}
      >
        <p className="text-center text-sm text-base-content/70">
          Enviamos un código de 6 dígitos a <strong>{pendingEmail}</strong>.
          Ingresalo junto con tu nueva contraseña.
        </p>

        <div>
          <label className="label" htmlFor="reset-code">
            <span className="label-text">Código de verificación</span>
          </label>
          <input
            {...resetForm.register("code", {
              required: "Ingresá el código.",
              pattern: {
                value: /^\d{6}$/,
                message: "El código debe tener 6 dígitos.",
              },
            })}
            autoComplete="one-time-code"
            className="input input-bordered w-full text-center text-2xl tracking-[0.5em]"
            id="reset-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
          />
          {resetForm.formState.errors.code && (
            <p className="text-red-500 text-sm mt-2 ml-1">
              {resetForm.formState.errors.code.message}
            </p>
          )}
        </div>

        <div className="relative">
          <label className="label" htmlFor="reset-password">
            <span className="label-text">Nueva contraseña</span>
          </label>
          <input
            {...resetForm.register("newPassword", {
              required: "Ingresá tu nueva contraseña.",
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
              Boolean(newPasswordValue && !resetForm.formState.errors.newPassword),
              Boolean(resetForm.formState.errors.newPassword),
            )}`}
            id="reset-password"
            placeholder="Nueva contraseña"
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
          {resetForm.formState.errors.newPassword && (
            <p className="text-red-500 text-sm mt-2 ml-1">
              {resetForm.formState.errors.newPassword.message}
            </p>
          )}
        </div>

        <button
          className="btn btn-primary mt-2"
          disabled={isResetting || codeValue.length !== 6}
          type="submit"
        >
          {isResetting ? "Restableciendo..." : "Restablecer contraseña"}
        </button>

        <button
          className="btn btn-ghost btn-sm"
          disabled={isRequesting}
          onClick={onResendCode}
          type="button"
        >
          {isRequesting ? "Enviando..." : "Reenviar código"}
        </button>
      </form>
    );
  }

  // Step 1: ask for the account email
  return (
    <form
      className="mt-8 flex flex-col gap-4 lg:gap-6 max-w-[500px] mx-auto"
      key="request-code-step"
      onSubmit={emailForm.handleSubmit(onRequestCode)}
    >
      <p className="text-center text-sm text-base-content/70">
        Ingresá el email de tu cuenta y te enviamos un código para
        restablecer tu contraseña.
      </p>

      <div>
        <label className="label" htmlFor="forgot-email">
          <span className="label-text">Correo electrónico</span>
        </label>
        <input
          {...emailForm.register("email", {
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
            Boolean(emailForm.watch("email") && !emailForm.formState.errors.email),
            Boolean(emailForm.formState.errors.email),
          )}`}
          id="forgot-email"
          placeholder="Correo electrónico"
          type="email"
        />
        {emailForm.formState.errors.email && (
          <p className="text-red-500 text-sm mt-2 ml-1">
            {emailForm.formState.errors.email.message}
          </p>
        )}
      </div>

      <button className="btn btn-primary mt-2" disabled={isRequesting} type="submit">
        {isRequesting ? "Enviando..." : "Enviar código"}
      </button>

      <p className="text-center text-sm text-base-content/70">
        <Link className="link link-primary" to="/login">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
};

export default ForgotPasswordForm;
