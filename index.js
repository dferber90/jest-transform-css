const fs = require("fs");
const crypto = require("crypto");
const crossSpawn = require("cross-spawn");
const path = require("path");
const stripIndent = require("common-tags/lib/stripIndent");
const THIS_FILE = fs.readFileSync(__filename);

module.exports = {
  getCacheKey: (fileData, filename, configString, options) => {
    // Jest 27 passes a single options bag which contains `configString` rather than as a separate argument
    if (!options) {
      options = configString;
      configString = options.configString;
    }
    const { instrument } = options;
    return (
      crypto
        .createHash("md5")
        .update(THIS_FILE)
        .update("\0", "utf8")
        .update(fileData)
        .update("\0", "utf8")
        .update(filename)
        .update("\0", "utf8")
        .update(configString)
        .update("\0", "utf8")
        .update(JSON.stringify(options.transformerConfig))
        // TODO load postcssrc (the config) sync and make it part of the cache
        // key
        // .update("\0", "utf8")
        // .update(getPostCssConfig(filename))
        .update("\0", "utf8")
        .update(instrument ? "instrument" : "")
        .digest("hex")
    );
  },

  process: (src, filename, config, options) => {
    // skip when plain CSS is used
    // You can pass config to the transformer in jest.config.js like so:
    // "^.+\\.css$": ["jest-transform-css", { modules: true }]
    // to enable css module transformation.
    const useModules =
      config &&
      config.transformerConfig &&
      ((typeof config.transformerConfig.modules === "boolean" &&
        config.transformerConfig.modules));
    if (!useModules) {
      return {
        code: stripIndent`
          const styleInject = require('style-inject');

          styleInject(${JSON.stringify(src)});
          module.exports = {};
        `,
      };
    }

    // The "process" function of this Jest transform must be sync,
    // but postcss is async. So we spawn a sync process to do an sync
    // transformation!
    // https://twitter.com/kentcdodds/status/1043194634338324480
    const postcssRunner = JSON.stringify(path.join(__dirname, "postcss-runner.js"));
    const result = crossSpawn.sync("node", [
      "-e",
      stripIndent`
        require(${postcssRunner})(
          ${JSON.stringify({
            src,
            filename,
            transformConfig: config.transformerConfig,
            // options
          })}
        )
        .then(out => { console.log(JSON.stringify(out)) })
      `,
    ]);

    // check for errors of postcss-runner.js
    const error = result.stderr.toString();
    if (result.status !== 0 && error) throw error;

    // read results of postcss-runner.js from stdout
    let css;
    let tokens;
    try {
      // we likely logged something to the console from postcss-runner
      // in order to debug, and hence the parsing fails!
      const parsed = JSON.parse(result.stdout.toString());
      css = parsed.css;
      tokens = parsed.tokens;
      if (Array.isArray(parsed.warnings))
        parsed.warnings.forEach((warning) => {
          console.warn(warning);
        });
    } catch (error) {
      // we forward the logs and return no mappings
      console.error(result.stderr.toString());
      console.log(result.stdout.toString());
      return {
        code: stripIndent`
          console.error("transform-css: Failed to load '${filename}'");
          module.exports = {};
        `,
      };
    }

    // Finally, inject the styles to the document
    return {
      code: stripIndent`
        const styleInject = require('style-inject');

        styleInject(${JSON.stringify(css)});
        module.exports = ${JSON.stringify(tokens)};
      `,
    };
  },
};
