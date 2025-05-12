const fs = require("fs");
const path = require("path");
const chai = require("chai");
const expect = chai.expect;

describe("✅ DuckGen TraitMixer Output", () => {
  const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/collection.json")));
  const layers = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/layers.json")));

  it("should generate the exact number of NFTs requested", () => {
    expect(traitList.length).to.equal(config.nftsToGenerate);
  });

  it("should have unique DNA via filename", () => {
    const filenames = traitList.map(nft => nft.filename);
    const uniqueFilenames = new Set(filenames);
    expect(uniqueFilenames.size).to.equal(filenames.length);
  });

  it("should include valid trait values and layers", () => {
    const layerNames = layers.map(l => l.name);
    for (const nft of traitList) {
      nft.traits.forEach(trait => {
        expect(trait).to.have.property("value").that.is.a("string");
        expect(trait).to.have.property("layer").that.is.a("string");
        expect(layerNames).to.include(trait.layer).or.include("Special");
      });
    }
  });

  it("should honor min/max trait count", () => {
    for (const nft of traitList) {
      expect(nft.traits.length).to.be.within(config.minTraits, config.maxTraits);
    }
  });

  it("should inject the correct number of golden eggs", () => {
    const count = traitList.filter(nft => nft.goldenEgg).length;
    expect(count).to.equal(config.goldenEggsToInject);
  });
});
