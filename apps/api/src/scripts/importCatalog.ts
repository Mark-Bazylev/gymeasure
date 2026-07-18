import "dotenv/config";
import { importWgerCatalog } from "../lib/catalogImport";

async function main() {
  console.log("Importing wger exercise catalog into Gymeasure…");
  const result = await importWgerCatalog();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
