/**
 * One-off / CI helper: generate the landing hero with GPT-Image-2 and write
 * public/images/agroconnect-hero.webp. Requires OPENAI_API_KEY in the environment.
 */
import { generateAndSaveAgroConnectHeroImage } from "../src/lib/openai/image-generation";

async function main() {
  const result = await generateAndSaveAgroConnectHeroImage();
  console.log(
    JSON.stringify({
      ok: true,
      publicPath: result.publicPath,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      model: result.model,
      format: result.format,
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
