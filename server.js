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

app.post('/extract-frames', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  const videoPath = req.file.path;
  const timestamp = Date.now();
  const outputDir = path.join('frames', timestamp.toString());
  
  fs.mkdirSync(outputDir, { recursive: true });

  ffmpeg(videoPath)
    .outputOptions(['-vf fps=0.5'])
    .save(path.join(outputDir, 'frame_%04d.png'))
    .on('end', () => {
      const files = fs.readdirSync(outputDir);
      res.json({
        success: true,
        frameCount: files.length,
        frames: files.map(f => `${outputDir}/${f}`)
      });
      fs.unlinkSync(videoPath);
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
