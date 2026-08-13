import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Entry from './pages/Entry';
import Login from './pages/Login';
import Search from './pages/Search';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Entry />} />
        <Route path="/search" element={<Search />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
