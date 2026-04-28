"""
SchemaSync — desktop launcher.

Starts the FastAPI backend on localhost:8000, waits until it is ready,
then opens the app in the user's default browser.

Usage:
  python app.py                  (development)
  pyinstaller schemasync.spec    (build the exe)
"""

import sys
import time
import threading
import webbrowser
import urllib.request

import uvicorn
from backend.main import app  # direct import so PyInstaller can resolve it when frozen

HOST = "127.0.0.1"
PORT = 8000
URL  = f"http://{HOST}:{PORT}"


def _open_when_ready() -> None:
    health = f"{URL}/api/v1/health"
    for _ in range(100):
        try:
            urllib.request.urlopen(health, timeout=1)
            webbrowser.open(URL)
            return
        except Exception:
            time.sleep(0.15)
    webbrowser.open(URL)


if __name__ == "__main__":
    print(f"Starting SchemaSync on {URL} ...")
    threading.Thread(target=_open_when_ready, daemon=True).start()
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="warning",
    )
