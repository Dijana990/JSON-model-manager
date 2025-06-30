import { useRef, useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import LoginPage from './pages/loginpage'
import DashboardPage from './pages/dashboardPage'
import GraphicalModelViewer from './pages/GraphicalModelViewer'
import ProtectedRoute from './routes/ProtectedRoute'
import styles from './components/loginform.module.scss'
// @ts-ignore
import NET from "vanta/dist/vanta.net.min";
import * as THREE from 'three'

function App() {
  const location = useLocation()
  const vantaRef = useRef<HTMLDivElement>(null)
  const [vantaEffect, setVantaEffect] = useState<any>(null)

  useEffect(() => {
    if (location.pathname === '/login' && !vantaEffect && vantaRef.current) {
      setVantaEffect(
        NET({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          backgroundColor: 0x5B88B2,
          color: 0xFF0000,
          points: 15.0,
          maxDistance: 25.0,
          spacing: 20.0,
          vertexColors: false
        })
      )
    }
    if (location.pathname !== '/login' && vantaEffect) {
      vantaEffect.destroy()
      setVantaEffect(null)
    }
  }, [location.pathname, vantaEffect])

  return (
    <>
      {location.pathname === '/login' && (
        <div ref={vantaRef} className={styles.animatedBg} />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/viewer"
          element={
            <ProtectedRoute>
              <GraphicalModelViewer />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App
