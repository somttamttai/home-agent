import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import Receipt from './pages/Receipt.jsx'
import PriceCompare from './pages/PriceCompare.jsx'
import Add from './pages/Add.jsx'
import TabBar from './components/TabBar.jsx'
import { ToastProvider } from './components/Toast.jsx'

export default function App() {
  return (
    <ToastProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/add" element={<Add />} />
          <Route path="/compare" element={<PriceCompare />} />
          <Route path="/receipt" element={<Receipt />} />
        </Routes>
        <TabBar />
      </div>
    </ToastProvider>
  )
}
