# REFINE

> **Strip invisible AI watermarks from text and images. Free forever. Self-hosted. Open-source.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg)](https://fastapi.tiangolo.com/)

Refine is a privacy-first, locally-running web service that disrupts invisible AI-generated watermarks embedded in text and images. Every algorithm runs on **your machine** — no data leaves, no cloud API calls, no telemetry.

---

## Why Refine?

Invisible watermarks like Google's **SynthID**, **C2PA metadata**, and **statistical token-bias** techniques are increasingly embedded in AI-generated content to identify the model, user, or account that created it.

Refine fights back using mathematical perturbations that decouple content from its embedded provenance signature while keeping visual and textual quality intact.

---

## Features

| Feature | How It Works |
|---|---|
| **FFT Phase Scrambler** | 2D Fast Fourier Transform on image channels; injects random noise into high-frequency phase components where watermarks are embedded |
| **DCT Compression Cycle** | JPEG compression/re-read loop that eliminates grid-aligned steganographic patterns |
| **Bilateral Smoothing** | Edge-preserving Median filter that destroys sub-pixel watermark fluctuations |
| **Spatial Micro-jitter** | Sub-degree rotation + sub-pixel rescale/crop that decouples pixel alignment from watermark grid |
| **Unicode Homoglyphs** | Swaps Latin characters with identical-looking Cyrillic homoglyphs to break tokenizer probability distributions |
| **Zero-Width Insertion** | Intersperses invisible `\u200b`/`\u200c` characters to disrupt LLM n-gram statistical detectors |
| **Synonym Substitution** | Replaces statistically-marked words with natural synonyms from a local thesaurus |

---

## Quick Start (Local Self-Host)

### 1. Clone the repository
```bash
git clone https://github.com/askabouthasheem/refine.git
cd Refine
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the server
```bash
python run.py
```

### 4. Open in browser
```
http://localhost:8000
```

---

## Docker (One Command)

```bash
docker run -p 8000:8000 --rm Refine/Refine:latest
```

Or build from source:

```bash
docker build -t Refine .
docker run -p 8000:8000 Refine
```

---

## Project Structure

```
Refine/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI routes and auth endpoints
│   ├── purifier.py      # Core watermark scrambling algorithms
│   └── templates/
│       ├── landing.html # Marketing & community landing page
│       ├── index.html   # Purifier workbench dashboard
│       └── auth.html    # Local identity gatekeeper
├── requirements.txt
├── run.py               # Startup bootstrapper
├── LICENSE              # MIT License
└── README.md
```

---

## API Reference

All endpoints are available at `http://localhost:8000` when running locally.

### `POST /api/purify/text`
Scramble invisible watermarks from AI-generated text.

**Request body (JSON):**
```json
{
  "text": "The artificial intelligence system generated this content.",
  "strength": "medium",
  "use_homoglyphs": true,
  "use_zws": true,
  "use_synonyms": true
}
```

**Strength levels:** `light` | `medium` | `aggressive`

**Response:**
```json
{
  "purified_text": "...",
  "original_char_count": 55,
  "purified_char_count": 72,
  "metrics": {
    "scramble_rate": "75% - 85%",
    "watermark_risk": "Low",
    "visual_preservation": "85.0%"
  }
}
```

---

### `POST /api/purify/image`
Upload and scramble invisible watermarks from an image.

**Form data (multipart):**
- `file`: image file (PNG, JPEG, WEBP)
- `strength`: `light` | `medium` | `aggressive`
- `use_fft`: `true` | `false`
- `use_jpeg`: `true` | `false`
- `use_blur`: `true` | `false`
- `use_jitter`: `true` | `false`

**Response:**
```json
{
  "purified_image_base64": "data:image/png;base64,...",
  "metrics": {
    "original_size": "245.3 KB",
    "processed_size": "198.7 KB",
    "quality_retention": "94.2%",
    "scramble_factor": "82%",
    "watermark_risk": "Low"
  }
}
```

---

## The Math

### FFT Phase Perturbation

For each colour channel $C$ of an image:

$$F = \mathcal{F}\{C\}, \quad \text{shift} = \text{fftshift}(F)$$

We compute:

$$\phi' = \phi + \Delta\phi \cdot \mathbf{1}_{r > r_0}, \quad |F'| = |F| \cdot (1 + \epsilon) \cdot \mathbf{1}_{r > r_0}$$

where $r_0$ is the frequency threshold (set by `strength`), $\Delta\phi \sim \mathcal{U}(-\pi\alpha, \pi\alpha)$, and $\epsilon \sim \mathcal{U}(-\beta, \beta)$.

Reconstruct: $C' = \text{Re}\left(\mathcal{F}^{-1}\{\text{ifftshift}(F')\}\right)$

### Token-Probability Disruption (Text)

LLM watermarking biases token selection via a pseudo-random **green/red** partition keyed to a secret hash $h$ of preceding tokens. Refine disrupts this by:

1. **Homoglyphs**: Replacing characters $c \in \Sigma_{\text{lat}}$ with $c' \in \Sigma_{\text{cyr}}$ where $\text{visual}(c) = \text{visual}(c')$ — the rendered string is visually identical but the token encoding differs, invalidating the watermark detector's hash chain.

2. **ZWS injection**: Inserting $\text{U+200B}$ / $\text{U+200C}$ characters at positions $i$ with probability $p_{\text{zws}}$, creating distinct tokenization boundaries that break n-gram statistics.

3. **Synonym swap**: Replacing words $w$ with $w'$ where $\text{meaning}(w) \approx \text{meaning}(w')$ but $P_\theta(w') \neq P_\theta(w)$, redistributing token log-probabilities away from the watermarked distribution.

---

## Contributing

Refine is fully open-source under the **MIT License**. Contributions are very welcome.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-algorithm`
3. Commit your changes: `git commit -m 'Add new scrambling method'`
4. Push: `git push origin feature/my-new-algorithm`
5. Open a pull request

### Ideas for contributions
- Additional language thesaurus dictionaries
- WebAssembly (WASM) client-side image processing
- Browser extension
- CLI tool (`Refine purify text.txt`)
- Docker Compose setup
- More scrambling algorithms (DCT coefficient perturbation, DWT, etc.)

---

## License

[MIT](./LICENSE) — free to use, modify, distribute, and self-host.

---

## Disclaimer

Refine is an educational and research tool exploring digital provenance, privacy, and adversarial signal processing. Users are responsible for compliance with applicable laws and terms of service in their jurisdiction.
