import axios from "axios"

const API_URL = import.env.VITE_BACKEND + "/auth"

axios.defaults.withCredentials = true

export const getProfileService = async () => {
    
}

export const loginService = async () => {

}

export const registerService = async (data, reset, setRedirect, checkSession) => {
    try {
        const response = await axios.post(`${API_URL}/register`, data, {
            headers: { "Content-Type": "application/json"},
            withCredentials: true,
        })

        if (response.status === 201 || response.status === 200) {
            alert("Usuario registrado exitosamente")
        }
    } catch (error) {
        alert("Error al registrar el usuario")
    }
}

export const logoutService = async () => {
    
}