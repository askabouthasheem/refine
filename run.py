import sys
import subprocess
import os

def check_and_install_dependencies():
    print("REFINE Engine Bootstrapping...")
    try:
        import fastapi
        import uvicorn
        import PIL
        import numpy
        import multipart
        print("[OK] All dependencies already satisfied.")
    except ImportError:
        print("Missing dependencies. Installing from requirements.txt...")
        requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
        if not os.path.exists(requirements_path):
            print("Error: requirements.txt not found. Cannot install dependencies automatically.")
            sys.exit(1)
        
        try:
            # Using sys.executable to run pip inside the same environment
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_path])
            print("[OK] Dependencies installed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Error occurred during dependency installation: {e}")
            sys.exit(1)

def run_server():
    print("Launching Uvicorn server on http://localhost:8000")
    import uvicorn
    # Start the server on port 8000
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    check_and_install_dependencies()
    run_server()
