var path = require("path");

module.exports = (env) => {
  const mode = env === "dev" ? "development" : "production";

  return {
    entry: "./src/index.tsx",
    output: {
        filename: "bundle.js",
        path: path.join(__dirname, "dist")
    },

    mode: mode,

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",
    performance: {
      hints: false
    },

    devServer: {
        static: {
          directory: __dirname,
        },
        port: 8080
    },

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
        ]
    },
  }
};
