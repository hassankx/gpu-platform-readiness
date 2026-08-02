# GPU Platform Readiness

Read-only checks for NVIDIA GPU hosts used for AI, ML, visualization, or HPC workloads.

## What it checks

- NVIDIA driver and GPU inventory
- CUDA compiler availability
- GPU processes and memory use
- PyTorch CUDA availability, when PyTorch is installed

## Usage

```bash
chmod +x gpu_readiness.sh
./gpu_readiness.sh
```

This is a sample assessment tool. It does not change persistence mode, clock settings, power limits, or driver configuration.
