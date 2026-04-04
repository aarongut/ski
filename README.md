# Ski

## [ski.aarongutierrez.com](https://ski.aarongutierrez.com)

A portfolio site for my ski photography. Built with TypeScript, React, Vite, and <3

## Commands

- `vp dev` starts the Vite+ dev server.
- `vp check` runs formatting, linting, and type checks through Vite+.
- `vp fmt` formats supported source files through Oxfmt.
- `vp lint` runs Oxlint with type-aware checks.
- `vp build` creates a production build in `dist/`.
- `npm run images` regenerates hashed originals and resized image variants from `img/original/`, then prepends newly discovered images to `img/data.json` under a placeholder set you can fill in.
- `npm run publish` builds the app, uploads `dist/` and `img/` to S3, ensures CloudFront serves `index.html`, and invalidates `/` plus `/index.html`.

React Compiler is enabled through the Vite React plugin, so local dev and production builds both run with the compiler transform.

## Deploy Prerequisites

- The publish script expects AWS credentials under the `push` profile.
- Publishing uses the TypeScript script at `scripts/publish.ts`.
- `npm run publish` executes that script with Node's TypeScript support.
- `npm run images` expects `magick` to be installed and available on your shell path.
