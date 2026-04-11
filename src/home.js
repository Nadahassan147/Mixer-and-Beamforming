import { useNavigate } from "react-router-dom";
import "./CSS_files/home.css";
import { RiImageCircleAiFill } from "react-icons/ri";
import { IoIosRadio } from "react-icons/io";



function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="home-container">
        <div className="home-header">
          <h1 className="home-title">TOP Mixer</h1>
          <p className="home-subtitle">Visualize and analyze your signal data </p>
        </div>

        <div className="cards-container">
          <div className="signal-card medical-card" onClick={() => navigate("/mixer")}>
            <div className="card-icon">
              <RiImageCircleAiFill  size={60} />
            </div>
            <h2 className="card-title">Image Mixer</h2>

          </div>

          <div className="signal-card sound-card" onClick={() => navigate("/beamforming")}>
            <div className="card-icon">
              <IoIosRadio size={60} />
            </div>
            <h2 className="card-title">Beamforming Simulator</h2>

          </div>
        </div>

        <footer className="home-footer">
          <p>Choose a mode type to get started</p>
        </footer>
      </div>
    </div>
  );
}

export default Home;