import io
import random
import numpy as np
from PIL import Image, ImageFilter, ImageOps

# Homoglyph map for visual similarity but different Unicode representations
HOMOGLYPH_MAP = {
    'a': 'а',  # Cyrillic small letter a
    'c': 'с',  # Cyrillic small letter es
    'd': 'ԁ',  # Cyrillic small letter delye
    'e': 'е',  # Cyrillic small letter ie
    'h': 'һ',  # Cyrillic small letter shha
    'i': 'і',  # Cyrillic small letter byelorussian-ukrainian i
    'j': 'ј',  # Cyrillic small letter je
    'o': 'о',  # Cyrillic small letter o
    'p': 'р',  # Cyrillic small letter er
    's': 'ѕ',  # Cyrillic small letter dze
    'x': 'х',  # Cyrillic small letter ha
    'y': 'у',  # Cyrillic small letter u
    'A': 'А',  # Cyrillic capital letter a
    'C': 'С',  # Cyrillic capital letter es
    'E': 'Е',  # Cyrillic capital letter ie
    'H': 'Н',  # Cyrillic capital letter en
    'I': 'І',  # Cyrillic capital letter byelorussian-ukrainian i
    'J': 'Ј',  # Cyrillic capital letter je
    'M': 'М',  # Cyrillic capital letter em
    'O': 'О',  # Cyrillic capital letter o
    'P': 'Р',  # Cyrillic capital letter er
    'S': 'Ѕ',  # Cyrillic capital letter dze
    'T': 'Т',  # Cyrillic capital letter te
    'X': 'Х',  # Cyrillic capital letter ha
    'Y': 'Ү',  # Cyrillic capital letter ue
}

# Local thesaurus for synonym substitution
THESAURUS = {
    "artificial": "synthetic",
    "generated": "created",
    "important": "crucial",
    "information": "data",
    "remove": "strip",
    "content": "material",
    "detect": "identify",
    "system": "framework",
    "process": "workflow",
    "intelligence": "cognition",
    "powerful": "potent",
    "beautiful": "aesthetic",
    "security": "protection",
    "invisible": "imperceptible",
    "watermark": "signature",
    "digital": "electronic",
    "technique": "method",
    "algorithm": "procedure",
    "complex": "intricate",
    "original": "authentic",
}

def purify_text_homoglyphs(text: str, intensity: float = 0.5) -> str:
    """
    Randomly replaces characters with their Cyrillic homoglyphs.
    intensity determines the probability (0.0 to 1.0) of replacing an eligible character.
    """
    if intensity <= 0:
        return text
    
    result = []
    for char in text:
        if char in HOMOGLYPH_MAP and random.random() < intensity:
            result.append(HOMOGLYPH_MAP[char])
        else:
            result.append(char)
    return "".join(result)

def purify_text_zws(text: str, intensity: float = 0.3) -> str:
    """
    Inserts zero-width space characters (\u200b or \u200c) between characters of words.
    intensity controls the insertion probability per character.
    """
    if intensity <= 0:
        return text
        
    zws_chars = ['\u200b', '\u200c']
    result = []
    for char in text:
        result.append(char)
        if char.isalnum() and random.random() < intensity:
            result.append(random.choice(zws_chars))
    return "".join(result)

