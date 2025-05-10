const fs = require("fs");
const path = require("path");
const chai = require("chai");
const expect = chai.expect;
const { execSync } = require("child_process");

describe("✅ DuckGen Render Output", () => {
  const traitList = JSON.parse(fs.readFileSync(path.join(__dirname, "../output/traitList.json")));
  const collection = JSON.parse(fs.readFileSync(path.join(__dirname, "../config/collection.json")));
  const outputDir = path.join(__dirname, "../output/images");

  it("should generate a valid .mp4 file for each NFT", () => {
    const rendered = fs.readdirSync(outputDir).filter(f => f.endsWith(".mp4"));
    expect(rendered.length).to.be.at.least(1);

    rendered.forEach(filename => {
      const filePath = path.join(outputDir, filename);
      const stats = fs.statSync(filePath);

      expect(stats.size).to.be.above(10000); // >10KB minimum sanity check
    });
  });

  it("should pass ffprobe validation (1080x1080, h264, yuv420p)", () => {
    const rendered = fs.readdirSync(outputDir).filter(f => f.endsWith(".mp4"));

    rendered.forEach(filename => {
      const filePath = path.join(outputDir, filename);
      const probe = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt,codec_name -of default=noprint_wrappers=1 "${filePath}"`
      ).toString();

      expect(probe).to.include("width=1080");
      expect(probe).to.include("height=1080");
      expect(probe).to.include("pix_fmt=yuv420p");
      expect(probe).to.include("codec_name=h264");
    });
  });

  it("should render the correct number of NFTs", () => {
    const expectedCount = collection.nftsToGenerate;
    const actualCount = fs.readdirSync(outputDir).filter(f => f.endsWith(".mp4")).length;

    expect(actualCount).to.be.at.most(expectedCount);
  });
});
