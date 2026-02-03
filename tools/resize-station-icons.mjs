import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ICONS_DIR = "public/station-icons";
const MAX_SIZE = 120;
const SUPPORTED = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const isSupported = (file) => SUPPORTED.has(path.extname(file).toLowerCase());

const main = async () => {
  const entries = await fs.readdir(ICONS_DIR);
  let processed = 0;

  for (const file of entries) {
    if (!isSupported(file)) continue;
    const inputPath = path.join(ICONS_DIR, file);

    try {
      const image = sharp(inputPath, { failOn: "none" });
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) continue;
      if (metadata.width <= MAX_SIZE && metadata.height <= MAX_SIZE) continue;

      await image
        .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "inside", withoutEnlargement: true })
        .toFile(inputPath + ".tmp");

      await fs.rename(inputPath + ".tmp", inputPath);
      processed += 1;
    } catch (error) {
      console.warn(`Skipped ${file}: ${error.message}`);
    }
  }

  console.log(`Resized ${processed} station icons to max ${MAX_SIZE}x${MAX_SIZE}.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
