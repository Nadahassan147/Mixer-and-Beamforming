import React, { useState, useRef } from 'react';
import './CSS_files/mixer.css';
import { CiImageOn,CiHome  } from "react-icons/ci";
import { useNavigate } from 'react-router-dom';



function Mixer() {
  const navigate = useNavigate();
  const [images, setImages] = useState([null, null, null, null]);
  const [componentImages, setComponentImages] = useState([
    { magnitude: null, phase: null, real: null, imaginary: null },
    { magnitude: null, phase: null, real: null, imaginary: null },
    { magnitude: null, phase: null, real: null, imaginary: null },
    { magnitude: null, phase: null, real: null, imaginary: null }
  ]);
  const [componentViews, setComponentViews] = useState(['magnitude', 'magnitude', 'magnitude', 'magnitude']);
  const [outputs, setOutputs] = useState([null, null]);
  const [outputViews, setOutputViews] = useState(['magnitude', 'magnitude']);
  const [magnitudeWeights, setMagnitudeWeights] = useState([50, 50, 50, 50]);
  const [phaseWeights, setPhaseWeights] = useState([50, 50, 50, 50]);
  const [mixedComponents, setMixedComponents] = useState([null, null]);
  const [selectedOutputPort, setSelectedOutputPort] = useState(0);
  const [mixingMode, setMixingMode] = useState('mag_phase');
  const [controlMode, setControlMode] = useState('mode1'); // 'mode1' or 'mode2'
  
  // Region selection state (unified for all images)
  const [rectangle, setRectangle] = useState(null); // { x, y, width, height } in percentage
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [regionType, setRegionType] = useState('inner'); // 'inner' or 'outer'
  const [inputAdjustments, setInputAdjustments] = useState([
      { brightness: 0, contrast: 0 },
      { brightness: 0, contrast: 0 },
      { brightness: 0, contrast: 0 },
      { brightness: 0, contrast: 0 }
    ]);
    const [outputAdjustments, setOutputAdjustments] = useState([
      { brightness: 0, contrast: 0 },
      { brightness: 0, contrast: 0 }
    ]);
  
  // Track dragging state for brightness/contrast
  const [dragState, setDragState] = useState(null);
  const canvasRefs = useRef({});

  //_________________________________________________________________________________________
  const convertToGrayscale = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data and convert to grayscale
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
      img.src = imageSrc;
    });
  };
