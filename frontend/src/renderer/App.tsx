import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import SampleAnalyzer from "./pages/SampleAnalyzer";
import TheoryEngine from "./pages/TheoryEngine";
import ChordGenerator from "./pages/ChordGenerator";
import ProducerChat from "./pages/ProducerChat";
import WhyDoesThisSoundGood from "./pages/WhyDoesThisSoundGood";
import FinishMyIdea from "./pages/FinishMyIdea";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analyze" element={<SampleAnalyzer />} />
        <Route path="/theory" element={<TheoryEngine />} />
        <Route path="/chords" element={<ChordGenerator />} />
        <Route path="/chat" element={<ProducerChat />} />
        <Route path="/why" element={<WhyDoesThisSoundGood />} />
        <Route path="/finish" element={<FinishMyIdea />} />
      </Route>
    </Routes>
  );
}
