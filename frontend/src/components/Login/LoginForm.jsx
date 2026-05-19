import { useState } from "react"
import { useForm } from "react-hook-form"
import { FaEye, FaEyeSlash } from "react-icons/fa"

const LoginForm = () => {
    const { register, handleSubmit, formState: { errors }, reset, } = useForm ({
        mode: "onChange"
    })

    const [showPassword, setShowPassword] = useState(false)

    const onSubmit = (data) => {
        console.log(data)
        reset()
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4 lg:gap-6 max-w-[500px] mx-auto">
            <div>
                <input {...register("email", {
                    required: "Ingresá un correo electrónico.",
                    pattern: {
                        value: /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/,
                        message: "Correo electrónico no valido."
                    },
                    maxLength: {
                        value: 254,
                        message: "Tu correo es demasiado largo, debe tener a lo sumo 254 caracteres."
                    },
                })} className={`p-2 outline-2 rounded border focus:outline-primary w-full ${
                    errors.email
                    ? "border-red-500 outline-red-500 focus:outline-red-500"
                    : ""
                }`} autoComplete="email" name="email" placeholder="Correo electrónico" type="email" />
                {errors.email && (
                    <p className="text-red-500 text-sm mt-2 ml-1">{errors.email.message}</p>
                )}
            </div>
            <div className="relative">
                <input {...register("password", {
                    required: "Ingresá una contraseña.",
                    minLength: {
                        value: 6,
                        message: "La contraseña debe tener al menos 6 caracteres."
                    },
                    maxLength: {
                        value: 30,
                        message: "La contraseña debe tener a lo sumo 30 caracteres."
                    },
                    validate: {
                        numbersMin: (value) => {
                            const Num = (value.match(/\d/g) || []).length;
                            return (
                                Num >= 3 || "La contraseña debe tener al menos 3 números"
                            );
                        },
                    },
                })} className={`p-2 outline-2 rounded border focus:outline-primary w-full ${
                    errors.password
                    ? "border-red-500 outline-red-500 focus:outline-red-500"
                    : ""
                }`} autoComplete="current-password" placeholder="Contraseña" type={showPassword ? "text" : "password"} />
                <button 
                    onClick={() => setShowPassword(prev => !prev)} 
                    aria-label={ showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} 
                    type="button" 
                    className="cursor-pointer absolute right-4 top-[20px] transform -translate-y-1/2 text-gray-600">
                    {showPassword ? (<FaEyeSlash size={23}/>) : (<FaEye size={23}/>)}
                </button>
                {errors.password && (
                    <p className="text-red-500 text-sm mt-2 ml-1">{errors.password.message}</p>
                )}
                <button className="mt-4 btn btn-primary " type="submit">Iniciá sesión</button>
            </div>
        </form>
    )
}

export default LoginForm