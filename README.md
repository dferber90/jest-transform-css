# jest-transform-css

A Jest transfomer which enables importing CSS into Jest's `jsdom`.

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

When you want to do Visual Regression Testing in Jest, it is important that the CSS of components is available to the test setup. So far, CSS was not part of tests as it was mocked away by `identity-obj-proxy`.

`jest-transform-css` is inteded to be used in an `jsdom` environment. When any component imports CSS in the test environment, then the loaded CSS will get added to `jsdom` using [`style-inject`](https://github.com/egoist/style-inject) - just like the Webpack CSS loader would do in a production environment. This means the full styles are added to `jsdom`.

This doesn't make much sense at first, as `jsdom` is headless (non-visual). However, we can copy the resulting document markup ("the HTML") of `jsdom` and copy it to a [`puppeteer`](https://github.com/googlechrome/puppeteer/) instance. We can let the markup render there and take a screenshot there. The [`jsdom-screenshot`](https://github.com/dferber90/jsdom-screenshot) package does exactly this.

Once we obtained a screenshot, we can compare it to the last version of that screenshot we took, and make tests fail in case they did. The [`jest-image-snapshot`](https://github.com/americanexpress/jest-image-snapshot) plugin does that.

## Installation

```bash
yarn add jest-transform-css --dev
```

## Setup

### Setup - adding `transform`

Open `jest.config.js` and modify the `transform`:

```
transform: {
  "^.+\\.js$": "babel-jest",
  "^.+\\.css$": "./jest-transform-css"
}
```

> Notice that `babel-jest` gets added as well.
>
> The `babel-jest` code preprocessor is enabled by default, when no other preprocessors are added. As `jest-transform-css` is a code preprocessor, `babel-jest` gets disabled when `jest-transform-css` is added.
>
> So it needs to be added again manually.
>
> See https://github.com/facebook/jest/tree/master/packages/babel-jest#setup

### Setup - removing `identity-obj-proxy`

If your project is using CSS Modules, then it's likely that `identity-obj-proxy` is configured. It needs to be removed in order for the styles of the `jest-transform-css` to apply.

So, remove these lines from `jest.config.js`:

```diff
"moduleNameMapper": {
-  "\\.(s?css|less)$": "identity-obj-proxy"
},
```

## Further setup

There are many ways to setup styles in a project (CSS modules, global styles, external global styles, local global styles, CSS in JS, LESS, SASS just to name a few). How to continue from here on depends on your project.

### Further Setup - PostCSS

If your setup is using `PostCSS` then you should add a `postcss.config.js` at the root of your folder.

You can apply certain plugins only when `process.env.NODE_ENV === 'test'`. Ensure that valid CSS can be generated. It might be likely that more functionality (transforms) are required to make certain CSS work (like background-images).

### Further Setup - css-loader

If your setup is using `css-loader` only, without PostCSS then you should be fine. When components import CSS in the test environment, then the CSS is transformed through PostCSS's `cssModules` plugin to generate the classnames. It also injects the styles into `jsdom`.

## Known Limitations

At the moment I struggled to get CSS from `node_modules` to transpile, due to the `jest` configuration. I might just be missing something obvious.
