import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import MusicTheory from "./pages/MusicTheory";
import AiStudio from "./pages/AiStudio";
import Samples from "./pages/Samples";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/theory" element={<MusicTheory />} />
        <Route path="/library" element={<Library />} />
        <Route path="/ai-studio" element={<AiStudio />} />
        <Route path="/samples" element={<Samples />} />
      </Route>
    </Routes>
  );
}
