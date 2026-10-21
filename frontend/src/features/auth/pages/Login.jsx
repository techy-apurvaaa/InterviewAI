import React, { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {
    const { user, loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ error, setError ] = useState("")
    const [ submitting, setSubmitting ] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)
        const result = await handleLogin({ email, password })
        setSubmitting(false)

        if (result.success) {
            navigate('/', { replace: true })
        } else {
            setError(result.message)
        }
    }

    if (loading) {
        return (
            <main className="auth-page">
                <div className="spinner" />
            </main>
        )
    }

    if (user) {
        return <Navigate to="/" replace />
    }

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <span className="brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                    </span>
                    <span>Interview<span className="brand-highlight">AI</span></span>
                </div>

                <div className="auth-header">
                    <h1>Welcome Back</h1>
                    <p>Log in to access your interview strategies</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email"
                            id="email"
                            name='email'
                            placeholder='name@company.com'
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            value={password}
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password"
                            id="password"
                            name='password'
                            placeholder='••••••••'
                            required
                        />
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    <button className='auth-button' disabled={submitting}>
                        {submitting ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p className="auth-switch">
                    Don't have an account? <Link to="/register">Create an account</Link>
                </p>
            </div>
        </main>
    )
}

export default Login
