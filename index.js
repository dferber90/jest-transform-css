const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const crossSpawn = require("cross-spawn");
const stripIndent = require("common-tags/lib/stripIndent");
const THIS_FILE = fs.readFileSync(__filename);

module.exports = {
  getCacheKey: (fileData, filename, configString, { instrument, rootDir }) => {
    return (
      crypto
        .createHash("md5")
        .update(THIS_FILE)
        .update("\0", "utf8")
        .update(fileData)
        .update("\0", "utf8")
        .update(path.relative(rootDir, filename))
        .update("\0", "utf8")
        .update(configString)
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
    // The "process" function of this Jest transform must be sync,
    // but postcss is async. So we spawn a sync process to do an sync
    // transformation!
    // https://twitter.com/kentcdodds/status/1043194634338324480
    const postcssRunner = `${__dirname}/postcss-runner.js`;
    const result = crossSpawn.sync("node", [
      "-e",
      stripIndent`
        require("${postcssRunner}")(
          ${JSON.stringify({
            src,
            filename
            // config,
            // options
          })}
        )
        .then(out => { console.log(JSON.stringify(out)) })
      `
    ]);

    // check for errors of postcss-runner.js
    const error = result.stderr.toString();
    if (error) throw error;

    // read results of postcss-runner.js from stdout
    let css;
    let tokens;
    try {
      // we likely logged something to the console from postcss-runner
      // in order to debug, and hence the parsing fails!
      parsed = JSON.parse(result.stdout.toString());
      css = parsed.css;
      tokens = parsed.tokens;
      if (Array.isArray(parsed.warnings))
        parsed.warnings.forEach(warning => {
          console.warn(warning);
        });
    } catch (error) {
      // we forward the logs and return no mappings
      console.error(result.stderr.toString());
      console.log(result.stdout.toString());
      return stripIndent`
        console.error("transform-css: Failed to load '${filename}'");
        module.exports = {};
      `;
    }

    // Finally, inject the styles to the document
    return stripIndent`
      const styleInject = require('style-inject');

      styleInject(${JSON.stringify(css)});
      module.exports = ${JSON.stringify(tokens)};
    `;
  }
};
