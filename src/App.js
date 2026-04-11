import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./home";
import Mixer from "./mixer";
import Beamforming from "./beamforming";
import { AppStateProvider } from "./AppStateContext";
function App() {

  return (
    <AppStateProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mixer" element={<Mixer />} />
          <Route path="/beamforming" element={<Beamforming />} />
        </Routes>
      </Router>
    </AppStateProvider>
  );
}

export default App;