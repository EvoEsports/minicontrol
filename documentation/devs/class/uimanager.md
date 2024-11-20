# UImanager

Adapter class to transform manialink v3 to legacy formats and manage overall Manialink actions and drawing.
Usually you no need to operate directly with ui manager, as the main ui is handled automatically from the classes.

We use twig as template language, see https://twig.symfony.com/doc/3.x/templates.html for more details on how to use.
MINIcontrol uses manialink v3 for all games, for manialink tutorial: https://wiki.trackmania.io/en/ManiaScript/UI-Manialinks/Manialinks
Please note that you can use safely for all games:
```xml
    <frame>, <quad>, <label>, <entry>, <textedit>
```
To create background hoverable buttons ets... use:

```xml
<label focusareacolor1="" focusareacolor2="" />
```

# Example how to create simple widgets
```ts
  const widget = new Widget("core/plugins/debugtool/widget.twig");
  await widget.display();
```
