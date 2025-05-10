const fs = require("fs");
const path = require("path");
const shell = require("shelljs");
const { execSync } = require("child_process");

const TRAITLIST_PATH = path.join(__dirname, "../output/traitList.json");
const LAYERS_PATH = path.join(__dirname, "../config/layers.json");
const TRAITS_DIR = path.join(__dirname, "../traits");
const OUTPUT_DIR = path.join(__dirname, "../output/images");
const LOG_PATH = path.join(__dirname, "../output/render_log.txt");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const traitList = JSON.parse(fs.readFileSync(TRAITLIST_PATH));
const layers = JSON.parse(fs.readFileSync(LAYERS_PATH)).sort((a, b) => a.order - b.order);
const layerMap = Object.fromEntries(layers.map(l => [l.name, l]));

const LIMIT = process.argv.includes("--limit")
  ? parseInt(process.argv[process.argv.indexOf("--limit") + 1])
  : null;

const toRender = LIMIT ? traitList.slice(0, LIMIT) : traitList;

if (!shell.which("ffmpeg") || !shell.which("ffprobe")) {
  console.error("❌ FFmpeg or ffprobe not found in PATH.");
  process.exit(1);
}

const logStream = fs.createWriteStream(LOG_PATH);
logStream.write(`DuckGen Render Log — ${new Date().toISOString()}\n\n`);

function getTraitPath(layer, value) {
  const ext = layer.animated ? (layer.videoExt || "mov") : "png";
  return path.join(TRAITS_DIR, layer.name, `${value}.${ext}`);
}

function renderNFT(nft, attempt = 1) {
  const filename = `${nft.filename}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  if (fs.existsSync(outputPath)) {
    logStream.write(`⏩ Skipped ${filename} (already exists)\n`);
    return;
  }

  const inputs = [];
  const filters = [];
  let inputIdx = 0;
  let lastLabel = "[bg]";
  let hasVideoOverlay = false;

  // Step 1: Collect input layers
  const orderedLayers = layers;
  const usedTraits = [];

  orderedLayers.forEach(layer => {
    const trait = nft.traits.find(t => t.layer === layer.name);
    if (!trait) return;

    const traitPath = getTraitPath(layer, trait.value);
    if (!fs.existsSync(traitPath)) {
      logStream.write(`⚠️ Missing ${traitPath} — skipping this layer\n`);
      return;
    }

    usedTraits.push({ ...trait, path: traitPath, layer });
  });

  if (usedTraits.length === 0) {
    logStream.write(`❌ No usable traits for ${filename}, skipping\n`);
    return;
  }

  // Step 2: Add inputs & filters
  usedTraits.forEach(({ path: filePath, trait_type, layer }) => {
    if (layer.animated) {
      inputs.push(`-i "${filePath}"`);
      const label = `t${inputIdx}`;
      filters.push(`[${inputIdx}:v] setpts=PTS-STARTPTS, scale=1080:1080, fps=24 [${label}]`);
      filters.push(`${lastLabel}[${label}] overlay=format=auto:alpha=straight [tmp${inputIdx}]`);
      lastLabel = `[tmp${inputIdx}]`;
      hasVideoOverlay = true;
    } else {
      inputs.push(`-loop 1 -i "${filePath}"`);
      const label = `t${inputIdx}`;
      filters.push(`[${inputIdx}:v] setpts=PTS-STARTPTS, scale=1080:1080 [${label}]`);
      filters.push(`${lastLabel}[${label}] overlay=format=auto [tmp${inputIdx}]`);
      lastLabel = `[tmp${inputIdx}]`;
    }
    inputIdx++;
  });

  // Step 3: Final command
  const filterGraph = filters.join("; ");
  const command = `
    ffmpeg -y ${inputs.join(" ")} \
    -filter_complex "${filterGraph}" \
    -map ${lastLabel.replace(/\[|\]/g, "")} \
    -vsync 0 -r 24 -frames:v 120 \
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${outputPath}"
  `;

  const result = shell.exec(command, { silent: true });

  if (result.code !== 0) {
    if (attempt < 3) {
      logStream.write(`🔁 Retry ${filename} (Attempt ${attempt})\n`);
      return renderNFT(nft, attempt + 1);
    } else {
      logStream.write(`❌ Render failed for ${filename} after 3 attempts\n`);
      return;
    }
  }

  // Step 4: ffprobe verification
  try {
    const probe = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt,codec_name -of default=noprint_wrappers=1 "${outputPath}"`
    ).toString();

    const valid =
      probe.includes("width=1080") &&
      probe.includes("height=1080") &&
      probe.includes("pix_fmt=yuv420p") &&
      probe.includes("codec_name=h264");

    if (valid) {
      logStream.write(`✅ ${filename} rendered & verified\n`);
    } else {
      logStream.write(`⚠️ Format warning for ${filename}\n${probe}`);
    }
  } catch (err) {
    logStream.write(`❌ FFprobe error for ${filename}: ${err.message}\n`);
  }
}

// === Run render pass
toRender.forEach((nft, idx) => {
  console.log(`🎬 Rendering ${nft.filename} (${idx + 1}/${toRender.length})...`);
  renderNFT(nft);
});

logStream.end(() => console.log("📝 Render log saved to output/render_log.txt"));
console.log("✅ DuckGen rendering complete.");
