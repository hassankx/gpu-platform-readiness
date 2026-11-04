# Processor Atlas social exports

Ready-to-upload animated videos derived from the original six processor diagrams.

- [LinkedIn video](media/Processor_Atlas_LinkedIn.mp4): 1080 × 1080, H.264 MP4, 24 fps, 72 seconds.
- [Facebook Story master](media/Processor_Atlas_Facebook_Story.mp4): 1080 × 1920, H.264 MP4, 24 fps, 72 seconds.
- [Post captions and Story order](captions.txt).

Download the MP4 rather than the HTML explorer for a native video upload. The generated media is silent, with visible titles, step labels, worked examples and moving data indicators. Playback duration is illustrative, not a performance comparison.

The vertical master can be split into six 12-second parts when the Story uploader has a shorter clip limit:

```bash
ffmpeg -ss 0 -i media/Processor_Atlas_Facebook_Story.mp4 -t 12 -c:v libx264 -an 01_CPU_Story.mp4
# Repeat from 12, 24, 36, 48 and 60 seconds for GPU, TPU, NPU, LPU and DPU.
```

## Reproduce the exports

Requirements: Node.js with sharp, Python with Pillow, and ffmpeg.

From the processor explorer directory:

```bash
node social/render-diagrams.cjs /absolute/path/to/intermediate-units
python3 social/render-videos.py /absolute/path/to/intermediate-units /absolute/path/to/output
```

`render-videos.py` also produces six individually encoded Story clips. Keep platform-specific controls away from the visible story text; the layout reserves top and bottom breathing room.

The files in this directory are publishing materials. Their presence on GitHub does not mean they have been posted to a social network.
