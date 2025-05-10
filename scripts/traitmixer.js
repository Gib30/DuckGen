const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const configPath = path.join(__dirname, "../config");
const outputPath = path.join(__dirname, "../output");

const collection = JSON.parse(fs.readFileSync(path.join(configPath, "collection.json")));
const layers = JSON.parse(fs.readFileSync(path.join(configPath, "layers.json")));

const totalNFTs = collection.nftsToGenerate;
const goldenEggCount = collection.goldenEggsToInject || 0;
const filePrefix = collection.filePrefix || "duck";
const startIndex = collection.startIndex || 1;
const minTraits = collection.minTraits || 3;
const maxTraits = collection.maxTraits || 8;
const maxRetries = collection.maxRetries || 10000;

const generatedDNA = new Set();
const traitList = [];

// Secure random integer
function randomInt(max) {
  return crypto.randomInt(0, max);
}

// Weighted trait selector
function pickWeightedTrait(traits) {
  const filtered = traits.filter(t => t.weight > 0);
  const totalWeight = filtered.reduce((sum, t) => sum + t.weight, 0);
  const r = randomInt(totalWeight);
  let acc = 0;
  for (const trait of filtered) {
    acc += trait.weight;
    if (r < acc) return trait.name;
  }
  return filtered[filtered.length - 1].name;
}

// DNA hash
function generateDNA(traits) {
  const dnaStr = traits.map(t => `${t.layer}:${t.value}`).join("|");
  return crypto.createHash("sha256").update(dnaStr).digest("hex");
}

// NFT builder
function buildNFT(id) {
  const selectedTraits = [];
  for (const layer of layers.sort((a, b) => a.order - b.order)) {
    const shouldInclude = layer.required || randomInt(100) < layer.rarity;
    if (!shouldInclude) continue;

    const validTraits = layer.traits.filter(t => t.weight > 0);
    if (validTraits.length === 0) continue;

    const traitName = pickWeightedTrait(validTraits);
    selectedTraits.push({
      layer: layer.name,
      trait_type: layer.traitType || layer.name,
      value: traitName
    });
  }
  return selectedTraits;
}

// Main generation loop
let attempts = 0;
while (traitList.length < totalNFTs) {
  if (attempts++ > maxRetries) {
    console.error("❌ Max retries reached — possibly too many constraints or not enough trait combinations.");
    break;
  }

  const id = startIndex + traitList.length;
  const traits = buildNFT(id);

  const traitCount = traits.length;
  if (traitCount < minTraits || traitCount > maxTraits) continue;

  const dna = generateDNA(traits);
  if (generatedDNA.has(dna)) continue;

  generatedDNA.add(dna);
  traitList.push({
    id,
    filename: `${filePrefix}#${id}`,
    traits,
    goldenEgg: false
  });
}

// Inject golden eggs
if (collection.includeGoldenEggs && goldenEggCount > 0) {
  const indices = new Set();
  while (indices.size < goldenEggCount) {
    indices.add(randomInt(traitList.length));
  }
  for (const i of indices) {
    traitList[i].goldenEgg = true;
  }
}

// Write trait list
if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
fs.writeFileSync(path.join(outputPath, "traitList.json"), JSON.stringify(traitList, null, 2));

console.log(`✅ ${traitList.length} NFTs generated successfully.`);
