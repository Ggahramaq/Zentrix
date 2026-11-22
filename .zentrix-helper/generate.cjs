const fs = require("node:fs");
const sharp = require("sharp");

async function run() {
  const svg = fs.readFileSync("app/icon.svg");
  async function render(size) {
    return sharp(svg, { density: 72 * size / 166 }).resize(size, size).png().toBuffer();
  }
  for (const [path, size] of [["app/apple-icon.png", 180], ["public/icon-192.png", 192], ["public/icon-512.png", 512]]) {
    fs.writeFileSync(path, await render(size));
  }
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(render));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(sizes[i], entry);
    header.writeUInt8(sizes[i], entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  fs.writeFileSync("app/favicon.ico", Buffer.concat([header, ...images]));
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
