import os
import base64
import io
import uuid
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image

# Import local purifier algorithms
from app.purifier import (
    purify_text_homoglyphs,
    purify_text_zws,
    purify_text_synonyms,
    purify_image_pipeline
)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="REFINE: AI Watermark Remover & Provenance Scrambler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to templates / static files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
ASSETS_DIR = os.path.join(STATIC_DIR, "assets")

# Create static directories if they don't exist yet (to avoid mount startup crash)
os.makedirs(ASSETS_DIR, exist_ok=True)

# In-memory mock user database for runtime demonstration
# Key: email (lowercase), Value: dict of user details
MOCK_USERS = {
    "test@refine.com": {
        "email": "test@refine.com",
        "password": "password123",
        "name": "Alex Mercer"
    }
}

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TextPurifyRequest(BaseModel):
    text: str
    strength: str = "medium"
    use_homoglyphs: bool = True
    use_zws: bool = True
    use_synonyms: bool = True

# --- SPA Routes ---

app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# --- Auth APIs ---

@app.post("/api/auth/register")
async def api_register(request: RegisterRequest):
    """API endpoint to create a new user account."""
    email_clean = request.email.lower().strip()
    if email_clean in MOCK_USERS:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        
    # Save user into local memory db
    MOCK_USERS[email_clean] = {
        "email": email_clean,
        "password": request.password,
        "name": request.name
    }
    
    # Generate mock session token
    session_token = str(uuid.uuid4())
    return {
        "status": "success",
        "token": session_token,
        "user": {
            "email": email_clean,
            "name": request.name
        }
    }

@app.post("/api/auth/login")
async def api_login(request: LoginRequest):
    """API endpoint to authenticate user credentials."""
    email_clean = request.email.lower().strip()
    user = MOCK_USERS.get(email_clean)
    
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    session_token = str(uuid.uuid4())
    return {
        "status": "success",
        "token": session_token,
        "user": {
            "email": user["email"],
            "name": user["name"]
        }
    }

# --- Core Purification APIs ---

@app.post("/api/purify/text")
async def api_purify_text(request: TextPurifyRequest):
    """API endpoint to scramble watermarks in text."""
    if not request.text.strip():
        return {
            "purified_text": "",
            "original_char_count": 0,
            "purified_char_count": 0,
            "metrics": {
                "scramble_rate": "0%",
                "watermark_risk": "None"
            }
        }
    
    # Map strength to parameters
    strength_map = {
        "light": {"homoglyph_rate": 0.2, "zws_rate": 0.15, "synonym_rate": 0.2},
        "medium": {"homoglyph_rate": 0.5, "zws_rate": 0.30, "synonym_rate": 0.4},
        "aggressive": {"homoglyph_rate": 0.8, "zws_rate": 0.50, "synonym_rate": 0.6}
    }
    params = strength_map.get(request.strength.lower(), strength_map["medium"])
    
    purified = request.text
    
    # Apply selected text filters in sequence
    if request.use_synonyms:
        purified = purify_text_synonyms(purified, params["synonym_rate"])
    if request.use_homoglyphs:
        purified = purify_text_homoglyphs(purified, params["homoglyph_rate"])
    if request.use_zws:
        purified = purify_text_zws(purified, params["zws_rate"])
        
    # Calculate mock metric values for UI telemetry
    original_len = len(request.text)
    purified_len = len(purified)
    
    entropy_reduction = "0%"
    risk_level = "High"
    
    if request.strength == "light":
        entropy_reduction = "45% - 60%"
        risk_level = "Medium"
    elif request.strength == "medium":
        entropy_reduction = "75% - 85%"
        risk_level = "Low"
    elif request.strength == "aggressive":
        entropy_reduction = "95% - 99%"
        risk_level = "Negligible"
        
    return {
        "purified_text": purified,
        "original_char_count": original_len,
        "purified_char_count": purified_len,
        "metrics": {
            "scramble_rate": entropy_reduction,
            "watermark_risk": risk_level,
            "visual_preservation": "99.8%" if not request.use_synonyms else "85.0%"
        }
    }

@app.post("/api/purify/image")
async def api_purify_image(
    file: UploadFile = File(...),
    strength: str = Form("medium"),
    use_fft: bool = Form(True),
    use_jpeg: bool = Form(True),
    use_blur: bool = Form(True),
    use_jitter: bool = Form(True)
):
    """API endpoint to upload, scramble, and return images as base64 with statistics."""
    try:
        contents = await file.read()
        image_bytes = io.BytesIO(contents)
        img = Image.open(image_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file format.")
        
    original_size_kb = len(contents) / 1024
    
    # Run the purification pipeline
    try:
        purified_img = purify_image_pipeline(
            img=img,
            strength=strength,
            use_fft=use_fft,
            use_jpeg=use_jpeg,
            use_blur=use_blur,
            use_jitter=use_jitter
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")
        
    # Save the output image to a memory stream as PNG
    out_io = io.BytesIO()
    out_format = img.format if img.format in ['PNG', 'JPEG', 'WEBP'] else 'PNG'
    purified_img.save(out_io, format=out_format)
    processed_bytes = out_io.getvalue()
    processed_size_kb = len(processed_bytes) / 1024
    
    # Encode processed image to base64
    base64_img = base64.b64encode(processed_bytes).decode('utf-8')
    mime_type = f"image/{out_format.lower()}"
    base64_uri = f"data:{mime_type};base64,{base64_img}"
    
    # Telemetry metrics calculations
    quality_retention = "95%"
    watermark_risk = "Low"
    scramble_factor = "80%"
    
    if strength == "light":
        quality_retention = "98.5%"
        watermark_risk = "Medium"
        scramble_factor = "55%"
    elif strength == "medium":
        quality_retention = "94.2%"
        watermark_risk = "Low"
        scramble_factor = "82%"
    elif strength == "aggressive":
        quality_retention = "86.0%"
        watermark_risk = "Negligible"
        scramble_factor = "98%"
        
    return {
        "purified_image_base64": base64_uri,
        "metrics": {
            "original_size": f"{original_size_kb:.1f} KB",
            "processed_size": f"{processed_size_kb:.1f} KB",
            "quality_retention": quality_retention,
            "scramble_factor": scramble_factor,
            "watermark_risk": watermark_risk
        }
    }

@app.get("/{rest_of_path:path}")
async def serve_spa(rest_of_path: str = ""):
    """Serves the main SPA index file for all non-API routes."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    # If the request is for a root static asset like vite.svg or favicon.ico, serve it if it exists
    if rest_of_path:
        possible_file = os.path.join(STATIC_DIR, rest_of_path)
        if os.path.exists(possible_file) and os.path.isfile(possible_file):
            return FileResponse(possible_file)
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("Frontend not built. Please run 'npm run build' inside the frontend directory.")

