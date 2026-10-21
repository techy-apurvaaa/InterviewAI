import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout } from "../services/auth.api";

const errorMessage = (err, fallback) =>
    err?.response?.data?.message || (err?.request ? "Cannot reach the server. Is the backend running on port 3000?" : fallback)

export const useAuth = () => {

    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    const { user, setUser, loading } = context

    // each handler returns { success, message } so the page can decide what to do
    const handleLogin = async ({ email, password }) => {
        try {
            const data = await login({ email, password })
            setUser(data.user)
            return { success: true }
        } catch (err) {
            return { success: false, message: errorMessage(err, "Login failed") }
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
            return { success: true }
        } catch (err) {
            return { success: false, message: errorMessage(err, "Registration failed") }
        }
    }

    const handleLogout = async () => {
        try {
            await logout()
        } catch {
            // even if the request fails, clear the local session
        } finally {
            setUser(null)
        }
    }

    return { user, loading, handleRegister, handleLogin, handleLogout }
}
