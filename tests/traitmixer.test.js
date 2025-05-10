const fs = require("fs");
const path = require("path");
const chai = require("chai");
const expect = chai.expect;

describe("✅ DuckGen TraitMixer Output", () => {
  const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/collection.json")));

  it("should generate the exact number of NFTs requested", () => {
    expect(traitList.length).to.equal(config.nftsToGenerate);
  });

  it("should have unique filenames", () => {
    const filenames = traitList.map(nft => nft.filename);
    const uniqueFilenames = new Set(filenames);
    expect(uniqueFilenames.size).to.equal(filenames.length);
  });

  it("should have trait counts within min/max bounds", () => {
    for (const nft of traitList) {
      expect(nft.traits.length).to.be.within(config.minTraits, config.maxTraits);
    }
  });

  it("should contain valid layer and value fields in each trait", () => {
    for (const nft of traitList) {
      nft.traits.forEach(trait => {
        expect(trait).to.have.property("layer").that.is.a("string");
        expect(trait).to.have.property("value").that.is.a("string");
      });
    }
  });

  it("should include the correct number of golden eggs", () => {
    const goldenEggs = traitList.filter(nft => nft.goldenEgg);
    expect(goldenEggs.length).to.equal(config.goldenEggsToInject);
  });
});
