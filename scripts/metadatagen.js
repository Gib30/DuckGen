const fs = require("fs");
const path = require("path");

const TRAITLIST_PATH = path.join(__dirname, "../output/traitList.json");
const COLLECTION_PATH = path.join(__dirname, "../config/collection.json");
const METADATA_DIR = path.join(__dirname, "../output/metadata");
const MASTER_METADATA_PATH = path.join(__dirname, "../output/master_metadata.json");

if (!fs.existsSync(METADATA_DIR)) fs.mkdirSync(METADATA_DIR, { recursive: true });

const traitList = JSON.parse(fs.readFileSync(TRAITLIST_PATH));
const collection = JSON.parse(fs.readFileSync(COLLECTION_PATH));

const combined = [];

traitList.forEach(nft => {
  const filename = nft.filename; // e.g., Duck#1

  const metadata = {
    name: `${filename}`,
    video: `${filename}.mp4`,
    image: `${filename}.png`,
    collection: {
      name: collection.collectionName,
      description: collection.description
    },
    attributes: nft.traits.map(t => ({
      trait_type: t.trait_type || t.layer || "Unknown",
      value: t.value
    }))
  };

  const filePath = path.join(METADATA_DIR, `${filename}.json`);
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  combined.push(metadata);
});

fs.writeFileSync(MASTER_METADATA_PATH, JSON.stringify(combined, null, 2));

console.log(`✅ Metadata written to ${METADATA_DIR} for ${traitList.length} NFTs`);
console.log(`📦 Master file: ${MASTER_METADATA_PATH}`);
