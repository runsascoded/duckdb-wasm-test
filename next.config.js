let basePathArgs = {}
if (process.env.CI) {
  const basePath = `/duckdb-wasm-test`
  basePathArgs = { basePath }
  console.log(`CI detected, setting basePath: ${basePath}`)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  output: "export",
  publicRuntimeConfig: {
    ...basePathArgs,
  },
  ...basePathArgs
}

module.exports = nextConfig
