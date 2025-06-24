import { useState } from 'react'
import styles from './loginform.module.scss'

interface Props {
  onFlip: () => void
}

export default function SignUpForm({ onFlip }: Props) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [usernameError, setUsernameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value)
    setUsernameError('')
  }
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setEmailError('')
  }
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setPasswordError('')
  }
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
    setConfirmError('')
  }

  const validateUsername = (value: string): boolean => {
    const regex = /^[a-zA-Z0-9]+$/
    return regex.test(value)
  }

  const validateEmail = (value: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(value)
  }

  const validatePassword = (value: string): boolean => {
    return value.length >= 6 && value.length <= 20
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let isValid = true

    if (!validateUsername(username)) {
      setUsernameError('Username can only contain letters and numbers')
      isValid = false
    }

    if (!validateEmail(email)) {
      setEmailError('Invalid email format')
      isValid = false
    }

    if (!validatePassword(password)) {
      setPasswordError('Password must be 6-20 characters long')
      isValid = false
    }

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      isValid = false
    }

    if (isValid) {
      console.log('Sign up:', { username, email, password })
      onFlip()
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
        <h2 className={styles.title}>Sign Up</h2>

        <label className={styles.label}>
          Username:
          <input
            type="text"
            placeholder="korisnik123"
            value={username}
            onChange={handleUsernameChange}
            required
            autoComplete="off"
          />
          {usernameError && <span className={styles.error}>{usernameError}</span>}
        </label>

        <label className={styles.label}>
          Email:
          <input
            type="email"
            placeholder="korisnik@mail.com"
            value={email}
            onChange={handleEmailChange}
            required
            autoComplete="off"
          />
          {emailError && <span className={styles.error}>{emailError}</span>}
        </label>

        <label className={styles.label}>
          Password:
          <input
            type="password"
            placeholder="******"
            value={password}
            onChange={handlePasswordChange}
            required
            autoComplete="new-password"
          />
          {passwordError && <span className={styles.error}>{passwordError}</span>}
        </label>

        <label className={styles.label}>
          Confirm Password:
          <input
            type="password"
            placeholder="******"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
            autoComplete="new-password"
          />
          {confirmError && <span className={styles.error}>{confirmError}</span>}
        </label>

        <button type="submit" className={styles.button}>SIGN UP</button>

        <div className={styles.links}>
          <a href="#" onClick={(e) => { e.preventDefault(); onFlip(); }}>
            Already have an account? <span>Sign in.</span>
          </a>
        </div>
      </form>
    </div>
  )
}