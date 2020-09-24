const postcss = require("postcss");
const postcssrc = require("postcss-load-config");
const cssModules = require("postcss-modules");

// This script is essentially a PostCSS Runner
// https://github.com/postcss/postcss/blob/master/docs/guidelines/runner.md#postcss-runner-guidelines
module.exports = ({ src, filename, transformConfig }) => {
  const ctx = {
    // Not sure whether the map is useful or not.
    // Disabled for now. We can always enable it once it becomes clear.
    map: false,
    // To ensure that PostCSS generates source maps and displays better syntax
    // errors, runners must specify the from and to options. If your runner does
    // not handle writing to disk (for example, a gulp transform), you should
    // set both options to point to the same file"
    // https://github.com/postcss/postcss/blob/master/docs/guidelines/runner.md#21-set-from-and-to-processing-options
    from: filename,
    to: filename
  };
  let tokens = {};
  return postcssrc(ctx)
    .then(
      config => ({ ...config, plugins: config.plugins || [] }),
      error => {
        // Support running without postcss.config.js
        // This is useful in case the webpack setup of the consumer does not
        // use PostCSS at all and simply uses css-loader in modules mode.
        if (error.message.startsWith("No PostCSS Config found in:")) {
          return { plugins: [], options: { from: filename, to: filename } };
        }
        throw error;
      }
    )
    .then(({ plugins, options }) => {
      return postcss([
        cssModules({
          // Add 'generateScopedName' property to 'jesttransformcss.config.js' for custom name generation. 
          // List of available placeholder tokens: https://github.com/webpack/loader-utils#interpolatename
          // *Note some placeholder tokens appear to not be working
          generateScopedName:
            transformConfig && transformConfig.generateScopedName ||
            "[path][local]-[hash:base64:10]",
          getJSON: (cssFileName, exportedTokens, outputFileName) => {
            tokens = exportedTokens;
          }
        }),
        ...plugins
      ])
        .process(src, options)
        .then(
          result => ({
            css: result.css,
            tokens,
            // Display result.warnings()
            // PostCSS runners must output warnings from result.warnings()
            // https://github.com/postcss/postcss/blob/master/docs/guidelines/runner.md#32-display-resultwarnings
            warnings: result.warnings().map(warn => warn.toString())
          }),
          // Don’t show JS stack for CssSyntaxError
          // PostCSS runners must not show a stack trace for CSS syntax errors,
          // as the runner can be used by developers who are not familiar with
          // JavaScript. Instead, handle such errors gracefully:
          // https://github.com/postcss/postcss/blob/master/docs/guidelines/runner.md#31-dont-show-js-stack-for-csssyntaxerror
          error => {
            if (error.name === "CssSyntaxError") {
              process.stderr.write(error.message + error.showSourceCode());
            } else {
              throw error;
            }
          }
        );
    });
};
