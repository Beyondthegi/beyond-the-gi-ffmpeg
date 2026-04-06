const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Increase limits for larger video uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 }   // 500 MB limit
});

app.use(cors());
app.use(express.json());

app.post('/extract-frames', upload.any(), (req, res) => {
  console.log('Received request. Files received:', req.files ? req.files.length : 0);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  const videoFile = req.files[0];
  const videoPath = videoFile.path;
  const timestamp = Date.now();
  const outputDir = path.join('frames', timestamp.toString());

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Processing video: ${videoFile.originalname} (${videoFile.size} bytes)`);

  ffmpeg(videoPath)
    .outputOptions(['-vf fps=0.5'])
    .save(path.join(outputDir, 'frame_%04d.png'))
    .on('end', () => {
      const files = fs.readdirSync(outputDir);
      console.log(`Successfully extracted ${files.length} frames`);
      res.json({
        success: true,
        frameCount: files.length,
        frames: files.map(f => `${outputDir}/${f}`)
      });
      fs.unlinkSync(videoPath);
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err);
      res.status(500).json({ error: err.message });
      fs.unlinkSync(videoPath);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FFmpeg service running on port ${PORT}`);
});
