# Install guide

Let's get started with, due the controller is coded with [Bun](https://bun.sh), you need to run it with a docker or a linux box, there's not yet windows version available.

## Install Bun 

Write at console:
```bash
curl -fsSL https://bun.sh/install | bash
```

Alternative if you have already node adn npm installed, you can say

```bash
npm i -g bun
```

To check your install: type
```bash
bun --version
```

## Install MINIcontrol

You can either use git to update and install initially the controller, or [download a zip](https://github.com/reaby/minicontrol.git) from the github.

```bash
git clone https://github.com/reaby/minicontrol.git
```

Afterwards go to the controller directory and say:
1. `bun install`
2. copy .env.example to .env and configure
3. enable or disable needed plugins at `plugins.json` 
4. run `bun start`
