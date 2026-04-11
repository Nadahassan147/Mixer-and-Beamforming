import React, { useState, useEffect, useMemo } from 'react';
import './CSS_files/beamforming.css';
import { CiHome } from "react-icons/ci";
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';

function Beamforming() {
  const navigate = useNavigate();
  
  // Arrays Management
  const [arrays, setArrays] = useState([
    {
      id: 1,
      name: 'Array 1',
      position: { x: 0, y: 0 },
      rotation: 0,
      elements: 8,
      spacing: 0.5,
      curvature: 0,
      target: { x: -5.8, y: 6.1 },
      followTarget: true
    }
  ]);
  
  const [selectedArrayId, setSelectedArrayId] = useState(1);
  
  // Beam Control
  const [steeringAngle, setSteeringAngle] = useState(-19);
  const [beamMode, setBeamMode] = useState('acoustic');
  const [frequencyComponents, setFrequencyComponents] = useState([
    { id: 1, frequency: 1, amplitude: 1, phase: 0, unit: 'kHz' }
  ]);
  
  // Scenario Management
  const [selectedScenario, setSelectedScenario] = useState('');
  const [scenarios] = useState([
    { name: '5G Communications', file: '5g.json' },
    { name: 'Ultrasound Imaging', file: 'ultrasound.json' },
    { name: 'Tumor Ablation', file: 'ablation.json' }
  ]);
  
  // Visualization Data
  const [heatmapData, setHeatmapData] = useState(null);
  const [polarData, setPolarData] = useState(null);
  
  // Get selected array
  const selectedArray = arrays.find(arr => arr.id === selectedArrayId);
  
  // Add new array
  const addArray = () => {
    const newId = Math.max(...arrays.map(a => a.id), 0) + 1;
    setArrays([...arrays, {
      id: newId,
      name: `Array ${newId}`,
      position: { x: 0, y: 0 },
      rotation: 0,
      elements: 8,
      spacing: 0.5,
      curvature: 0,
      target: { x: 0, y: 0 },
      followTarget: false
    }]);
    setSelectedArrayId(newId);
  };
  
  // Remove array
  const removeArray = () => {
    if (arrays.length > 1) {
      const newArrays = arrays.filter(arr => arr.id !== selectedArrayId);
      setArrays(newArrays);
      setSelectedArrayId(newArrays[0].id);
    }
  };
  
  // Update array property
  const updateArray = (property, value) => {
    setArrays(arrays.map(arr => 
      arr.id === selectedArrayId 
        ? { ...arr, [property]: value }
        : arr
    ));
  };
  
  // Update nested array property
  const updateArrayNested = (parent, property, value) => {
    setArrays(arrays.map(arr => 
      arr.id === selectedArrayId 
        ? { ...arr, [parent]: { ...arr[parent], [property]: value } }
        : arr
    ));
  };
  
  // Add frequency component
  const addFrequencyComponent = () => {
    const newId = Math.max(...frequencyComponents.map(f => f.id), 0) + 1;
    setFrequencyComponents([...frequencyComponents, {
      id: newId,
      frequency: 1,
      amplitude: 1,
      phase: 0,
      unit: 'kHz'
    }]);
  };
  
  // Remove frequency component
  const removeFrequencyComponent = (id) => {
    if (frequencyComponents.length > 1) {
      setFrequencyComponents(frequencyComponents.filter(f => f.id !== id));
    }
  };
  
  // Update frequency component
  const updateFrequencyComponent = (id, property, value) => {
    setFrequencyComponents(frequencyComponents.map(f =>
      f.id === id ? { ...f, [property]: value } : f
    ));
  };
  
  // Calculate beamforming pattern
  const calculateBeamforming = async () => {
    try {
      // Don't clear previous images - keep them visible until new ones arrive
      const response = await fetch('http://localhost:5000/api/beamforming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrays: arrays,
          steeringAngle: steeringAngle,
          frequencyComponents: frequencyComponents,
          mode: beamMode
        })
      });
      
      const data = await response.json();
      setHeatmapData(data.heatmap);
      setPolarData(data.polar);
    } catch (error) {
      console.error('Error calculating beamforming:', error);
    }
  };
  
  // Load scenario
  const loadScenario = async (scenarioFile) => {
    try {
      const response = await fetch(`http://localhost:5000/api/scenarios/${scenarioFile}`);
      const data = await response.json();
      
      setArrays(data.arrays);
      setSteeringAngle(data.steeringAngle);
      setFrequencyComponents(data.frequencyComponents);
      setBeamMode(data.mode);
      setSelectedArrayId(data.arrays[0].id);
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };
  
  // Save scenario
  const saveScenario = async () => {
    const scenarioData = {
      arrays,
      steeringAngle,
      frequencyComponents,
      mode: beamMode
    };
    
    const blob = new Blob([JSON.stringify(scenarioData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scenario.json';
    link.click();
  };
  
  // Recalculate on parameter changes (with minimal debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateBeamforming();
    }, 150); // Reduced to 150ms for faster response
    
    return () => clearTimeout(timer);
  }, [arrays, steeringAngle, frequencyComponents, beamMode]);
  
  // Generate frequency formula display
  const getFrequencyFormula = () => {
    if (frequencyComponents.length === 0) return '';
    return frequencyComponents.map((f, i) => 
      `${f.amplitude.toFixed(2)}*sin(2π*${f.frequency}*t + ${f.phase}°)`
    ).join(' + ');
  };
  
  return (
    <div className="beamforming">
      <div className="beamforming-container">
        {/* Header */}
        <div className="beamforming-header">
          <CiHome 
            className="home-icon" 
            onClick={() => navigate('/')}
            title="Go to Home"
          />
          <h1>Phased Array Beamforming Simulator</h1>
        </div>
        
        <div className="main-layout">
          {/* Left Control Panel */}
          <div className="control-panel">
{/* Array Manager */}
<div className="control-section">
  <div className="array-manager-header">
    <div className="section-header">Array Manager</div>
    <button onClick={addArray} title="Add Array" className="array-add-btn">Add</button>
  </div>

<div className="array-list">
  {arrays.map(arr => (
    <div key={arr.id} className="array-item-wrapper">
      <div 
        className={`array-item ${arr.id === selectedArrayId ? 'selected' : ''}`}
        onClick={() => setSelectedArrayId(arr.id)}
      >
        {arr.name}
      </div>
      <button 
        className="array-remove-btn"
        onClick={() => removeArray(arr.id)}
        title="Remove"
      >
        ✕
      </button>
    </div>
  ))}

  </div>
</div>


            
            {/* Position and Rotation */}
            {selectedArray && (
              <>
                <div className="control-section">
                  <div className="section-header">Position and Rotation</div>
                  <div className="control-group">
                    <label>X Position:</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={selectedArray.position.x}
                      onChange={(e) => updateArrayNested('position', 'x', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="control-group">
                    <label>Y Position:</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={selectedArray.position.y}
                      onChange={(e) => updateArrayNested('position', 'y', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="control-group">
                    <label>Rotation (°):</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360"
                      value={selectedArray.rotation}
                      onChange={(e) => updateArray('rotation', parseInt(e.target.value) || 0)}
                    />
                    <span>{selectedArray.rotation}°</span>
                  </div>
                </div>
                
                {/* Array Configuration */}
                <div className="control-section">
                  <div className="section-header">Array Configuration</div>
                  <div className="control-group">
                    <label>Elements:</label>
                    <div className="number-spinner">
                      <button 
                        onClick={() => updateArray('elements', Math.max(2, selectedArray.elements - 1))}
                        className="spinner-btn"
                      >
                        −
                      </button>
                      <span className="spinner-value">{selectedArray.elements}</span>
                      <button 
                        onClick={() => updateArray('elements', selectedArray.elements + 1)}
                        className="spinner-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Spacing (λ):</label>
                    <div className="number-spinner">
                      <button 
                        onClick={() => updateArray('spacing', Math.max(0, selectedArray.spacing - 0.01))}
                        className="spinner-btn"
                      >
                        −
                      </button>
                      <span className="spinner-value">{selectedArray.spacing.toFixed(2)}</span>
                      <button 
                        onClick={() => updateArray('spacing', selectedArray.spacing + 0.01)}
                        className="spinner-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Curvature:</label>
                    <div className="number-spinner">
                      <button 
                        onClick={() => updateArray('curvature', Math.max(0, selectedArray.curvature - 0.01))}
                        className="spinner-btn"
                      >
                        −
                      </button>
                      <span className="spinner-value">{selectedArray.curvature.toFixed(2)}</span>
                      <button 
                        onClick={() => updateArray('curvature', selectedArray.curvature + 0.01)}
                        className="spinner-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
     

              </>
            )}
            
            {/* Beam Control */}
            <div className="control-section">
              <div className="section-header">Beam Control</div>
              
              <div className="control-group">
                
                <label>Steering Angle:</label>
                <div className="slider-container">
                  <input 
                    type="range" 
                    min="-90" 
                    max="90"
                    value={steeringAngle}
                    onChange={(e) => setSteeringAngle(parseInt(e.target.value))}
                    className="steering-slider"
                  />
                  <span className="angle-value">{steeringAngle}°</span>
                </div>
              </div>
              
              {/* <div className="control-group">
                <select 
                  value={beamMode}
                  onChange={(e) => setBeamMode(e.target.value)}
                  className="mode-select"
                >
                  <option value="acoustic">acoustic</option>
                  <option value="rf">RF/5G</option>
                  <option value="ultrasound">Ultrasound</option>
                </select>
              </div> */}
              
              {/* Frequency Components */}
              <div className="frequency-section">
                <div className="section-subheader">Frequency components</div>
                {/* <div className="frequency-formula">
                  {getFrequencyFormula() || '1.00*sin(2π*1*t + 0°)'}
                </div> */}
                
                {frequencyComponents.map(fc => (
                  <div key={fc.id} className="frequency-component">
                    <div className="freq-controls">
                      <div className="freq-row">
                        <label>Frequency</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={fc.frequency}
                          onChange={(e) => updateFrequencyComponent(fc.id, 'frequency', parseFloat(e.target.value) || 0)}
                          className="freq-input"
                        />
                        <select
                          value={fc.unit}
                          onChange={(e) => updateFrequencyComponent(fc.id, 'unit', e.target.value)}
                          className="freq-unit"
                        >
                          <option value="Hz">Hz</option>
                          <option value="kHz">kHz</option>
                          <option value="MHz">MHz</option>
                          <option value="GHz">GHz</option>
                        </select>
                      </div>
                      {/* <div className="freq-row">
                        <label>Amplitude</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={fc.amplitude}
                          onChange={(e) => updateFrequencyComponent(fc.id, 'amplitude', parseFloat(e.target.value) || 0)}
                          className="freq-input"
                        />
                      </div> */}
                      {/* <div className="freq-row">
                        <label>Phase shift</label>
                        <input 
                          type="number" 
                          step="1"
                          value={fc.phase}
                          onChange={(e) => updateFrequencyComponent(fc.id, 'phase', parseFloat(e.target.value) || 0)}
                          className="freq-input"
                        />
                      </div> */}
                    </div>
                    {frequencyComponents.length > 1 && (
                      <button 
                        onClick={() => removeFrequencyComponent(fc.id)}
                        className="remove-freq-btn"
                        title="Remove"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                
                <button onClick={addFrequencyComponent} className="control-btn add-btn">
                  Add
                </button>
              </div>

              
            </div>
           
          </div>
          
          {/* Main Visualization Area */}
          <div className="visualization-area">
            {/* Heatmap */}
            <div className="viz-panel heatmap-panel">
              <div className="panel-header">Beamforming Pattern (2D)</div>
              <div className="heatmap-container">
                {heatmapData ? (
                  <Plot
                    data={[
                      {
                        type: 'heatmap',
                        x: heatmapData.x,
                        y: heatmapData.y,
                        z: heatmapData.z,
                        type: 'heatmap',
                        colorscale: [
                          [0, '#000080'],
                          [0.17, '#0000ff'],
                          [0.33, '#00ffff'],
                          [0.5, '#00ff00'],
                          [0.67, '#ffff00'],
                          [0.83, '#ff8000'],
                          [1, '#ff0000']
                        ],
                        colorbar: {
                          title: 'dB',
                          titlefont: { color: '#fff' },
                          tickfont: { color: '#fff' }
                        },
                        zsmooth: 'best'
                      },
                      // Target points
                      ...(heatmapData.targets || []).map(t => ({
                        type: 'scatter',
                        x: [t.x],
                        y: [t.y],
                        mode: 'markers',
                        marker: { size: 15, color: 'lime', symbol: 'star' },
                        name: 'Target'
                      }))
                    ]}
                    layout={{
                      paper_bgcolor: '#1a1f2e',
                      plot_bgcolor: '#1a1f2e',
                      xaxis: { title: 'x (m)', color: '#fff', gridcolor: '#444' },
                      yaxis: { title: 'y (m)', color: '#fff', gridcolor: '#444' },
                      margin: { l: 50, r: 30, t: 20, b: 50 },
                      showlegend: false
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <div className="placeholder">Calculating...</div>
                )}
              </div>
            </div>
            
            {/* Polar Plot */}
            {/* Azimuth Graph */}
            <div className="viz-panel polar-panel">
              <div className="panel-header">Azimuth Beam Pattern</div>
              <div className="polar-container">
                {polarData && (
                  <Plot
                    data={[{
                      type: 'scatterpolar',
                      r: polarData.r,
                      theta: polarData.theta,
                      mode: 'lines',
                      line: { color: '#00ff88', width: 2.5 },
                      thetaunit: 'degrees',
                      hovertemplate: '<b>Azimuth: %{theta}°</b><br>Gain: %{r:.3f}<extra></extra>'
                    }]}
                    layout={{
                      paper_bgcolor: '#1a1f2e',
                      polar: {
                        bgcolor: '#0a0e1a',
                        radialaxis: { 
                          visible: true, 
                          range: [0, 1],
                          tickfont: { color: '#fff' },
                          gridcolor: '#444',
                          ticksuffix: ''
                        },
                        angularaxis: { 
                          direction: 'clockwise',
                          rotation: 90,
                          range: [0, 180],
                          tickmode: 'linear',
                          tick0: 0,
                          dtick: 15,
                          tickfont: { color: '#fff' },
                          gridcolor: '#444'
                        },
                        sector: [0, 180]
                      },
                      margin: { l: 60, r: 60, t: 40, b: 40 },
                      showlegend: false,
                      font: { color: '#fff' }
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}

              </div>
            </div>
          </div>
          
          {/* Right Scenario Panel */}
          <div className="scenario-panel">
            <div className="section-header">Scenario Manager</div>
            <select 
              value={selectedScenario}
              onChange={(e) => {
                setSelectedScenario(e.target.value);
                if (e.target.value) {
                  loadScenario(e.target.value);
                }
              }}
              className="scenario-select"
            >
              <option value="">Default</option>
              {scenarios.map(scenario => (
                <option key={scenario.file} value={scenario.file}>
                  {scenario.name}
                </option>
              ))}
            </select>
            <div className="button-group">
              <button 
                onClick={() => selectedScenario && loadScenario(selectedScenario)} 
                className="control-btn"
                disabled={!selectedScenario}
              >
                Load
              </button>
              <button onClick={saveScenario} className="control-btn">
                Save
              </button>
            </div>
            
            {/* Scenario Info */}
            <div className="scenario-info">
              <h4>Current Configuration:</h4>
              <p>Arrays: {arrays.length}</p>
              <p>Total Elements: {arrays.reduce((sum, arr) => sum + arr.elements, 0)}</p>
              <p>Frequencies: {frequencyComponents.length}</p>
              <p>Mode: {beamMode}</p>
            </div>
               <div className="control-section">
  <div className="section-header">Array Target</div>
  <div className="control-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    <label>X:</label>
    <input 
      type="number" 
      step="0.1"
      value={selectedArray.target.x}
      onChange={(e) => updateArrayNested('target', 'x', parseFloat(e.target.value))}
      style={{ width: '60px', padding: '4px 6px' }}
    />
    <label>Y:</label>
    <input 
      type="number" 
      step="0.1"
      value={selectedArray.target.y}
      onChange={(e) => updateArrayNested('target', 'y', parseFloat(e.target.value))}
      style={{ width: '60px', padding: '4px 6px' }}
    />
  </div>
  <div className="control-group">
    <label>
      <input 
        type="checkbox"
        checked={selectedArray.followTarget}
        onChange={(e) => updateArray('followTarget', e.target.checked)}
      />
      Follow target
    </label>
  </div>
</div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Beamforming;