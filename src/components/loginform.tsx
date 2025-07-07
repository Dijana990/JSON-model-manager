import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './loginform.module.scss'

interface Props {
  onFlip: () => void
}

function isEmail(str: string) {
  return str.includes('@')
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateUsername(username: string) {
  return /^[a-zA-Z0-9]+$/.test(username)
}

function validatePassword(password: string) {
  return password.length >= 6 && password.length <= 20
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

export default function LoginForm({ onFlip }: Props) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [identifierError, setIdentifierError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (alertMessage) {
      setIsVisible(true)
      const hideTimer = setTimeout(() => setIsVisible(false), 2500)
      const clearTimer = setTimeout(() => setAlertMessage(''), 3000)
      return () => {
        clearTimeout(hideTimer)
        clearTimeout(clearTimer)
      }
    }
  }, [alertMessage])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let isValid = true

    if (isEmail(identifier)) {
      if (!validateEmail(identifier)) {
        setIdentifierError('Invalid email format')
        isValid = false
      } else {
        setIdentifierError('')
      }
    } else {
      if (!validateUsername(identifier)) {
        setIdentifierError('Username must be alphanumeric')
        isValid = false
      } else {
        setIdentifierError('')
      }
    }

    if (!validatePassword(password)) {
      setPasswordError('Password must be 6–20 characters long')
      isValid = false
    } else {
      setPasswordError('')
    }

    if (isValid) {
      fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
        .then((res) => res.json())
        .then((data) => {

          if (data.access_token) {
            localStorage.setItem('token', data.access_token)
            const payload = parseJwt(data.access_token)
            const role = payload?.sub?.role

            if (role) {
              localStorage.setItem('userRole', role)
              setAlertMessage(`Login successful as ${role.toUpperCase()}`)
              setTimeout(() => navigate('/dashboard'), 1500)
            } else {
              setAlertMessage('Login successful, but role is missing in token')
            }
          } else {
            setAlertMessage(data.error || 'Invalid credentials')
          }
        })
        .catch((err) => {
          console.error('Login error:', err)
          setAlertMessage('Server error')
        })
    }
  }

  const isSuccess = alertMessage.toLowerCase().includes('login successful')

  return (
    <>
      <div className={styles.wrapper}>
        {alertMessage && (
          <div
            className={`${styles.alertBox} ${isSuccess ? styles.success : styles.error} ${
              !isVisible ? styles.alertHidden : ''
            }`}
          >
            {alertMessage}
          </div>
        )}

        <div className={styles.container}>
          <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
            <h2 className={styles.title}>Login to your account</h2>

            <label className={styles.label}>
              Enter username or email:
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              {identifierError && <span className={styles.error}>{identifierError}</span>}
            </label>

            <label className={styles.label}>
              Password:
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {passwordError && <span className={styles.error}>{passwordError}</span>}
            </label>

            <button type="submit" className={styles.button}>SIGN IN</button>

            <div className={styles.links}>
              <a href="#" onClick={(e) => { e.preventDefault(); onFlip(); }}>
                Don’t have an account? <span>Sign up here.</span>
              </a>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