//_________________________________________________________________________________________
   const applyBrightnessContrast = (imageSrc, brightness, contrast) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply brightness and contrast adjustments
        // brightness: -100 to 100, contrast: -100 to 100
        const brightnessAdjust = brightness / 100;
        const contrastFactor = (contrast + 100) / 100;
        
        for (let i = 0; i < data.length; i += 4) {
          // Apply contrast first (shifts values around 128)
          let r = data[i] * contrastFactor - (128 * (contrastFactor - 1));
          let g = data[i + 1] * contrastFactor - (128 * (contrastFactor - 1));
          let b = data[i + 2] * contrastFactor - (128 * (contrastFactor - 1));
          
          // Then apply brightness
          r = r + (brightnessAdjust * 255);
          g = g + (brightnessAdjust * 255);
          b = b + (brightnessAdjust * 255);
          
          // Clamp values between 0 and 255
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
      img.src = imageSrc;
    });
  };

  //_________________________________________________________________________________________

  const handleImageUpload = async (index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        // Convert to grayscale immediately for display
        const grayscaleImage = await convertToGrayscale(e.target.result);
        const newImages = [...images];
        newImages[index] = grayscaleImage;
        setImages(newImages);
        
        // Send to backend to compute FFT components
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('index', String(index));

          const response = await fetch('http://localhost:5000/api/process-image', {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          
          // Update component images with FFT components from backend
          const newComponentImages = [...componentImages];
          newComponentImages[index] = {
            magnitude: data.magnitude,
            phase: data.phase,
            real: data.real,
            imaginary: data.imaginary
          };
          setComponentImages(newComponentImages);
        } catch (error) {
          console.error('Error processing image:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComponentViewChange = (index, value) => {
    const newViews = [...componentViews];
    newViews[index] = value;
    setComponentViews(newViews);
  };

  const handleOutputViewChange = (index, value) => {
    const newViews = [...outputViews];
    newViews[index] = value;
    setOutputViews(newViews);
  };

  const handleRegionMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setStartPoint({ x, y });
    setIsDrawing(true);
  };

  const handleRegionMouseMove = (e) => {
    if (!isDrawing || !startPoint) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);
    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    
    setRectangle({ x, y, width, height });
  };

  

  const handleRegionMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearRegion = () => {
    setRectangle(null);
    setStartPoint(null);
  };

  // Brightness/Contrast adjustment handlers
  const handleBrightnessMouseDown = (e, viewportType, index) => {
    if (e.button !== 0) return; // Only left mouse button
    
    setDragState({
      viewportType,
      index,
      startX: e.clientX,
      startY: e.clientY,
      initialBrightness: viewportType === 'input' ? inputAdjustments[index].brightness : outputAdjustments[index].brightness,
      initialContrast: viewportType === 'input' ? inputAdjustments[index].contrast : outputAdjustments[index].contrast
    });
    e.preventDefault();
  };

  const handleBrightnessMouseMove = (e) => {
    if (!dragState) return;
    
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // X movement affects contrast (left/right)
    // Y movement affects brightness (up/down)
    const newContrast = Math.max(-100, Math.min(100, dragState.initialContrast + deltaX / 2));
    const newBrightness = Math.max(-100, Math.min(100, dragState.initialBrightness - deltaY / 2));
    
    if (dragState.viewportType === 'input') {
      const newAdjustments = [...inputAdjustments];
      newAdjustments[dragState.index] = { brightness: newBrightness, contrast: newContrast };
      setInputAdjustments(newAdjustments);
    } else {
      const newAdjustments = [...outputAdjustments];
      newAdjustments[dragState.index] = { brightness: newBrightness, contrast: newContrast };
      setOutputAdjustments(newAdjustments);
    }
  };

  const handleBrightnessMouseUp = () => {
    setDragState(null);
  };

  const handleResetBrightness = (index) => {
    const newAdjustments = [...inputAdjustments];
    newAdjustments[index] = { brightness: 0, contrast: 0 };
    setInputAdjustments(newAdjustments);
  };

  const handleResetOutputBrightness = (index) => {
    const newAdjustments = [...outputAdjustments];
    newAdjustments[index] = { brightness: 0, contrast: 0 };
    setOutputAdjustments(newAdjustments);
  };
//________________________________________________________________________________________
  const handleMixImages = async () => {
    // Send current slider weights to backend
    try {
      const payload = {
        magnitudeWeights,
        phaseWeights,
        mixingMode: mixingMode
      };

      const res = await fetch('http://localhost:5000/api/set-weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log('Weights saved:', data);
    } catch (err) {
      console.error('Failed to send weights', err);
    }

    // Request mixed image from backend and show in selected output port
    try {
      const mixRes = await fetch('http://localhost:5000/api/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mixingMode: mixingMode,
          rectangle: rectangle,
          regionType: regionType
        })
      });
      const mixData = await mixRes.json();
      if (mixData.mixed) {
        const nextOut = [...outputs];
        nextOut[selectedOutputPort] = mixData.mixed;
        setOutputs(nextOut);
        setMixedComponents(prev => {
          const next = [...prev];
          next[selectedOutputPort] = {
            magnitude: mixData.magnitude,
            phase: mixData.phase,
            real: mixData.real,
            imaginary: mixData.imaginary
          };
          return next;
        });
        console.log('successed to mix images', mixData);
      } else {
        console.warn('Mix returned no image', mixData);
      }
    } catch (err) {
      console.error('Failed to fetch mixed image', err);
    }
  };
