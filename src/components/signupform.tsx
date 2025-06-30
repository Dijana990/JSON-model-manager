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
  const [role, setRole] = useState('viewer')

  const [usernameError, setUsernameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let isValid = true

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setUsernameError('Username can only contain letters and numbers')
      isValid = false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email format')
      isValid = false
    }

    if (password.length < 6 || password.length > 20) {
      setPasswordError('Password must be 6–20 characters long')
      isValid = false
    }

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      isValid = false
    }

    if (isValid) {
      fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.message === "User created successfully") {
            alert("Signup successful!")
            onFlip()
          } else {
            alert(data.error || "Signup failed")
          }
        })
        .catch(() => alert("Signup failed - server error"))
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
            value={username}
            onChange={(e) => { setUsername(e.target.value); setUsernameError('') }}
            required
          />
          {usernameError && <span className={styles.error}>{usernameError}</span>}
        </label>

        <label className={styles.label}>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
            required
          />
          {emailError && <span className={styles.error}>{emailError}</span>}
        </label>

        <label className={styles.label}>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
            required
          />
          {passwordError && <span className={styles.error}>{passwordError}</span>}
        </label>

        <label className={styles.label}>
          Confirm Password:
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError('') }}
            required
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
