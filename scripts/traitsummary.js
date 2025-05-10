const fs = require("fs");
const path = require("path");

const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
const layers = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/layers.json")));

const total = traitList.length;
const golden = traitList.filter(nft => nft.goldenEgg).length;

const layerCounts = {};
const traitCountsByLayer = {};

// Count appearances by layer and trait
for (const nft of traitList) {
  for (const trait of nft.traits) {
    const layer = trait.trait_type;
    const value = trait.value;

    layerCounts[layer] = (layerCounts[layer] || 0) + 1;

    if (!traitCountsByLayer[layer]) {
      traitCountsByLayer[layer] = {};
    }
    traitCountsByLayer[layer][value] = (traitCountsByLayer[layer][value] || 0) + 1;
  }
}

// === CONSOLE SUMMARY ===
console.log(`\n🔍 TRAIT MIXER SUMMARY`);
console.log(`Total NFTs: ${total}`);
console.log(`Golden Eggs: ${golden}\n`);

console.log(`🧱 Layer Usage:`);
Object.entries(layerCounts).forEach(([layer, count]) => {
  const pct = ((count / total) * 100).toFixed(2);
  console.log(`  ${layer}: ${count} (${pct}%)`);
});

console.log(`\n🎨 Trait Frequencies (Top):`);
Object.entries(traitCountsByLayer).forEach(([layer, traits]) => {
  const entries = Object.entries(traits).sort((a, b) => b[1] - a[1]);
  console.log(`  [${layer}]`);
  entries.slice(0, 3).forEach(([trait, count]) => {
    const pct = ((count / total) * 100).toFixed(2);
    console.log(`    ${trait}: ${count} (${pct}%)`);
  });
});

console.log(`\n📝 Full summary saved to /output/trait_summary.txt\n`);

// === WRITE TO FILE (ORDERED) ===
const layerOrder = layers
  .sort((a, b) => a.order - b.order)
  .map(layer => layer.traitType || layer.name);

const logPath = path.join(__dirname, "../output/trait_summary.txt");
const log = fs.createWriteStream(logPath);

log.write(`DuckGen Trait Summary — ${new Date().toISOString()}\n\n`);
log.write(`🧾 Total NFTs: ${total}\n`);
log.write(`🥚 Golden Eggs: ${golden}\n\n`);

log.write(`🧱 Layer Usage:\n`);
layerOrder.forEach(layer => {
  const count = layerCounts[layer] || 0;
  const pct = ((count / total) * 100).toFixed(2);
  log.write(`  ${layer}: ${count} (${pct}%)\n`);
});

log.write(`\n🎨 Trait Frequencies by Layer:\n`);
layerOrder.forEach(layer => {
  const traits = traitCountsByLayer[layer];
  if (!traits) return;
  log.write(`\n  [${layer}]\n`);
  Object.entries(traits)
    .sort((a, b) => b[1] - a[1])
    .forEach(([value, count]) => {
      const pct = ((count / total) * 100).toFixed(2);
      log.write(`    ${value}: ${count} (${pct}%)\n`);
    });
});

log.end();
