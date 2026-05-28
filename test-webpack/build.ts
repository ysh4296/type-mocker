import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import webpack from "webpack"
import { webpack as tsMock } from "../src/plugin/index.ts"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

const compiler = webpack({
  mode: "development",
  devtool: false,
  entry: resolve(__dirname, "src/main.ts"),
  output: {
    path: resolve(__dirname, "dist"),
    filename: "main.js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "ts-to-mock": resolve(__dirname, "../src/index.ts"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: { loader: "ts-loader", options: { transpileOnly: true } },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [tsMock({ dir: resolve(__dirname, "src") })],
})

compiler.run((err, stats) => {
  if (err) { console.error(err); process.exit(1) }
  if (stats?.hasErrors()) { console.error(stats.toString({ colors: true })); process.exit(1) }
  console.log(stats?.toString({ colors: true, modules: false, assets: true }))
  console.log("\n✓ webpack 빌드 완료 → open index.html")
})
