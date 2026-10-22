import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import KatalogPage from "../Pages/Katalog/KatalogPage";
import CekPesananPage from "../Pages/Katalog/CekPesananPage";
import ProfilPage from "../Pages/Profil/ProfilPage";
import { getSession } from "../Utils/Helpers/AuthHelpers";


const Private = ({ children }) => (getSession() ? children : <Navigate to="/" replace />);

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<KatalogPage />} />
        <Route path="/cek" element={<CekPesananPage />} />
        <Route path="/permohonan" element={<Navigate to="/profil" replace />} />
        <Route path="/kelola" element={<Navigate to="/profil" replace />} />
        <Route path="/profil" element={<Private><ProfilPage /></Private>} />
        <Route path="/admin" element={<Navigate to="/profil" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
