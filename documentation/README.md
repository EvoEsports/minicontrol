MINIcontrol documentation site

This folder contains the project documentation used to build the static docs site.

How it works:
- We use **MkDocs** (+ Material theme) to convert the `documentation/` folder into a static site.
- Site configuration is in `mkdocs.yml` at the repo root.
- A GitHub Actions workflow (`.github/workflows/mkdocs-deploy.yml`) builds the site and deploys it to GitHub Pages.

Publishing
- The site is published to `gh-pages` via the workflow and should be available at:
  `https://evoesports.github.io/minicontrol` (once the first deployment runs successfully).

Contributing
- Edit or add markdown files inside `documentation/` and push to `dev` (or open a PR). The workflow will run on pushes to `dev` / `main` and will deploy updates to the docs site automatically.