//________________________________________________________________________________________
  const renderViewport = (image, viewType, label = '', showRegion = false, viewportType = null, index = null) => {
    const adjustments = viewportType === 'input' ? inputAdjustments[index] : (viewportType === 'output' ? outputAdjustments[index] : null);
    
    return (
      <div className="viewport-wrapper">
        <div 
          className="viewport" 
          style={{ position: 'relative', cursor: showRegion ? 'crosshair' : (viewportType ? 'grab' : 'default') }}
          onMouseDown={showRegion ? handleRegionMouseDown : undefined}
          onMouseMove={showRegion ? handleRegionMouseMove : undefined}
          onMouseUp={showRegion ? handleRegionMouseUp : undefined}
          onMouseLeave={showRegion ? handleRegionMouseUp : undefined}
        >
          {image ? (
            <>
              <img 
                src={image} 
                alt={label} 
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  height: '100%', 
                  pointerEvents: 'none',
                  filter: adjustments ? `brightness(${100 + adjustments.brightness}%) contrast(${100 + adjustments.contrast}%)` : 'none'
                }} 
              />
              {showRegion && rectangle && (
                <>
                  {/* Rectangle border */}
                  <div 
                    style={{
                      position: 'absolute',
                      left: `${rectangle.x}%`,
                      top: `${rectangle.y}%`,
                      width: `${rectangle.width}%`,
                      height: `${rectangle.height}%`,
                      border: '2px solid #633abbff',
                      backgroundColor: regionType === 'inner' ? 'rgba(165, 133, 235, 0.36)' : 'transparent',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  />
                  {/* Outer region overlay for 'outer' type */}
                  {regionType === 'outer' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(165, 133, 235, 0.36)',
                        pointerEvents: 'none',
                        zIndex: 9,
                        clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rectangle.x}% ${rectangle.y}%, ${rectangle.x}% ${rectangle.y + rectangle.height}%, ${rectangle.x + rectangle.width}% ${rectangle.y + rectangle.height}%, ${rectangle.x + rectangle.width}% ${rectangle.y}%, ${rectangle.x}% ${rectangle.y}%)`
                      }}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <div className="placeholder">{viewType}</div>
          )}
        </div>
        {label && <div className="viewport-label">{label}</div>}
      </div>
    );
  };

  return (
    <div 
      className="mixer-container"
      onMouseMove={handleBrightnessMouseMove}
      onMouseUp={handleBrightnessMouseUp}
      onMouseLeave={handleBrightnessMouseUp}
    >
      <header className="mixer-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <CiHome 
            onClick={() => navigate('/')}
            style={{ position: 'absolute', left: '1rem', fontSize: '2.0rem', cursor: 'pointer',color:"#9b7fd7" }}
          />
          <h1>Image Mixer</h1>
        </div>
      </header>

      

      {/* Viewports Grid */}
      <div className="viewports-grid">
        {/* Input Images Section - 2x2 Grid */}
        <div className="inputs-grid">
          {[0, 1, 2, 3].map((index) => (
            <div key={`input-${index}`} className="image-pair">
              <div className="viewport-wrapper">
                <div className="viewport-label">Image {index + 1}</div>
                <div 
                  className={`viewport input-viewport ${dragState && dragState.viewportType === 'input' && dragState.index === index ? 'dragging' : ''}`}
                  onDoubleClick={() => document.getElementById(`file-input-${index}`).click()}
                  onMouseDown={(e) => handleBrightnessMouseDown(e, 'input', index)}
                  style={{ cursor: dragState && dragState.viewportType === 'input' && dragState.index === index ? 'grabbing' : 'grab', position: 'relative' }}
                >
                  <input
                    id={`file-input-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(index, e)}
                    style={{ display: 'none' }}
                  />
                  {images[index] ? (
                    <img 
                      src={images[index]} 
                      alt={`Input ${index + 1}`}
                      style={{
                        filter: inputAdjustments[index] ? `brightness(${100 + inputAdjustments[index].brightness}%) contrast(${100 + inputAdjustments[index].contrast}%)` : 'none',
                        pointerEvents: 'none'
                      }}
                    />
                  ) : (
                    <div className="upload-text">
                      <span className="upload-icon"><CiImageOn /></span>
                      <span>Upload</span>
                    </div>
                  )}
                  <button 
                    className="reset-button-corner"
                    onClick={(e) => { e.stopPropagation(); handleResetBrightness(index); }}
                    title="Reset brightness"
                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(107, 70, 168, 0.8)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: '14px', zIndex: 10 }}
                  >
                    ↻
                  </button>
                </div>
              </div>

              <div className="viewport-wrapper">
                <select
                  className="component-selector"
                  value={componentViews[index]}
                  onChange={(e) => handleComponentViewChange(index, e.target.value)}
                >
                  <option value="magnitude">Magnitude</option>
                  <option value="phase">Phase</option>
                  <option value="real">Real</option>
                  <option value="imaginary">Imaginary</option>
                </select>
                {renderViewport(componentImages[index][componentViews[index]], componentViews[index], '', controlMode === 'mode2', null, index)}
              </div>
            </div>
          ))}
        </div>

        {/* Output Section - Stacked Vertically */}
        <div className="outputs-grid">
          {[0, 1].map((index) => (
            <div key={`output-${index}`} className="image-pair output-pair">
              <div className="viewport-wrapper">
                <div className="viewport-label"></div>
                <div 
                  className={`viewport output-viewport ${dragState && dragState.viewportType === 'output' && dragState.index === index ? 'dragging' : ''}`}
                  onMouseDown={(e) => handleBrightnessMouseDown(e, 'output', index)}
                  style={{ cursor: dragState && dragState.viewportType === 'output' && dragState.index === index ? 'grabbing' : 'grab', position: 'relative' }}
                >
                  {outputs[index] ? (
                    <>
                      <img 
                        src={outputs[index]} 
                        alt={`Output ${index + 1}`}
                        style={{
                          filter: outputAdjustments[index] ? `brightness(${100 + outputAdjustments[index].brightness}%) contrast(${100 + outputAdjustments[index].contrast}%)` : 'none',
                          pointerEvents: 'none'
                        }}
                      />
                      <button 
                        className="reset-button-corner"
                        onClick={(e) => { e.stopPropagation(); handleResetOutputBrightness(index); }}
                        title="Reset brightness"
                        style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(107, 70, 168, 0.8)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: '14px', zIndex: 10 }}
                      >
                        ↻
                      </button>
                    </>
                  ) : (
                    <div className="placeholder output-placeholder">
                      Output Port {index + 1}
                    </div>
                  )}
                </div>
              </div>

              <div className="viewport-wrapper">
                <select
                  className="component-selector"
                  value={outputViews[index]}
                  onChange={(e) => handleOutputViewChange(index, e.target.value)}
                >
                  <option value="magnitude">Magnitude</option>
                  <option value="phase">Phase</option>
                  <option value="real">Real</option>
                  <option value="imaginary">Imaginary</option>
                </select>
                {renderViewport(mixedComponents[index] ? mixedComponents[index][outputViews[index]] : null, outputViews[index], '', false, null, index)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sliders Section */}
      <div className="sliders-section">
        {/* Control Mode Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.3rem 0', justifyContent: 'center' }}>
          {[
            { value: 'mode1', label: 'Mode 1' },
            { value: 'mode2', label: 'Mode 2 (region)' }
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setControlMode(mode.value)}
              style={{
                padding: '0.4rem 1rem',
                background: controlMode === mode.value ? '#6b46a8' : 'rgba(107, 70, 168, 0.3)',
                border: '1px solid #6b46a8',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem',
                minWidth: '150px',
                transition: 'all 0.2s'
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
        
        <div className="sliders-grid">
          <div className="slider-column">
            <h3>{mixingMode === 'mag_phase' ? 'Magnitude' : 'Real'}</h3>
            {[0, 1, 2, 3].map((i) => (
              <div key={`mag-${i}`} className="slider-row">
                <label>Image {i + 1}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={magnitudeWeights[i]}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    const next = [...magnitudeWeights];
                    next[i] = v;
                    setMagnitudeWeights(next);
                  }}
                />
              </div>
            ))}
            
            {controlMode === 'mode2' && (
              <>
                <h3 style={{ marginTop: '1rem' }}>Region Selection</h3>
                <div className="slider-row" style={{ alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label>Region Type</label>
                    <select 
                      value={regionType}
                      onChange={(e) => setRegionType(e.target.value)}
                      style={{ width: '100%', padding: '0.3rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #6b46a8', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }}
                    >
                      <option value="inner">Inner (Low Freq)</option>
                      <option value="outer">Outer (High Freq)</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleClearRegion}
                    style={{ padding: '0.4rem 1rem', background: '#6b46a8', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', marginLeft: '0.5rem' }}
                  >
                    Clear Region
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="slider-column">
            <h3>{mixingMode === 'mag_phase' ? 'Phase' : 'Imaginary'}</h3>
            {[0, 1, 2, 3].map((i) => (
              <div key={`phase-${i}`} className="slider-row">
                <label>Image {i + 1}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={phaseWeights[i]}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    const next = [...phaseWeights];
                    next[i] = v;
                    setPhaseWeights(next);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="slider-column">
            <h4 style={{ marginTop: '1rem' }}>Mixing Mode</h4>
            <select 
              className="mixing-mode-select"
              value={mixingMode}
              onChange={(e) => setMixingMode(e.target.value)}
            >
              <option value="mag_phase">Magnitude and Phase</option>
              <option value="real_imag">Real and Imaginary</option>
            </select>
            
            <h4 style={{ marginTop: '1rem' }}>Output Port</h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select 
                value={selectedOutputPort === 0 ? 'Output View Port 1' : 'Output View Port 2'}
                onChange={(e) => setSelectedOutputPort(e.target.value === 'Output View Port 1' ? 0 : 1)}
                style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #6b46a8', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
              >
                <option>Output View Port 1</option>
                <option>Output View Port 2</option>
              </select>
              <button className="btn-primary" onClick={handleMixImages}>Mix Images</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Mixer;