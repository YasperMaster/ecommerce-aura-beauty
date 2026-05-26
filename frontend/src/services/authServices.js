import axios from "axios"

const API_URL = import.meta.env.VITE_BACKEND_URL + "/auth"

axios.defaults.withCredentials = true

export const getProfileService = async () => {
    
}

export const loginService = async () => {

}

export const registerService = async (data, reset, setRedirect, checkSession) => {
    try {
        console.log("Calling:", `${API_URL}/register`)
        const response = await axios.post(`${API_URL}/register`, data, {
            headers: { "Content-Type": "application/json"},
            withCredentials: true,
        })

        console.log("RESPUESTA", response)
        if (response.status === 201 || response.status === 200) {
            alert("Usuario registrado exitosamente")
            reset()
        }
    } catch (error) {
        alert("Error al registrar el usuario")
        console.log(error)
    }   
}

export const logoutService = async () => {
    
}