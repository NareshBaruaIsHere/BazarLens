import runpy
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent
api_root = project_root / "bazarlens-api"

if not api_root.exists():
    raise FileNotFoundError(f"API folder not found: {api_root}")

sys.path.insert(0, str(api_root))
runpy.run_path(str(api_root / "test_db.py"), run_name="__main__")
