import { Route, Routes } from 'react-router-dom'
import { KioskPage } from '../features/KioskPage'
import { AdminPage } from '../admin/AdminPage'
import { AdminLoginPage } from '../admin/AdminLoginPage'
import { AddProductPage } from '../admin/AddProductPage'
import { AdminAccessProvider } from '../admin/useAdminAccess'
import { AdminLayout } from '../admin/AdminLayout'

export function App() {
  return <Routes>
    <Route path="/" element={<KioskPage />} />
    <Route element={<AdminAccessProvider />}>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminPage />} />
        <Route path="products/new" element={<AddProductPage />} />
      </Route>
    </Route>
    <Route path="*" element={<KioskPage />} />
  </Routes>
}
