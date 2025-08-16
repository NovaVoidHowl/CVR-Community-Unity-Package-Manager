# CVR Unity Package Manager Icons

This directory should contain the application icons in the following formats:

- `32x32.png` - 32x32 pixel PNG icon
- `128x128.png` - 128x128 pixel PNG icon
- `128x128@2x.png` - 256x256 pixel PNG icon for high-DPI displays
- `icon.icns` - macOS icon file
- `icon.ico` - Windows icon file

These icons will be used for the application window, taskbar, and installer.

You can generate these from a single high-resolution source image using tools like:

- [Tauri Icon](https://tauri.app/v1/guides/features/icons)
- [Icon Generator](https://www.favicon-generator.org/)
- Adobe Photoshop or GIMP

## Generating Icons

If you have a source PNG file (ideally 512x512 or larger), you can use Tauri's built-in icon generation:

```bash
npm install --save-dev @tauri-apps/cli
npx tauri icon path/to/your/icon.png
```

This will generate all required icon formats automatically.
