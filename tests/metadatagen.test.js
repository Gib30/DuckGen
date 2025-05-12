const fs = require("fs");
const path = require("path");
const chai = require("chai");
const expect = chai.expect;

describe("✅ DuckGen Metadata Output", () => {
  const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
  const collection = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/collection.json")));
  const metadataDir = path.join(__dirname, "../output/metadata");
  const masterMetadataPath = path.join(__dirname, "../output/master_metadata.json");

  it("should generate metadata files for every NFT", () => {
    const files = fs.readdirSync(metadataDir).filter(f => f.endsWith(".json"));
    expect(files.length).to.equal(traitList.length);
  });

  it("should contain valid fields in each file", () => {
    traitList.forEach(nft => {
      const filePath = path.join(metadataDir, `${nft.filename}.json`);
      const meta = JSON.parse(fs.readFileSync(filePath));

      expect(meta).to.have.property("name").that.is.a("string");
      expect(meta).to.have.property("video").that.is.a("string");
      expect(meta).to.have.property("image").that.is.a("string");
      expect(meta).to.have.property("collection").that.is.an("object");
      expect(meta.collection).to.have.property("name").that.equals(collection.collectionName);
      expect(meta.collection).to.have.property("description").that.equals(collection.description);
      expect(meta).to.have.property("attributes").that.is.an("array");
    });
  });

  it("should generate a master metadata file", () => {
    const combined = JSON.parse(fs.readFileSync(masterMetadataPath));
    expect(combined.length).to.equal(traitList.length);
    combined.forEach(meta => {
      expect(meta).to.have.property("video");
      expect(meta).to.have.property("image");
      expect(meta).to.have.property("attributes");
    });
  });
});
