import { program } from "commander"
import { generate } from "./generate"

program
  .name("ts-mock")
  .description("TypeScript mock data generator")

program
  .command("generate")
  .description("Generate __mocks__/index.ts and transform createMock calls")
  .option("-d, --dir <dir>",       "root directory to scan",              ".")
  .option("-o, --output <dir>",    "output directory for generated mocks", "__mocks__")
  .option("--exclude <dirs...>",   "directory names to exclude")
  .action((opts) =>
    generate({ dir: opts.dir, output: opts.output, exclude: opts.exclude })
      .catch((err) => { console.error(err); process.exit(1) })
  )

program.parse()
