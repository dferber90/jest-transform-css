# jest-transform-css

A Jest transformer which enables importing CSS into Jest's `jsdom`.

**If you are not here for Visual Regression Testing, but just want to make your tests work with CSS Modules, then you are likley looking for https://github.com/keyanzhang/identity-obj-proxy/.**

> ⚠️ **This package is experimental.**
> It works with the tested project setups, but needs to be tested in more.
> If you struggle to set it up properly, it might be the fault of this package.
> Please file an issue and provide reproduction, or even open a PR to add support.
>
> The document is also sparse at the moment. Feel free to open an issue in case you have any questions!
>
> I am not too familiar with PostCSS and Jest, so further simplification of
> this plugin might be possible. I'd appreciate any hints!
>
> If this approach is working for you, please let me know on Twitter ([@dferber90](https://twitter.com/dferber90)) or by starring the [GitHub repo](https://github.com/dferber90/jest-transform-css).
>
> I am looking for contributors to help improve this package!

## Description

When you want to do Visual Regression Testing in Jest, it is important that the CSS of components is available to the test setup. So far, CSS was not part of tests as it was mocked away by using `moduleNameMapper` like a file-mock or `identity-obj-proxy`.

`jest-transform-css` is intended to be used in an `jsdom` environment. When any component imports CSS in the test environment, then the loaded CSS will get added to `jsdom` using [`style-inject`](https://github.com/egoist/style-inject) - just like the Webpack CSS loader would do in a production environment. This means the full styles are added to `jsdom`.

This doesn't make much sense at first, as `jsdom` is headless (non-visual). However, we can copy the resulting document markup ("the HTML") of `jsdom` and copy it to a [`puppeteer`](https://github.com/googlechrome/puppeteer/) instance. We can let the markup render there and take a screenshot there. The [`jsdom-screenshot`](https://github.com/dferber90/jsdom-screenshot) package does exactly this.

Once we obtained a screenshot, we can compare it to the last version of that screenshot we took, and make tests fail in case they did. The [`jest-image-snapshot`](https://github.com/americanexpress/jest-image-snapshot) plugin does that.

## Setup

### Installation

```bash
yarn add jest-transform-css --dev
```

The old setup of CSS in jest needs to be removed, and the new setup needs to be added next.

### Removing module name mapping

If your project is using plain CSS imported in the components, then you're likely using a mock file. You can remove that configuration.

```diff
// in the Jest config
"moduleNameMapper": {
- "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
},
```

If your project is using CSS Modules, then it's likely that `identity-obj-proxy` is configured. It needs to be removed in order for the styles of the `jest-transform-css` to apply.

So, remove these lines from `jest.config.js`:

```diff
// in the Jest config
"moduleNameMapper": {
-  "\\.(s?css|less)$": "identity-obj-proxy"
},
```

### Adding `transform`

Open `jest.config.js` and modify the `transform`:

```
// in the Jest config
transform: {
  "^.+\\.js$": "babel-jest",
  "^.+\\.css$": "jest-transform-css"
}
```

> Notice that `babel-jest` gets added as well.
>
> The `babel-jest` code preprocessor is enabled by default, when no other preprocessors are added. As `jest-transform-css` is a code preprocessor, `babel-jest` gets disabled when `jest-transform-css` is added.
>
> So it needs to be added again manually.
>
> See https://github.com/facebook/jest/tree/master/packages/babel-jest#setup

### Enabling CSS modules

By default, `jest-transform-css` will treat every file it transforms as a regular CSS file.

You need to opt into css-modules mode by specifying it in the configuration. Create a file called `jesttransformcss.config.js` at your project root and add

```js
// jesttransformcss.config.js

module.exports = {
  modules: true
};
```

This will enable CSS module transformation for all CSS files transformed by `jest-transform-css`.

If your setup uses both, CSS modules and regular CSS, then you can determine how to load each file individually by specifying a function:

```js
// jesttransformcss.config.js

module.exports = {
  modules: filename => filename.endsWith(".mod.css")
};
```

This will load all files with `.mod.css` as CSS modules and load all other files as regular CSS. Notice that the function will only be called for whichever regex you provided in the `transform` option of the Jest config.

Also supports `generateScopedName` property to customize the generated class names. Helpful when using Jest Snapshots and not wanting unnecessary noise from hash generated classnames.

```js
// jesttransformcss.config.js

module.exports = {
  modules: true,
  generateScopedName: "[path]_[name]_[local]"
  // Default value is: '[path][local]-[hash:base64:10]'
};
```
Link to all available [placeholder tokens](https://github.com/webpack/loader-utils#interpolatename) \*Note not all placeholders are working and must be tested.

## Further setup

There are many ways to set up styles in a project (CSS modules, global styles, external global styles, local global styles, CSS in JS, LESS, SASS just to name a few). How to continue from here depends on your project.

### PostCSS

If your setup is using `PostCSS` then you should add a `postcss.config.js` at the root of your folder.

You can apply certain plugins only when `process.env.NODE_ENV === 'test'`. Ensure that valid CSS can be generated.

> `jest-transform-css` is likley not flexible enough yet to support more sophisticated PostCSS configurations. However, we should be able to add this functionality by extending the configuration file. Feel free to open an issue with your setup and we'll try to support it.

### css-loader

If your setup is using `css-loader` only, without PostCSS then you should be fine.
If you have `modules: true` enabled in `css-loader`, you need to also enable it for `jest-transform-css` (see "Enabling CSS modules"). When components import CSS modules in the test environment, then the CSS is transformed through PostCSS's `cssModules` plugin to generate the classnames. It also injects the styles into `jsdom`.
