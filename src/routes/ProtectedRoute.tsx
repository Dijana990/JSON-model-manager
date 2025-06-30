import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp
    if (!exp) return false

    const currentTime = Math.floor(Date.now() / 1000)
    return exp > currentTime
  } catch {
    return false
  }
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const valid = isTokenValid(token)
    if (!valid) localStorage.removeItem('token')
    setIsValid(valid)
    setIsChecking(false)
  }, [])

  if (isChecking) {
    return <div>Loading...</div> // ili spinner ako želiš
  }

  if (!isValid) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
