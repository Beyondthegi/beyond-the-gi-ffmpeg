const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Accept ANY field name (fixes the Multer "Unexpected field" error)
app.post('/extract-frames', upload.any(), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  const videoFile = req.files[0];
  const videoPath = videoFile.path;
  const timestamp = Date.now();
  const outputDir = path.join('frames', timestamp.toString());
  
  fs.mkdirSync(outputDir, { recursive: true });

  ffmpeg(videoPath)
    .outputOptions(['-vf fps=0.5'])           // 1 frame every 2 seconds
    .save(path.join(outputDir, 'frame_%04d.png'))
    .on('end', () => {
      const files = fs.readdirSync(outputDir);
      res.json({
        success: true,
        frameCount: files.length,
        frames: files.map(f => `${outputDir}/${f}`)
      });
      fs.unlinkSync(videoPath); // clean up
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: err.message });
      fs.unlinkSync(videoPath);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FFmpeg service running on port ${PORT}`);
});
