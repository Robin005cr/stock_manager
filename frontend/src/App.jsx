import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Entry from './pages/Entry';
import EditExisting from './pages/EditExisting';
import Login from './pages/Login';
import Metadata from './pages/Metadata';
import PinnedProducts from './pages/PinnedProducts';
import Search from './pages/Search';
import { PinnedProductsProvider } from './state/PinnedProductsContext';
import './styles/global.css';

export default function App() {
  return (
    <PinnedProductsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Entry />} />
            <Route path="/search" element={<Search />} />
            <Route path="/edit-existing" element={<EditExisting />} />
            <Route path="/edit-existing/:id" element={<EditExisting />} />
            <Route path="/pinned-products" element={<PinnedProducts />} />
            <Route path="/meta-details" element={<Metadata />} />
            <Route path="/login" element={<Login />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PinnedProductsProvider>
  );
}
