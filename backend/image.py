import numpy as np
import cv2
from scipy.fft import fft2, ifft2, fftshift, ifftshift


class ImageUnit:
    """
    Represents a single image with FFT processing capabilities.
    Combines image loading, processing, and FFT functionality.
    """
    
    def __init__(self):
        # Image data
        self.originalImage = None
        self.grayImage = None
        self.resizedImage = None
        
        # FFT components
        self.ft = None                  # Shifted FFT
        self.modified_ft = None         # Modified FFT for mixing
        self.magnitude = None           # |F|
        self.phase = None               # angle(F)
        self.real = None                # Re(F)
        self.imag = None                # Im(F)
        
        # Adjustments
        self.mask = None
        self.brightness = 0.0
        self.contrast = 1.0

    # --------------------------------------------------
    #              Load and Process Image
    # --------------------------------------------------
    def loadImage(self, filePath):
        """Load image from file and convert to grayscale."""
        self.originalImage = cv2.imread(filePath)
        if self.originalImage is None:
            raise FileNotFoundError(f"Image not found: {filePath}")
        self.grayImage = self.convertToGray(self.originalImage)
        return self.grayImage

    def convertToGray(self, image):
        """Convert image to grayscale."""
        if len(image.shape) == 3:  # Color image
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return image

    def resizeToSmallest(self, targetSize):
        """Resize image to target size (width, height)."""
        self.resizedImage = cv2.resize(self.grayImage, targetSize, interpolation=cv2.INTER_AREA)
        return self.resizedImage

    # --------------------------------------------------
    #           Compute FFT and Extract Components
    # --------------------------------------------------
    def computeFFT(self):
        """Compute FFT and extract all frequency domain components."""
        if self.resizedImage is None:
            raise ValueError("Resized image not available. Call resizeToSmallest() first.")
        
        # Convert to float32
        image_float = self.resizedImage.astype(np.float32)
        
        # Compute 2D FFT
        fft_result = np.fft.fft2(image_float)
        
        # Shift low frequencies to center
        self.ft = np.fft.fftshift(fft_result)
        self.modified_ft = self.ft.copy()
        
        # Extract components
        self.magnitude = np.abs(self.ft)
        self.phase = np.angle(self.ft)
        self.real = np.real(self.ft)
        self.imag = np.imag(self.ft)
        
        return self.ft

    # --------------------------------------------------
    #        Get Normalized Components for Display
    # --------------------------------------------------
    def getMag(self):
        """Get normalized magnitude for display with log scaling."""
        if self.magnitude is None:
            self.computeFFT()
        
        # Log scaling for visualization
        mag = np.log(1 + self.magnitude)
        
        # Normalize (0 → 1)
        mag = mag / np.max(mag)
        
        return mag

    def getPhase(self):
        """Get normalized phase for display."""
        if self.phase is None:
            self.computeFFT()
        
        # Normalize phase from [-π, π] → [0, 1]
        ph = (self.phase + np.pi) / (2 * np.pi)
        
        return ph

    def getReal(self):
        """Get normalized real component for display."""
        if self.real is None:
            self.computeFFT()
        
        # Normalize to 0–1
        r = self.real
        r = (r - r.min()) / (r.max() - r.min() + 1e-8)
        
        return r

    def getImag(self):
        """Get normalized imaginary component for display."""
        if self.imag is None:
            self.computeFFT()
        
        # Normalize to 0–1
        im = self.imag
        im = (im - im.min()) / (im.max() - im.min() + 1e-8)
        
        return im

    # --------------------------------------------------
    #        Combine Magnitude and Phase
    # --------------------------------------------------
    def combineMagPhase(self, magnitude, phase):
        """
        Combine magnitude and phase into complex spectrum.
        
        Args:
            magnitude: 2D array |F|
            phase: 2D array angle(F)
            
        Returns:
            complex spectrum
        """
        combined = magnitude * np.exp(1j * phase)
        return combined


    
    # --------------------------------------------------
    #           Get FFT Components
    # --------------------------------------------------
    def getFFTComponents(self, componentType="magnitude"):
        
        if componentType == "magnitude":
            return self.magnitude
        elif componentType == "phase":
            return self.phase
        elif componentType == "real":
            return self.real
        elif componentType == "imag":
            return self.imag
        else:
            raise ValueError(f"Invalid component type: {componentType}")

    # --------------------------------------------------
    #        Display Image or Component
    # --------------------------------------------------
    def displayComponent(self, componentType="magnitude", windowName="Image"):
        """Display image or FFT component in a window."""
        comp = self.getFFTComponents(componentType)
        if comp is None:
            print(f"Component {componentType} not available")
            return
        
        # Normalize for display
        comp_norm = cv2.normalize(comp, None, 0, 255, cv2.NORM_MINMAX)
        comp_uint8 = comp_norm.astype(np.uint8)
        cv2.imshow(windowName, comp_uint8)
        cv2.waitKey(1)



    # def create_region_mask(self, rectangle, region_type):
    
    #     height, width = self.fft.shape
        
    #     # Convert percentages to pixel coordinates
    #     x_start = int(width * rectangle['x'] / 100)
    #     y_start = int(height * rectangle['y'] / 100)
    #     x_end = int(width * (rectangle['x'] + rectangle['width']) / 100)
    #     y_end = int(height * (rectangle['y'] + rectangle['height']) / 100)
        
    #     mask = np.zeros((height, width), dtype=np.float32)
        
    #     if region_type == 'inner':
    #         # Set rectangle region to 1 (keep inner region)
    #         mask[y_start:y_end, x_start:x_end] = 1
    #     else:  # 'outer'
    #         # Set everything to 1, then rectangle to 0 (keep outer region)
    #         mask[:, :] = 1
    #         mask[y_start:y_end, x_start:x_end] = 0
        
    #     self.modified_ft = self.fft * mask
    #     # Update components with masked FFT
    #     self.magnitude = np.abs(self.modified_ft)
    #     self.phase = np.angle(self.modified_ft)
    #     self.real = np.real(self.modified_ft)
    #     self.imag = np.imag(self.modified_ft)