import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { CategoriesProvider } from './hooks/useCategories.jsx'
import { ConsumablesProvider } from './hooks/useConsumables.jsx'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import Receipt from './pages/Receipt.jsx'
import PriceCompare from './pages/PriceCompare.jsx'
import Add from './pages/Add.jsx'
import CategoryDetail from './pages/CategoryDetail.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import HouseholdSetup from './pages/HouseholdSetup.jsx'
import InviteCode from './pages/InviteCode.jsx'
import Onboarding from './pages/Onboarding.jsx'
import TabBar from './components/TabBar.jsx'
import { ToastProvider } from './components/Toast.jsx'

function AppRoutes() {
  const { session, household, loading } = useAuth()

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-content">
          <div className="login-logo">🏠</div>
          <p style={{ color: 'var(--text-sub)', marginTop: 16 }}>불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Login />
  if (!household) return <HouseholdSetup />
  if (!household.onboarded) return <Onboarding />

  return (
    <CategoriesProvider>
      <ConsumablesProvider>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/add" element={<Add />} />
            <Route path="/compare" element={<PriceCompare />} />
            <Route path="/receipt" element={<Receipt />} />
            <Route path="/category/:name" element={<CategoryDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/invite" element={<InviteCode />} />
          </Routes>
          <TabBar />
        </div>
      </ConsumablesProvider>
    </CategoriesProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
