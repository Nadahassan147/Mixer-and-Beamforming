from flask import jsonify,request,Blueprint
import cv2
from image import ImageUnit
import numpy as np
import base64
import os
import tempfile
from mixer import Mixer

image = Blueprint("image",__name__)

# Module-level storage for the latest weights/mode received from frontend
current_magnitude_weights = None
current_phase_weights = None
current_mixing_mode = "mag_phase"

# In-memory storage for uploaded ImageUnit objects (indexes 0..3)
images_store = [None, None, None, None]


def image_to_base64(img):
    _, buffer = cv2.imencode('.png', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{img_base64}"


def get_image_components(img_unit):
    """Compute FFT components of an ImageUnit and return base64-encoded images."""
    magnitude_img = (img_unit.getMag() * 255).astype(np.uint8)
    phase_img = (img_unit.getPhase() * 255).astype(np.uint8)
    real_img = (img_unit.getReal() * 255).astype(np.uint8)
    imag_img = (img_unit.getImag() * 255).astype(np.uint8)
    
    return {
        'magnitude': image_to_base64(magnitude_img),
        'phase': image_to_base64(phase_img),
        'real': image_to_base64(real_img),
        'imaginary': image_to_base64(imag_img)
    }


@image.route('/api/process-image', methods=['POST'])
def process_image():
    # Get uploaded file from frontend
    file = request.files['image']
    
    # Create a temporary file to save the upload
    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
        temp_path = temp_file.name
        file.save(temp_path)
    
    try:
        # Process image
        img = ImageUnit()
        img.loadImage(temp_path)
        img.resizeToSmallest((512, 512))  # standardize size
        img.computeFFT()
        
        # Get normalized components (0-1 range) and convert to uint8 (0-255)
        components = get_image_components(img)
        
        # Optionally store the ImageUnit server-side if an index was provided
        try:
            idx = request.form.get('index')
            if idx is not None:
                i = int(idx)
                if 0 <= i < len(images_store):
                    images_store[i] = img
                    print(f"Stored image at index {i}. Store state: {[x is not None for x in images_store]}")
                else:
                    print(f"Index {i} out of range")
            else:
                print("No index provided in request")
        except Exception as e:
            print(f"ERROR storing image: {str(e)}")

        return jsonify(components)
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)



@image.route('/api/set-weights', methods=['POST'])
def set_weights():
    """Receive slider weights and mixing mode from frontend."""
    global current_magnitude_weights, current_phase_weights, current_mixing_mode

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON payload received'}), 400

    # Accept either explicit names or a generic `weights` key
    mag = data.get('magnitudeWeights')
    phase = data.get('phaseWeights')
    # backward-compat: allow `weights` for a single-per-image weight
    weights = data.get('weights')
    mixing_mode = data.get('mixingMode') or data.get('mixing_mode') or 'mag_phase'

    if mag is None and weights is not None:
        # use the single weights list as magnitude weights by default
        mag = weights

    current_magnitude_weights = mag
    current_phase_weights = phase
    current_mixing_mode = mixing_mode

    return jsonify({
        'status': 'ok',
        'magnitudeWeights': current_magnitude_weights,
        'phaseWeights': current_phase_weights,
        'mixingMode': current_mixing_mode
    })


@image.route('/api/get-weights', methods=['GET'])
def get_weights():
    """Return the last weights/mode received (if any)."""
    return jsonify({
        'magnitudeWeights': current_magnitude_weights,
        'phaseWeights': current_phase_weights,
        'mixingMode': current_mixing_mode
    })



@image.route('/api/mix', methods=['POST'])
def mix_images():
    # ensure we have four images
    if any(img is None for img in images_store):
        return jsonify({'error': 'Need 4 uploaded images stored on server before mixing'}), 400

    # Build Mixer
    mixer = Mixer(images_store)

    # apply mixing mode if provided in payload
    data = request.get_json() or {}
    
    rectangle = data.get('rectangle')
    region_type = data.get('regionType')
    if rectangle and region_type:
            mixer.setRegionMask(rectangle, region_type)
        
        
    mixing_mode = data.get('mixingMode') or current_mixing_mode
    mixer.setMixingMode(mixing_mode)

    # set component weights if available
    if current_magnitude_weights is not None or current_phase_weights is not None:
        mixer.setComponentWeights(magnitude_weights=current_magnitude_weights or [0,0,0,0],
                                  phase_weights=current_phase_weights or [0,0,0,0])
    else:
        # fallback to unified weights if provided in request
        weights = data.get('weights')
        if weights is not None:
            mixer.setWeights(weights)

    # compute mixed image
    try:
        img = mixer.computeIFFT()
    except Exception as e:
        return jsonify({'error': 'Mixing failed', 'detail': str(e)}), 500

    # Compute FFT components of the mixed image for display
    mixed_unit = ImageUnit()
    mixed_unit.resizedImage = img  # assuming img is grayscale uint8
    mixed_unit.computeFFT()

    components = get_image_components(mixed_unit)

    # return base64 PNG and components
    return jsonify({
        'mixed': image_to_base64(img),
        **components
    })
