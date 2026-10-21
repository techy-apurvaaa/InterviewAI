import axios from "axios"

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true
})

// NOTE: these functions no longer swallow errors. They throw, so the caller can
// tell "login failed" apart from "login worked" (before, a failed call returned
// undefined and the app navigated to "/" anyway, which bounced you back to /login).

export async function register({ username, email, password }) {
    const response = await api.post('/api/auth/register', {
        username, email, password
    })
    return response.data
}

export async function login({ email, password }) {
    const response = await api.post("/api/auth/login", {
        email, password
    })
    return response.data
}

export async function logout() {
    const response = await api.get("/api/auth/logout")
    return response.data
}

export async function getMe() {
    const response = await api.get("/api/auth/get-me")
    return response.data
}
