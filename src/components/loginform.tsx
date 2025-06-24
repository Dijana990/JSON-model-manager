import { useState } from 'react'
import styles from './loginform.module.scss'
import { useNavigate } from 'react-router-dom'

interface Props {
  onFlip: () => void
}

export default function LoginForm({ onFlip }: Props) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [identifierError, setIdentifierError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const navigate = useNavigate()

  const isEmail = (value: string) => value.includes('@')
  const validateUsername = (value: string) =>
    /^[a-zA-Z0-9]+$/.test(value)
  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  const validatePassword = (value: string) =>
    value.length >= 6 && value.length <= 20

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let isValid = true

    if (isEmail(identifier)) {
      if (!validateEmail(identifier)) {
        setIdentifierError('Invalid format')
        isValid = false
      } else {
        setIdentifierError('')
      }
    } else {
      if (!validateUsername(identifier)) {
        setIdentifierError(
          'Username can only contain letters and numbers'
        )
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
      console.log('Login:', { identifier, password })
      navigate('/dashboard')
    }
  }

  return (
    <>
      {/* Form container */}
      <div className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Login to your account</h2>

          <label className={styles.label}>
            Enter username or email:
            <input
              type="text"
              placeholder="korisnik123 ili korisnik@mail.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            {identifierError && (
              <span className={styles.error}>
                {identifierError}
              </span>
            )}
          </label>

          <label className={styles.label}>
            Password:
            <input
              type="password"
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordError && (
              <span className={styles.error}>
                {passwordError}
              </span>
            )}
          </label>

          <button type="submit" className={styles.button}>
            SIGN IN
          </button>

          <div className={styles.links}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onFlip()
              }}
            >
              Don’t have an account? <span>Sign up here.</span>
            </a>
          </div>
        </form>
        
      </div>
    </>
  )
}