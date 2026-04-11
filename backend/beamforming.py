import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

class BeamformingSimulator:
    """
    Phased Array Beamforming Simulator
    Simulates beamforming patterns for phased arrays with customizable parameters
    """
    
    def __init__(self):
        self.c = 343  # Speed of sound in air (m/s) - can be changed based on mode
        
    def set_mode(self, mode):
        """Set the propagation mode and adjust wave speed"""
        if mode == 'acoustic':
            self.c = 343  # Speed of sound in air
        elif mode == 'ultrasound':
            self.c = 1540  # Speed of sound in tissue
        elif mode == 'rf':
            self.c = 3e8  # Speed of light
        else:
            self.c = 343
    
    def calculate_array_positions(self, array_config):
        """Calculate positions of array elements"""
        n_elements = int(array_config.get('elements', 8))
        spacing = float(array_config.get('spacing', 0.5))
        curvature = float(array_config.get('curvature', 0))
        rotation = np.deg2rad(float(array_config.get('rotation', 0)))
        position = array_config.get('position', {'x': 0, 'y': 0})
        pos_x = float(position.get('x', 0))
        pos_y = float(position.get('y', 0))
        
        # Linear array positions
        if curvature == 0:
            positions = np.zeros((n_elements, 2))
            for i in range(n_elements):
                x = (i - (n_elements - 1) / 2) * spacing
                positions[i] = [x, 0]
        else:
            # Curved array positions
            positions = np.zeros((n_elements, 2))
            radius = 1 / curvature if curvature != 0 else 1e10
            angles = np.linspace(-np.pi/4, np.pi/4, n_elements)
            for i in range(n_elements):
                positions[i] = [
                    radius * np.sin(angles[i]),
                    radius * (1 - np.cos(angles[i]))
                ]
        
        # Apply rotation
        rot_matrix = np.array([
            [np.cos(rotation), -np.sin(rotation)],
            [np.sin(rotation), np.cos(rotation)]
        ])
        positions = positions @ rot_matrix.T
        
        # Apply translation
        positions[:, 0] += pos_x
        positions[:, 1] += pos_y
        
        return positions
    
    def calculate_delays(self, positions, steering_angle, wavelength):
        """Calculate phase delays for beam steering"""
        steering_rad = np.deg2rad(steering_angle)
        
        # Direction vector: negative x to match standard convention
        # +angle steers right, -angle steers left
        direction = np.array([-np.sin(steering_rad), np.cos(steering_rad)])

        # Calculate delays based on geometry
        delays = np.dot(positions, direction) / self.c
        delays -= np.min(delays)  # Normalize to minimum delay
        
        return delays
    
    def calculate_field(self, arrays, freq_components, grid_x, grid_y, steering_angle=0):
        """Calculate the acoustic/EM field at grid points"""
        field = np.zeros_like(grid_x, dtype=complex)
        
        for array_config in arrays:
            # positions = self.calculate_array_positions(array_config)

            # For each frequency component
            for fc in freq_components:
                frequency = self.convert_frequency(fc.get('frequency', 1000), fc.get('unit', 'Hz'))
                wavelength = self.c / frequency
                
                # Scale spacing by wavelength (spacing in UI is in units of λ)
                spacing_lambda = float(array_config.get('spacing', 0.5))
                actual_spacing_meters = spacing_lambda * wavelength
                    
                # Create a copy of config with actual spacing in meters
                config_scaled = dict(array_config)
                config_scaled['spacing'] = actual_spacing_meters
                positions = self.calculate_array_positions(config_scaled)
            
            
                
                k = 2 * np.pi / wavelength
                amplitude = float(fc.get('amplitude', 1))
                phase_offset = np.deg2rad(float(fc.get('phase', 0)))
                
                # Calculate delays for steering
                if array_config.get('followTarget', False):
                    # Steer towards target
                    target_data = array_config.get('target', {'x': 0, 'y': 5})
                    target = np.array([
                        float(target_data.get('x', 0)),
                        float(target_data.get('y', 5))
                    ])
                    center = np.mean(positions, axis=0)
                    direction = target - center
                    angle = np.arctan2(direction[0], direction[1])
                    array_steering_angle = np.rad2deg(angle)
                else:
                    array_steering_angle = steering_angle  # Use global steering angle from beam control
                
                delays = self.calculate_delays(positions, array_steering_angle, wavelength)
                
                # Calculate contribution from each element
                for i, pos in enumerate(positions):
                    # Distance from element to each grid point
                    dx = grid_x - pos[0]
                    dy = grid_y - pos[1]
                    r = np.sqrt(dx**2 + dy**2)
                    
                    # Avoid division by zero
                    r = np.maximum(r, 0.1)
                    
                    # Phase due to propagation + steering delay
                    phase = -k * r + k * self.c * delays[i] + phase_offset
                    
                    # Add contribution (with 1/r amplitude decay)
                    field += amplitude * np.exp(1j * phase) / np.sqrt(r)
        return field
    
    def convert_frequency(self, value, unit):
        """Convert frequency to Hz"""
        conversions = {
            'Hz': 1,
            'kHz': 1e3,
            'MHz': 1e6,
            'GHz': 1e9
        }
        value = float(value) if value is not None and value != 0 else 1000
        return value * conversions.get(unit, 1)
    
    
    def generate_heatmap_data(self, arrays, freq_components, steering_angle):
        """Generate 2D heatmap data for frontend plotting"""
        # Create grid (high resolution)
        x = np.linspace(-20, 20, 300).tolist()
        y = np.linspace(-5, 15, 200).tolist()
        grid_x, grid_y = np.meshgrid(x, y)
        
        # Calculate field
        field = self.calculate_field(arrays, freq_components, grid_x, grid_y, steering_angle)
        
        # Convert to dB scale with safety checks
        intensity = np.abs(field)**2
        max_intensity = np.max(intensity)
        if max_intensity == 0 or np.isnan(max_intensity):
            max_intensity = 1
        intensity_db = 10 * np.log10(intensity / max_intensity + 1e-10)
        intensity_db = np.clip(intensity_db, -60, 0)
        
        # Get target points
        targets = []
        for array in arrays:
            if array.get('followTarget', False):
                targets.append({
                    'x': float(array['target']['x']),
                    'y': float(array['target']['y'])
                })
        
        return {
            'x': x,
            'y': y,
            'z': intensity_db.tolist(),
            'targets': targets
        }
    
    
    def generate_polar_data(self, arrays, freq_components, steering_angle):
        """Generate azimuth polar plot data for frontend plotting"""
        # Angular range (upper half only) - higher resolution
        angles = np.linspace(-90, 90, 180)  # degrees for azimuth, upper half
        angles_rad = np.deg2rad(angles)
        
        # Calculate pattern at fixed radius (far field approximation)
        radius = 50  # Far field distance for better radiation pattern
        pattern = np.zeros(len(angles), dtype=complex)
        
        for i, angle_rad in enumerate(angles_rad):
            # Calculate far-field point along azimuth ray
            x = radius * np.sin(angle_rad)
            y = radius * np.cos(angle_rad)
            field = self.calculate_field(arrays, freq_components, 
                                         np.array([[x]]), np.array([[y]]), steering_angle)
            pattern[i] = field[0, 0]
        
        # Convert to dB scale (intensity in dB)
        intensity = np.abs(pattern)**2
        max_intensity = np.max(intensity)
        if max_intensity == 0 or np.isnan(max_intensity):
            max_intensity = 1
        
        # Convert to dB scale (0 dB at maximum, down to -40 dB)
        intensity_db = 10 * np.log10(intensity / max_intensity + 1e-10)
        intensity_db = np.clip(intensity_db, -40, 0)
        
        # Normalize to 0-1 range for radial axis display
        intensity_norm = (intensity_db + 40) / 40  # Maps -40dB to 0, 0dB to 1
        
        return {
            'theta': angles.tolist(),
            'r': intensity_norm.tolist(),
            'intensity_db': intensity_db.tolist()  # Include dB values for reference
        }
    
    def simulate(self, arrays, steering_angle, freq_components, mode='acoustic'):
        """Main simulation method - returns data for frontend plotting"""
        self.set_mode(mode)
        
        # Generate data (not images)
        heatmap_data = self.generate_heatmap_data(arrays, freq_components, steering_angle)
        polar_data = self.generate_polar_data(arrays, freq_components, steering_angle)
        
        return {
            'heatmap': heatmap_data,
            'polar': polar_data
        }
    
