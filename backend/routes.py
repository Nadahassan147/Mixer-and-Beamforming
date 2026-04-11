from flask import jsonify,request,Blueprint
import cv2
from image import ImageUnit
import numpy as np
import base64
import os
import tempfile

image = Blueprint("image",__name__)


def image_to_base64(img):
    _, buffer = cv2.imencode('.png', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{img_base64}"


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
        magnitude_img = (img.getMag() * 255).astype(np.uint8)
        phase_img = (img.getPhase() * 255).astype(np.uint8)
        real_img = (img.getReal() * 255).astype(np.uint8)
        imag_img = (img.getImag() * 255).astype(np.uint8)
        
        return jsonify({
            'magnitude': image_to_base64(magnitude_img),
            'phase': image_to_base64(phase_img),
            'real': image_to_base64(real_img),
            'imaginary': image_to_base64(imag_img)
        })
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)


