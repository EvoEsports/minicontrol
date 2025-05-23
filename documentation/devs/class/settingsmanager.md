# Settings manager

To use settings is easy, you first need to define the setting by calling preferably onLoad:

```ts
tmc.settings.register('setting.key', defaultValue, null, "description");
// or
tmc.settings.register('setting.key', defaultValue, async (value, oldValue) => {} , "description");
// or
tmc.settings.register('setting.key', defaultValue, this.callback.bind(this), "description");
```

Callback is triggered when setting value is changed, to ignore use null.
await is needed, if you wish to wait for the callback to finish.

```ts
await tmc.settings.set('setting.key', value);
```

to access use the Setting manager get:

```ts
tmc.settings.get('setting.key');
```

# Callbacks

```ts
tmc.server.addListener("TMC.SettingsChanged", this.settingsChanged, this);
tmc.server.addListener("TMC.AdminsChanged", this.adminsChanged, this);
tmc.server.addListener("TMC.ColorsChanged", this.colorsChanged, this);
```
