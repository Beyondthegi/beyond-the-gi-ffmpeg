const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Very permissive multer settings
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 1024 * 1024 * 1024 }   // 1 GB limit
});

app.use(cors());
app.use(express.json());

app.post('/extract-frames', upload.any(), (req, res) => {
  console.log('=== REQUEST RECEIVED ===');
  console.log('Files received:', req.files ? req.files.length : 0);
  console.log('Fields received:', req.body);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No video received' });
  }

  const videoFile = req.files[0];
  console.log(`Processing file: ${videoFile.originalname} (${videoFile.size} bytes)`);

  const videoPath = videoFile.path;
  const timestamp = Date.now();
  const outputDir = path.join('frames', timestamp.toString());
  
  fs.mkdirSync(outputDir, { recursive: true });

  ffmpeg(videoPath)
    .outputOptions(['-vf fps=0.5'])
    .save(path.join(outputDir, 'frame_%04d.png'))
    .on('end', () => {
      const files = fs.readdirSync(outputDir);
      console.log(`Extracted ${files.length} frames`);
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
