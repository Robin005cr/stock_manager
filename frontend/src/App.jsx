import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import EditExisting from './pages/EditExisting';
import Entry from './pages/Entry';
import Login from './pages/Login';
import Metadata from './pages/Metadata';
import PinnedProducts from './pages/PinnedProducts';
import Search from './pages/Search';
import StockBooking from './pages/StockBooking';
import TransportMovement from './pages/TransportMovement';
import { getSessionUser, hasSession } from './api/auth';
import { PinnedProductsProvider } from './state/PinnedProductsContext';
import './styles/global.css';

function RequireAuth() {
  return hasSession() ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireAdmin() {
  return getSessionUser()?.role === 'admin' ? <Outlet /> : <Navigate to="/search" replace />;
}

export default function App() {
  return (
    <PinnedProductsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={hasSession() ? <Navigate to="/search" replace /> : <Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/search" element={<Search />} />
              <Route path="/pinned-products" element={<PinnedProducts />} />
              <Route element={<RequireAdmin />}>
                <Route path="/" element={<Entry />} />
                <Route path="/transport-movement" element={<TransportMovement />} />
                <Route path="/stock-booking" element={<StockBooking />} />
                <Route path="/edit-existing" element={<EditExisting />} />
                <Route path="/edit-existing/:id" element={<EditExisting />} />
                <Route path="/meta-details" element={<Metadata />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </PinnedProductsProvider>
  );
}
