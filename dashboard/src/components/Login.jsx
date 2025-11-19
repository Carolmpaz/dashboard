import { useState } from 'react'
import Logo from './Logo'
import './Login.css'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Credenciais pré-fixadas
  const FIXED_USERNAME = 'admin'
  const FIXED_PASSWORD = 'admin123'

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
      onLogin()
    } else {
      setError('Usuário ou senha incorretos!')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <Logo />
        </div>
        <div className="login-header">
          <h1>Dashboard Caldeira</h1>
          <p>Distribuidora de Gás</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>

        <div className="login-hint">
          <p>Usuário: <strong>{FIXED_USERNAME}</strong> | Senha: <strong>{FIXED_PASSWORD}</strong></p>
        </div>
      </div>
    </div>
  )
}

export default Login

