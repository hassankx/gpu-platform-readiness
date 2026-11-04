[🌌 View the black-and-Milky-Way themed page](index.html) · [Open HTML source](https://github.com/hassankx/gpu-platform-readiness/blob/main/index.html)

> GitHub README pages use GitHub's own theme. Download `index.html` and open it in a browser to see the full starfield design.

# GPU Platform Readiness

A read-only check for NVIDIA GPU hosts used for AI/ML training and inference, visualization, or HPC. Run it on a new node before it joins a cluster, after a driver upgrade, or when jobs start failing on one machine.

Nothing on the host is changed. It does not touch persistence mode, clocks, power limits, or driver settings.

## What it checks

| Area | Checks |
| --- | --- |
| Inventory | GPUs the driver can see, model, driver version, memory, temperature, persistence mode |
| Health | ECC mode, uncorrected ECC errors, pending retired pages, active throttle reasons |
| Topology | NVLink and PCIe paths between GPUs and NICs (`nvidia-smi topo -m`) |
| Processes | Compute processes currently holding GPU memory |
| Driver | Loaded NVIDIA kernel modules and version |
| CUDA | `nvcc` toolkit version, when installed |
| PyTorch | CUDA build, device list, and a small test allocation to prove the runtime works |
| SLURM | Node state and GRES, and whether SLURM's GPU count matches what the driver reports |

The SLURM comparison catches a common failure: a card drops off the bus, the node stays in service, and jobs that request all of its GPUs fail or queue forever.

## Usage

```bash
chmod +x gpu_readiness.sh
./gpu_readiness.sh
```

## Sample output

```text
===== GPU HEALTH =====
GPU 0: ECC Enabled, uncorrected errors 0, retired pages pending No
GPU 1: ECC Enabled, uncorrected errors 3, retired pages pending Yes
[ISSUE] 3 uncorrected ECC error(s) since driver load

===== SLURM =====
State=IDLE+DRAIN
CfgTRES=cpu=64,mem=512G,gres/gpu=4
[ISSUE] SLURM reports this node as IDLE+DRAIN
[ISSUE] SLURM is configured for 4 GPU(s) but the driver sees 2

===== SUMMARY =====
3 issue(s) found. Review the [ISSUE] lines above.
```

## Exit codes

`0` when no issues are found and `1` when any `[ISSUE]` line is printed, so the script can gate a node in a provisioning pipeline or a SLURM health check.

## Requirements

Bash 4+, the NVIDIA driver (`nvidia-smi`). CUDA, PyTorch and SLURM are optional; their sections are skipped when the tools are absent.

## License

MIT
