@echo off
echo [1/4] Creating Python 3.11 virtual environment...
py -3.11 -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create venv. Is Python 3.11 installed?
    pause
    exit /b 1
)

echo [2/4] Activating venv...
call venv\Scripts\activate

echo [3/4] Installing PyTorch (CPU only)...
pip install torch --index-url https://download.pytorch.org/whl/cpu --quiet
if errorlevel 1 (
    echo ERROR: Failed to install PyTorch.
    pause
    exit /b 1
)

echo [4/4] Installing remaining dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo ✓ Setup complete. Run: python setup.py
pause
