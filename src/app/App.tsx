import { Route, Routes } from 'react-router-dom'
import { KioskPage } from '../features/KioskPage'
import { AdminPage } from '../admin/AdminPage'
import { AdminLoginPage } from '../admin/AdminLoginPage'

export function App() {
  return <Routes><Route path="/" element={<KioskPage />} /><Route path="/admin/login" element={<AdminLoginPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<KioskPage />} /></Routes>
}
