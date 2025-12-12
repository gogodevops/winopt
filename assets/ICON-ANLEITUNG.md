# Icon für Windows Optimizer Pro

## 📁 Dateien

- `icon.svg` - Vector-Icon (kann beliebig skaliert werden)
- `icon.ico` - Windows Icon (musst du noch erstellen)

## 🎨 Icon-Design

Das Icon zeigt:
- **4 Quadrate** (Windows-Style)
- **Cyan-Lila Gradient** (passend zum App-Design)
- **Blitz-Symbol** (für Optimierung/Performance)
- **Dunkler Hintergrund** (moderner Look)

## 🔧 SVG zu ICO konvertieren

### Option 1: Online-Tool (Einfachst)

1. Gehe zu: **https://convertio.co/de/svg-ico/**
2. Upload `icon.svg`
3. Konvertiere zu ICO
4. Download als `icon.ico`
5. Speichere in diesem `assets/` Ordner

### Option 2: CloudConvert

1. Gehe zu: **https://cloudconvert.com/svg-to-ico**
2. Upload `icon.svg`
3. Wähle Größe: **256x256**
4. Konvertiere
5. Download und speichere als `icon.ico`

### Option 3: Mit npm (für Entwickler)

```bash
npm install -g icon-gen
icon-gen -i icon.svg -o . -m ico
```

## 📐 Empfohlene Icon-Größen

Für Windows ICO-Datei sollten diese Größen enthalten sein:
- 16x16
- 32x32
- 48x48
- 256x256

Die Online-Tools machen das automatisch!

## ✅ Nach der Konvertierung

1. Stelle sicher dass `icon.ico` in `assets/` liegt
2. Rebuild die App: `npm run build`
3. Die App hat jetzt dein custom Icon! 🎉

## 🎨 Icon anpassen?

Öffne `icon.svg` in:
- **Inkscape** (kostenlos)
- **Adobe Illustrator**
- **Figma** (online, kostenlos)
- Oder jedem SVG-Editor

Ändere die Farben, Formen, etc. und konvertiere neu!

## 💡 App-Name schön machen

In `main.js` und `package.json`:

```json
{
  "name": "windows-optimizer-pro",
  "productName": "Windows Optimizer Pro",
  "description": "Optimiere dein Windows System"
}
```

Der `productName` wird in:
- Windows Taskleiste
- Fenster-Titel
- Startmenü
angezeigt!
