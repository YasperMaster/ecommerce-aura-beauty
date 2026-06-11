import axios from "axios"

const API_URL = import.meta.env.VITE_BACKEND_URL + "/auth"

axios.defaults.withCredentials = true

export const getProfileService = async () => {
    try {
        const response = await axios.get(`${API_URL}/profile`)
        return response.data
    } catch (error) {
        console.log(error)
        throw new Error("Error al obtener el perfil")
    }
}

export const loginService = async () => {

}

export const registerService = async (data, reset, setRedirect, checkSession) => {
    try {
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