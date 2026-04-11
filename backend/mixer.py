import numpy as np

class Mixer:
    # --------------------------------------------------
    #                Properties
    # --------------------------------------------------
    def __init__(self, images):
        self.images = images            # list of ImageUnit objects
        self.weights = [0, 0, 0, 0]     # one weight for each image
        self.magnitude_weights = None
        self.phase_weights = None
        # self.regionSelector = regionSelector
        self.regionMask = None
        self.mixingMode = "mag_phase"   # or "real_imag"
        self.outputImage = None
        self.isRunning = False
        
        # Ensure all images have FFT computed
        self._ensureFFTComputed()


    # --------------------------------------------------
    #                Functions
    # --------------------------------------------------
    
    def _ensureFFTComputed(self):
        """Ensure all images have their FFT components computed."""
        for i, image in enumerate(self.images):
            if image.magnitude is None or image.phase is None:
                print(f"Computing FFT for image {i}...")
                image.computeFFT()
            else:
                print(f"FFT already computed for image {i}")

    def setWeights(self, weights):
        """Set the mixing weights for each image."""
        self.weights = weights

    def setComponentWeights(self, magnitude_weights=None, phase_weights=None):
        """Set separate magnitude and phase weights. Each should be a list matching images.

        We normalize each component weights vector to sum to 1 if possible.
        """
        if magnitude_weights is not None:
            mag = np.array(magnitude_weights, dtype=float)
            s = np.sum(mag)
            if s > 0:
                mag = mag / s
            self.magnitude_weights = mag.tolist()

        if phase_weights is not None:
            ph = np.array(phase_weights, dtype=float)
            s2 = np.sum(ph)
            if s2 > 0:
                ph = ph / s2
            self.phase_weights = ph.tolist()

    def setMixingMode(self, mode):
        """Select mixing mode: magnitude/phase or real/imag."""
        self.mixingMode = mode

    # def applyMask(self):
    #     self.regionMask = self.regionSelector.getMask()

    # --------------------------------------------------
    #        Mix magnitude & phase components
    # --------------------------------------------------
    def mixMagnitudePhase(self):
        """Mix magnitude and phase using weighted average."""
        numImages = len(self.images)

        # determine per-image weights for magnitude and phase
        if self.magnitude_weights is not None:
            mag_ws = self.magnitude_weights
        else:
            mag_ws = self.weights

        if self.phase_weights is not None:
            phase_ws = self.phase_weights
        else:
            phase_ws = self.weights

        # accumulate weighted magnitude & weighted phase
        mag_mix = None
        phase_mix = None

        for i in range(numImages):
            mag = self.images[i].magnitude
            phase = self.images[i].phase
            w_mag = mag_ws[i] if i < len(mag_ws) else 0
            w_phase = phase_ws[i] if i < len(phase_ws) else 0

            # apply frequency region mask if exists
            if self.regionMask is not None:
                mag = mag * self.regionMask
                phase = phase * self.regionMask

            if mag_mix is None:
                mag_mix = w_mag * mag
                phase_mix = w_phase * phase
            else:
                mag_mix += w_mag * mag
                phase_mix += w_phase * phase

        # combine magnitude + phase back to a complex FFT
        mixed_fft = mag_mix * np.exp(1j * phase_mix)
        return mixed_fft

    # --------------------------------------------------
    #           Mix real & imaginary components
    # --------------------------------------------------
    def mixRealImag(self):
        """Mix real and imaginary parts using weighted average."""
        numImages = len(self.images)

        # determine per-image weights for real and imaginary
        if self.magnitude_weights is not None:
            real_ws = self.magnitude_weights
        else:
            real_ws = self.weights

        if self.phase_weights is not None:
            imag_ws = self.phase_weights
        else:
            imag_ws = self.weights

        real_mix = None
        imag_mix = None

        for i in range(numImages):
            real = self.images[i].real
            imag = self.images[i].imag
            w_real = real_ws[i] if i < len(real_ws) else 0
            w_imag = imag_ws[i] if i < len(imag_ws) else 0

            # apply mask if exists
            if self.regionMask is not None:
                real = real * self.regionMask
                imag = imag * self.regionMask

            if real_mix is None:
                real_mix = w_real * real
                imag_mix = w_imag * imag
            else:
                real_mix += w_real * real
                imag_mix += w_imag * imag

        # combine components back to a complex FFT
        mixed_fft = real_mix + 1j * imag_mix
        return mixed_fft

    # --------------------------------------------------
    #                Compute output image
    # --------------------------------------------------
    # def computeIFFT(self):
    #     """Perform inverse FFT and store the output image."""
    #     if self.isRunning:
    #         return

    #     self.isRunning = True

    #     try:
    #         # choose mixing method
    #         if self.mixingMode == "mag_phase":
    #             mixed_fft = self.mixMagnitudePhase()
    #         else:
    #             mixed_fft = self.mixRealImag()

    #         # inverse FFT using FFTProcessor
    #         fft_processor = FFTProcessor(np.zeros_like(self.images[0].resizedImage))
    #         img = fft_processor.computeIFFT(mixed_fft)

    #         self.outputImage = img
    #         self.isRunning = False

    #         return img


    def computeIFFT(self):
        # choose mixing method
        if self.mixingMode == "mag_phase":
            mixed_fft = self.mixMagnitudePhase()
        else:
            mixed_fft = self.mixRealImag()

        # Undo the shift
        fft_unshifted = np.fft.ifftshift(mixed_fft)

        # IFFT
        img = np.fft.ifft2(fft_unshifted)

        # Take real part only
        img = np.real(img)

        # Normalize to displayable range (0-255)
        img = img - np.min(img)
        if np.max(img) > 0:
            img = img / np.max(img)
        img = (img * 255).astype(np.uint8)

        self.outputImage = img
        self.isRunning = False

        return img
        


    # --------------------------------------------------
    #                Display output image
    # --------------------------------------------------
    def displayOutput(self, windowTitle):
        """Show the final mixed image."""
        # Use your GUI framework (PyQt, Tkinter, Web UI, etc.)
        # This is a placeholder
        print(f"Displaying output in {windowTitle}")

    # --------------------------------------------------
    #                Cancel running operation
    # --------------------------------------------------
    def cancelIfRunning(self):
        """Cancel mixing if a new request is triggered."""
        if self.isRunning:
            self.isRunning = False



    def setRegionMask(self, rectangle, region_type):
    
        # Get FFT dimensions from first image
        height, width = self.images[0].ft.shape
        
        # Convert percentages to pixels
        x_start = int(width * rectangle['x'] / 100)
        y_start = int(height * rectangle['y'] / 100)
        x_end = int(width * (rectangle['x'] + rectangle['width']) / 100)
        y_end = int(height * (rectangle['y'] + rectangle['height']) / 100)
        
        # Create mask
        mask = np.zeros((height, width), dtype=np.float32)
        
        if region_type == 'inner':
            mask[y_start:y_end, x_start:x_end] = 1  # Keep inner
        else:  # 'outer'
            mask[:, :] = 1
            mask[y_start:y_end, x_start:x_end] = 0  # Keep outer
        
        self.regionMask = mask