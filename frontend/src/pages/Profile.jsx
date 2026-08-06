import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash, FaPhone, FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import { useUser } from "../context/UserContext";
import { getInputStateClassName } from "../utils/formHelpers";

const Profile = () => {
  const { userInfo, updatePhone, changePassword } = useUser();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    register: registerPhone,
    handleSubmit: handlePhoneSubmit,
    watch: watchPhone,
    reset: resetPhoneForm,
    formState: { errors: phoneErrors, isSubmitting: isPhoneSubmitting },
  } = useForm({ mode: "onChange" });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch: watchPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm({ mode: "onChange" });

  const phoneValue = watchPhone("phone", "");
  const newPasswordValue = watchPassword("newPassword", "");

  const onPhoneSubmit = async (data) => {
    try {
      const response = await updatePhone(data.phone);
      toast.success(response.message);
      resetPhoneForm();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      const response = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success(response.message);
      resetPasswordForm();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="mx-auto max-w-[600px] px-4 py-10">
      <h1 className="text-3xl font-bold text-center">Mi perfil</h1>
      <p className="mt-2 text-center text-sm text-base-content/70">
        Revisá y actualizá tu información personal.
      </p>

      {/* ── User Info Card ─────────────────────────────────────────── */}
      <div className="mt-8 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="avatar placeholder">
            <div className="w-16 rounded-full bg-primary text-primary-content">
              <span className="text-2xl font-semibold">
                {userInfo?.fullName?.[0]?.toUpperCase() || "A"}
              </span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{userInfo?.fullName}</h2>
            <p className="text-sm text-base-content/60">
              {userInfo?.isAdmin ? "Administrador" : "Cliente"}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-base-200/50 p-3">
            <FaUser className="text-base-content/50" size={18} />
            <div>
              <p className="text-xs text-base-content/50">Usuario</p>
              <p className="font-medium">{userInfo?.fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-base-200/50 p-3">
            <FaEnvelope className="text-base-content/50" size={18} />
            <div>
              <p className="text-xs text-base-content/50">Correo electrónico</p>
              <p className="font-medium">{userInfo?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-base-200/50 p-3">
            <FaPhone className="text-base-content/50" size={18} />
            <div>
              <p className="text-xs text-base-content/50">Teléfono</p>
              <p className="font-medium">{userInfo?.phone || "Sin asignar"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Update Phone Card ─────────────────────────────────────── */}
      <div className="mt-6 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FaPhone size={18} /> Cambiar teléfono
        </h3>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={handlePhoneSubmit(onPhoneSubmit)}
        >
          <div>
            <label className="label" htmlFor="profile-phone">
              <span className="label-text">Nuevo número de teléfono</span>
            </label>
            <input
              {...registerPhone("phone", {
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
                Boolean(phoneValue && !phoneErrors.phone),
                Boolean(phoneErrors.phone),
              )}`}
              id="profile-phone"
              placeholder="Teléfono Móvil"
              type="tel"
            />
            {phoneErrors.phone && (
              <p className="text-red-500 text-sm mt-2 ml-1">
                {phoneErrors.phone.message}
              </p>
            )}
            <p className="mt-2 text-sm text-base-content/60">
              Entre 8 y 15 dígitos.
            </p>
          </div>

          <button
            className="btn btn-primary"
            disabled={isPhoneSubmitting}
            type="submit"
          >
            {isPhoneSubmitting ? "Guardando..." : "Guardar teléfono"}
          </button>
        </form>
      </div>

      {/* ── Change Password Card ───────────────────────────────────── */}
      <div className="mt-6 rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FaLock size={18} /> Cambiar contraseña
        </h3>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
        >
          <div className="relative">
            <label className="label" htmlFor="profile-current-password">
              <span className="label-text">Contraseña actual</span>
            </label>
            <input
              {...registerPassword("currentPassword", {
                required: "Ingresá tu contraseña actual.",
              })}
              autoComplete="current-password"
              className={`input input-bordered w-full pr-12 ${getInputStateClassName(
                Boolean(watchPassword("currentPassword", "") && !passwordErrors.currentPassword),
                Boolean(passwordErrors.currentPassword),
              )}`}
              id="profile-current-password"
              placeholder="Contraseña actual"
              type={showCurrentPassword ? "text" : "password"}
            />
            <button
              aria-label={
                showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="cursor-pointer absolute right-4 top-[52px] transform -translate-y-1/2 text-gray-600"
              onClick={() => setShowCurrentPassword((prev) => !prev)}
              type="button"
            >
              {showCurrentPassword ? <FaEyeSlash size={23} /> : <FaEye size={23} />}
            </button>
            {passwordErrors.currentPassword && (
              <p className="text-red-500 text-sm mt-2 ml-1">
                {passwordErrors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="relative">
            <label className="label" htmlFor="profile-new-password">
              <span className="label-text">Nueva contraseña</span>
            </label>
            <input
              {...registerPassword("newPassword", {
                required: "Ingresá una nueva contraseña.",
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
                Boolean(newPasswordValue && !passwordErrors.newPassword),
                Boolean(passwordErrors.newPassword),
              )}`}
              id="profile-new-password"
              placeholder="Nueva contraseña"
              type={showNewPassword ? "text" : "password"}
            />
            <button
              aria-label={
                showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="cursor-pointer absolute right-4 top-[52px] transform -translate-y-1/2 text-gray-600"
              onClick={() => setShowNewPassword((prev) => !prev)}
              type="button"
            >
              {showNewPassword ? <FaEyeSlash size={23} /> : <FaEye size={23} />}
            </button>
            {passwordErrors.newPassword && (
              <p className="text-red-500 text-sm mt-2 ml-1">
                {passwordErrors.newPassword.message}
              </p>
            )}
            <p className="mt-2 text-sm text-base-content/60">
              La contraseña debe tener entre 6 y 30 caracteres.
            </p>
          </div>

          <button
            className="btn btn-primary"
            disabled={isPasswordSubmitting}
            type="submit"
          >
            {isPasswordSubmitting ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;