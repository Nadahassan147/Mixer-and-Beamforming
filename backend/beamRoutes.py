from flask import jsonify,request,Blueprint
import os
from beamforming import BeamformingSimulator
import json


beam = Blueprint("beam",__name__)

beamforming_simulator = BeamformingSimulator()

@beam.route('/api/beamforming', methods=['POST'])
def beamforming():
    """Calculate beamforming pattern"""
    data = request.get_json()
    
    arrays = data.get('arrays', [])
    steering_angle = data.get('steeringAngle', 0)
    freq_components = data.get('frequencyComponents', [])
    mode = data.get('mode', 'acoustic')
    
    result = beamforming_simulator.simulate(arrays, steering_angle, freq_components, mode)
    return jsonify(result)


@beam.route('/api/scenarios/<scenario_file>', methods=['GET'])
def get_scenario(scenario_file):
    """Load a predefined scenario"""
    scenarios_dir = os.path.join(os.path.dirname(__file__), 'scenarios')
    scenario_path = os.path.join(scenarios_dir, scenario_file)
    
    if os.path.exists(scenario_path):
        with open(scenario_path, 'r') as f:
            scenario_data = json.load(f)
        return jsonify(scenario_data)
    else:
        return jsonify({'error': 'Scenario not found'}), 404

