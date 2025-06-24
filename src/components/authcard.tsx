import { useState } from 'react'
import styles from '../components/authcard.module.scss'
import LoginForm from './loginform'
import SignUpForm from './signupform'

export default function AuthCard() {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    setIsFlipped((prev) => !prev)
  }

  return (
    <div className={styles.scene}>
      <div className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}>
        <div className={styles.front}>
          <LoginForm onFlip={handleFlip} />
        </div>
        <div className={styles.back}>
          <SignUpForm onFlip={handleFlip} />
        </div>
      </div>
    </div>
  )
}
