const shell = require('shelljs');
const fs = require('fs');
const { execSync } = require('child_process');

const outputFile = 'output/duck01.mp4';

console.log("Starting DuckGen render test...");

if (!shell.which('ffmpeg') || !shell.which('ffprobe')) {
  console.error("❌ FFmpeg and/or FFprobe not found. Install and add to PATH.");
  process.exit(1);
}

const command = `
ffmpeg -y \
  -i background.mp4 \
  -i overlay.mov \
  -loop 1 -i trait1.png \
  -loop 1 -i trait2.png \
  -loop 1 -i trait3.png \
  -filter_complex "
    [0:v] setpts=PTS-STARTPTS, scale=1080:1080, fps=24 [bg];
    [2:v] setpts=PTS-STARTPTS, scale=1080:1080 [t1];
    [3:v] setpts=PTS-STARTPTS, scale=1080:1080 [t2];
    [4:v] setpts=PTS-STARTPTS, scale=1080:1080 [t3];
    [1:v] setpts=PTS-STARTPTS, scale=1080:1080, fps=24 [overlay];
    [bg][t1] overlay=format=auto [tmp1];
    [tmp1][t2] overlay=format=auto [tmp2];
    [tmp2][t3] overlay=format=auto [tmp3];
    [tmp3][overlay] overlay=format=auto:alpha=straight [outv]
  " \
  -map "[outv]" -vsync 0 -r 24 -frames:v 120 -c:v libx264 \
  -pix_fmt yuv420p -movflags +faststart -an ${outputFile}
`;

const result = shell.exec(command, { silent: false });

if (result.code !== 0) {
  console.error("❌ Render failed. Exit code:", result.code);
  process.exit(result.code);
}

if (!fs.existsSync(outputFile)) {
  console.error("❌ Output file not found.");
  process.exit(2);
}

try {
  const probeData = execSync(`ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt -of default=noprint_wrappers=1 "${outputFile}"`).toString();

  if (!probeData.includes("h264") || !probeData.includes("width=1080") || !probeData.includes("height=1080")) {
    console.error("⚠️ Output warning: unexpected codec or dimensions.");
    console.log(probeData);
    process.exit(3);
  }

  console.log("\n✅ Render complete and file integrity verified!");
} catch (e) {
  console.error("❌ FFprobe failed. Output may be corrupt.");
  console.error(e.message);
  process.exit(4);
}
