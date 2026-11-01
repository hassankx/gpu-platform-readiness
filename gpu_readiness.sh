#!/usr/bin/env bash
# gpu_readiness.sh - read-only readiness check for NVIDIA GPU hosts.
#
# Covers the driver, GPU health counters, interconnect topology, CUDA,
# PyTorch and, on cluster nodes, how SLURM sees the GPUs. Nothing on the
# host is changed: no persistence mode, clocks, power limits or driver
# settings are touched.
#
# Usage: ./gpu_readiness.sh
set -uo pipefail

ISSUES=0
section() { printf '\n===== %s =====\n' "$1"; }
issue()   { printf '[ISSUE] %s\n' "$1"; ISSUES=$((ISSUES + 1)); }
have()    { command -v "$1" >/dev/null 2>&1; }

section "NVIDIA INVENTORY"
if have nvidia-smi; then
  if ! nvidia-smi -L; then
    issue "nvidia-smi is installed but cannot talk to the driver"
  else
    nvidia-smi --query-gpu=index,name,driver_version,memory.total,temperature.gpu,pstate,persistence_mode \
      --format=csv

    section "GPU HEALTH"
    # Uncorrected ECC errors and retired pages are the usual early signs of a failing card.
    nvidia-smi --query-gpu=index,ecc.mode.current,ecc.errors.uncorrected.volatile.total,retired_pages.pending \
      --format=csv,noheader 2>/dev/null | while IFS=', ' read -r idx ecc unc pending; do
        echo "GPU ${idx}: ECC ${ecc}, uncorrected errors ${unc}, retired pages pending ${pending}"
      done
    unc_total=$(nvidia-smi --query-gpu=ecc.errors.uncorrected.volatile.total --format=csv,noheader 2>/dev/null \
      | awk '$1 ~ /^[0-9]+$/ {s += $1} END {print s + 0}')
    if (( unc_total > 0 )); then
      issue "${unc_total} uncorrected ECC error(s) since driver load"
    fi
    nvidia-smi --query-gpu=index,clocks_throttle_reasons.active --format=csv,noheader 2>/dev/null || true

    section "TOPOLOGY"
    # Shows NVLink and PCIe paths between GPUs and NICs, which matters for multi-GPU training.
    nvidia-smi topo -m 2>/dev/null || echo "Topology not available on this system."

    section "GPU PROCESSES"
    nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv 2>/dev/null || true
  fi
else
  issue "nvidia-smi was not found. Check the driver installation or PATH."
fi

section "KERNEL MODULES"
if [[ -r /proc/driver/nvidia/version ]]; then
  head -1 /proc/driver/nvidia/version
else
  echo "NVIDIA kernel module is not loaded."
fi
if have lsmod; then
  lsmod | awk 'NR == 1 || /^nvidia/' || true
fi

section "CUDA"
if have nvcc; then
  nvcc --version | tail -2
else
  echo "CUDA compiler (nvcc) is not installed or not in PATH. Runtime-only hosts do not need it."
fi

section "PYTORCH"
if have python3; then
  python3 - <<'PY'
try:
    import torch
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA build: {torch.version.cuda}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            print(f"GPU {i}: {torch.cuda.get_device_name(i)}")
        # A tiny allocation proves the runtime can actually use the device.
        x = torch.ones(1024, device="cuda")
        print(f"Test allocation on cuda:0: {'ok' if x.sum().item() == 1024 else 'failed'}")
except ImportError:
    print("PyTorch is not installed in this Python environment.")
except Exception as exc:  # report, do not crash the rest of the check
    print(f"PyTorch could not use the GPU: {exc}")
PY
else
  echo "python3 not found."
fi

section "SLURM"
if have scontrol; then
  node=$(hostname -s)
  if scontrol show node "$node" >/dev/null 2>&1; then
    scontrol show node "$node" | grep -Eo '(State|Gres|CfgTRES|AllocTRES|Reason)=[^ ]*' || true
    state=$(scontrol show node "$node" | grep -Eo 'State=[^ ]*' | cut -d= -f2)
    if [[ "$state" == *DRAIN* || "$state" == *DOWN* || "$state" == *FAIL* ]]; then
      issue "SLURM reports this node as ${state}"
    fi
    # Compare what SLURM thinks is installed with what the driver reports.
    if have nvidia-smi; then
      driver_gpus=$(nvidia-smi -L 2>/dev/null | wc -l)
      slurm_gpus=$(scontrol show node "$node" | grep -Eo 'gres/gpu=[0-9]+' | head -1 | cut -d= -f2)
      if [[ -n "${slurm_gpus:-}" && "$slurm_gpus" != "$driver_gpus" ]]; then
        issue "SLURM is configured for ${slurm_gpus} GPU(s) but the driver sees ${driver_gpus}"
      fi
    fi
  else
    echo "scontrol is installed but this host (${node}) is not a known SLURM node."
  fi
else
  echo "SLURM client tools not found; skipped."
fi

section "SUMMARY"
if (( ISSUES > 0 )); then
  echo "${ISSUES} issue(s) found. Review the [ISSUE] lines above."
  exit 1
fi
echo "No issues found."
exit 0
