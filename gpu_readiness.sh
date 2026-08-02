#!/usr/bin/env bash
# Read-only NVIDIA and CUDA readiness check.
set -euo pipefail

section() { printf '\n===== %s =====\n' "$1"; }

section "NVIDIA INVENTORY"
if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi --query-gpu=name,driver_version,memory.total,temperature.gpu,pstate --format=csv,noheader
  section "GPU PROCESSES"
  nvidia-smi pmon -c 1 || true
else
  echo "nvidia-smi was not found. Check driver installation or PATH."
fi

section "CUDA"
if command -v nvcc >/dev/null 2>&1; then
  nvcc --version
else
  echo "CUDA compiler (nvcc) is not installed or not in PATH."
fi

section "PYTORCH"
if command -v python3 >/dev/null 2>&1; then
  python3 - <<'PY'
try:
    import torch
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"CUDA build: {torch.version.cuda}")
    if torch.cuda.is_available():
        print(f"GPU 0: {torch.cuda.get_device_name(0)}")
except ImportError:
    print("PyTorch is not installed in this Python environment.")
PY
fi
