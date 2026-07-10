// App.jsx — root component
// Routing and page components fully built in Phase 7 & 8.
// Stub kept minimal so client boots during Phase 0 verification.
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <p className="p-8 text-2xl font-bold">
          CodeNest — Phase 0 scaffold complete ✓
        </p>
      </div>
    </AuthProvider>
  )
}

export default App
