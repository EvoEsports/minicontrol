# Settings manager

To use settings is easy, you first need to define the setting by calling preferably onLoad:

```ts
tmc.settings.register('setting.key', value, callback, "description");
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
