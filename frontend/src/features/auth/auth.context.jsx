/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null)
    // `loading` = "are we still checking if there is a logged-in session?"
    const [loading, setLoading] = useState(true)

    // Runs once when the app starts (not once per component that uses useAuth)
    useEffect(() => {
        let active = true

        getMe()
            .then((data) => { if (active) setUser(data?.user ?? null) })
            .catch(() => { if (active) setUser(null) })   // 401 = not logged in, that's fine
            .finally(() => { if (active) setLoading(false) })

        return () => { active = false }
    }, [])

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }} >
            {children}
        </AuthContext.Provider>
    )
}
