# Install MINIcontrol

You can either use git clone to download the controller, or [download a zip](https://github.com/EvoEsports/minicontrol/archive/refs/heads/main.zip) from Github. Alternatively you can also run it inside a Docker container.

```bash
git clone https://github.com/evoesports/minicontrol.git
```

## With Node.js

1. Clone the repository or download the files from the `main` branch
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill out all necessary information in the `.env` file.
4. Run `npm start`

## With Docker

* See `docker/compose.yml` for an example Docker Compose file.

## Controlling plugin loading

If you want to restrict which plugins get loaded at startup, set the PLUGINS environment variable in your `.env` or docker compose configuration. This variable is an inclusive, comma-separated whitelist of plugin IDs.

Examples:

```env
PLUGINS="admin,announces"
```

Note: when you use `PLUGINS` as a whitelist you must explicitly include any plugin dependencies in the list, otherwise the resolver won't see those dependencies.

You can also use simple wildcard patterns. Example: `PLUGINS="kacky/*,announces"` will include any plugin whose id starts with `kacky/` (for example: `kacky/foo`, `kacky/bar/baz`).