def purify_text_synonyms(text: str, intensity: float = 0.4) -> str:
    """
    Replaces common words with their synonyms from a local thesaurus.
    Keeps capitalization pattern (lower, title, upper).
    """
    if intensity <= 0:
        return text
        
    words = text.split()
    purified_words = []
    
    for word in words:
        # Strip punctuation for lookup
        clean_word = "".join(c for c in word if c.isalnum()).lower()
        punctuation_before = "".join(c for c in word[:len(word)//2+1] if not c.isalnum())
        punctuation_after = "".join(c for c in word[len(word)//2:] if not c.isalnum())
        
        if clean_word in THESAURUS and random.random() < intensity:
            synonym = THESAURUS[clean_word]
            # Match original word's capitalization style
            if word.isupper():
                synonym = synonym.upper()
            elif word[0].isupper():
                synonym = synonym.capitalize()
                
            purified_words.append(f"{punctuation_before}{synonym}{punctuation_after}")
        else:
            purified_words.append(word)
            
    return " ".join(purified_words)

def apply_image_fft(img: Image.Image, intensity: float) -> Image.Image:
    """
    Performs a 2D FFT on each RGB channel, adds small noise to high-frequency phases
    and amplitudes to scramble invisible spatial/frequency watermarks, and reconstructs.
    """
    if intensity <= 0:
        return img
        
    # Keep alpha separate if exists
    has_alpha = img.mode == 'RGBA'
    if has_alpha:
        alpha = img.getchannel('A')
        img = img.convert('RGB')
        
    img_array = np.array(img, dtype=np.float32)
    h, w, c = img_array.shape
    
    for channel in range(c):
        # 2D Fast Fourier Transform
        fft_coeff = np.fft.fft2(img_array[:, :, channel])
        fft_shift = np.fft.fftshift(fft_coeff)
        
        # Scramble: Add noise to high frequencies (away from center of shift)
        # Center coordinates
        cy, cx = h // 2, w // 2
        Y, X = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((X - cx)**2 + (Y - cy)**2)
        max_dist = np.sqrt(cx**2 + cy**2)
        
        # Create a mask for high frequencies
        # Higher intensity scrambles closer to the low-frequency core
        threshold = max_dist * (1.0 - (intensity * 0.6))
        high_freq_mask = dist_from_center > threshold
        
        # Add random phase shift and magnitude scaling to high-frequency components
        phase = np.angle(fft_shift)
        magnitude = np.abs(fft_shift)
        
        # Phase noise scaling
        phase_noise = (np.random.rand(h, w) - 0.5) * 2 * np.pi * intensity * 0.25
        magnitude_perturb = 1.0 + (np.random.rand(h, w) - 0.5) * intensity * 0.15
        
        phase[high_freq_mask] += phase_noise[high_freq_mask]
        magnitude[high_freq_mask] *= magnitude_perturb[high_freq_mask]
        
        # Recompose complex numbers
        fft_shift = magnitude * np.exp(1j * phase)
        
        # Inverse FFT
        fft_ishift = np.fft.ifftshift(fft_shift)
        img_back = np.fft.ifft2(fft_ishift)
        img_array[:, :, channel] = np.clip(np.real(img_back), 0, 255)
        
    purified_img = Image.fromarray(np.uint8(img_array), 'RGB')
    
    if has_alpha:
        purified_img.putalpha(alpha)
        
    return purified_img

def apply_image_jpeg_compression(img: Image.Image, quality: int) -> Image.Image:
    """
    Saves image as JPEG to a memory buffer with specified quality, then re-loads it.
    This strips high-frequency compression-sensitive watermarks.
    """
    # Keep alpha if present by converting to RGBA for canvas operations,
    # but JPEG doesn't support alpha, so we paste it on a white background.
    has_alpha = img.mode == 'RGBA'
    if has_alpha:
        # Create solid white canvas
        bg = Image.new('RGBA', img.size, (255, 255, 255, 255))
        composite = Image.alpha_composite(bg, img).convert('RGB')
    else:
        composite = img.convert('RGB')
        
    buffer = io.BytesIO()
    composite.save(buffer, format='JPEG', quality=quality)
    buffer.seek(0)
    purified_img = Image.open(buffer)
    purified_img.load()  # Load image data into memory before buffer is closed
    
    # If the original had alpha, we can preserve the alpha channel from original
    if has_alpha:
        purified_rgba = purified_img.convert('RGBA')
        purified_rgba.putalpha(img.getchannel('A'))
        return purified_rgba
        
    return purified_img

def apply_image_blur_filter(img: Image.Image, intensity: float) -> Image.Image:
    """
    Applies bilateral/median-like smoothing to disrupt pixel-level patterns.
    """
    if intensity <= 0:
        return img
        
    if intensity < 0.3:
        # Subtle smoothing
        return img.filter(ImageFilter.SMOOTH)
    elif intensity < 0.7:
        # Standard smooth more
        return img.filter(ImageFilter.SMOOTH_MORE)
    else:
        # Median filter is extremely strong at destroying sub-pixel grids
        # Radius 2 or 3 depending on intensity
        radius = 2 if intensity < 0.9 else 3
        return img.filter(ImageFilter.MedianFilter(size=radius))

def apply_image_micro_jitter(img: Image.Image, intensity: float) -> Image.Image:
    """
    Applies slight scaling (e.g. 100.5% - 101.5%), tiny rotation (e.g. -0.2 to +0.2 deg),
    and crops back to original size. This completely shifts pixel alignments.
    """
    if intensity <= 0:
        return img
        
    w, h = img.size
    
    # Shift parameters based on intensity
    scale_factor = 1.0 + (0.005 + intensity * 0.01)  # 1.005 to 1.015
    angle = (random.random() - 0.5) * 0.5 * intensity  # -0.25 to +0.25 degrees
    
    new_w = int(w * scale_factor)
    new_h = int(h * scale_factor)
    
    # Resize up
    resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
    
    # Rotate slightly
    rotated = resized.rotate(angle, resample=Image.Resampling.BILINEAR, expand=False)
    
    # Crop back to original dimensions centered
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    right = left + w
    bottom = top + h
    
    cropped = rotated.crop((left, top, right, bottom))
    return cropped

def purify_image_pipeline(
    img: Image.Image, 
    strength: str = "medium",
    use_fft: bool = True,
    use_jpeg: bool = True,
    use_blur: bool = True,
    use_jitter: bool = True
) -> Image.Image:
    """
    Executes selected image filters in sequence.
    Strength determines parameter coefficients.
    """
    # Map strength to coefficients
    strength_map = {
        "light": {"intensity": 0.25, "jpeg_quality": 88},
        "medium": {"intensity": 0.50, "jpeg_quality": 80},
        "aggressive": {"intensity": 0.85, "jpeg_quality": 70}
    }
    
    params = strength_map.get(strength.lower(), strength_map["medium"])
    intensity = params["intensity"]
    jpeg_quality = params["jpeg_quality"]
    
    processed = img.copy()
    
    # 1. Pixel Jitter (alignment shifting)
    if use_jitter:
        processed = apply_image_micro_jitter(processed, intensity)
        
    # 2. Fourier Transform (frequency-domain noise)
    if use_fft:
        processed = apply_image_fft(processed, intensity)
        
    # 3. Bilateral/Median smoothing
    if use_blur:
        processed = apply_image_blur_filter(processed, intensity)
        
    # 4. JPEG Compression cycle (high frequency elimination)
    if use_jpeg:
        processed = apply_image_jpeg_compression(processed, jpeg_quality)
        
    return processed
