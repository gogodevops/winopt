# Beitragen zu Windows Optimizer Pro

Danke, dass du dich entschieden hast, zu Windows Optimizer Pro beizutragen! 🎉

## Wie kann ich beitragen?

Es gibt viele Wege, wie du zu diesem Projekt beitragen kannst:

### 🐛 Bug Reports

Wenn du einen Bug findest:

1. **Prüfe** ob der Bug bereits gemeldet wurde in den [Issues](https://github.com/gogodevops/winopt/issues)
2. **Erstelle** ein neues Issue mit:
   - Klarem, beschreibendem Titel
   - Detaillierter Beschreibung des Problems
   - Schritten zur Reproduktion
   - Screenshots (falls relevant)
   - Deine Windows-Version
   - App-Version

### 💡 Feature Requests

Hast du eine Idee für ein neues Feature?

1. **Prüfe** ob das Feature bereits vorgeschlagen wurde
2. **Erstelle** ein Issue mit:
   - Beschreibung des Features
   - Warum es nützlich wäre
   - Mögliche Implementierungsideen

### 🔧 Code-Beiträge

#### Vorbereitung

1. **Fork** das Repository
2. **Clone** dein Fork:
   ```bash
   git clone https://github.com/DEIN-USERNAME/winopt.git
   cd winopt
   ```
3. **Installiere** Dependencies:
   ```bash
   npm install
   ```

#### Entwicklung

1. **Erstelle** einen Branch:
   ```bash
   git checkout -b feature/mein-feature
   # oder
   git checkout -b fix/mein-bugfix
   ```

2. **Mache** deine Änderungen
   - Halte dich an den bestehenden Code-Style
   - Kommentiere komplexe Logik
   - Teste deine Änderungen gründlich

3. **Committe** deine Änderungen:
   ```bash
   git add .
   git commit -m "Add: Beschreibung deiner Änderung"
   ```

   **Commit-Nachricht Format:**
   - `Add:` für neue Features
   - `Fix:` für Bug-Fixes
   - `Update:` für Updates/Verbesserungen
   - `Remove:` für gelöschten Code
   - `Refactor:` für Code-Umstrukturierung

4. **Push** zum Branch:
   ```bash
   git push origin feature/mein-feature
   ```

5. **Öffne** einen Pull Request auf GitHub

#### Pull Request Guidelines

- **Beschreibe** was dein PR macht
- **Verweise** auf relevante Issues (#123)
- **Teste** deine Änderungen
- **Screenshots** bei UI-Änderungen
- **Warte** auf Review

### 📚 Dokumentation

Verbesserungen an der Dokumentation sind immer willkommen:

- README verbessern
- Code-Kommentare hinzufügen
- Beispiele hinzufügen
- Tippfehler korrigieren

### 🌍 Übersetzungen

Hilf dabei, die App in andere Sprachen zu übersetzen:

- UI-Texte übersetzen
- README in andere Sprachen
- Dokumentation übersetzen

## Code Style

### JavaScript

```javascript
// Verwende sinnvolle Variablennamen
const userSettings = getUserSettings();

// Kommentiere komplexe Logik
// Prüfe ob Backup existiert, bevor Registry geändert wird
if (backupExists) {
    applyRegistryTweak();
}

// Verwende async/await statt Promises
async function loadBackups() {
    try {
        const data = await loadBackupFile();
        return data;
    } catch (error) {
        console.error('Fehler:', error);
    }
}
```

### HTML

```html
<!-- Einrückung: 4 Spaces -->
<div class="container">
    <h1>Titel</h1>
    <p>Text</p>
</div>
```

### CSS

```css
/* Verwende aussagekräftige Klassennamen */
.feature-card {
    background: var(--bg-tertiary);
    padding: 20px;
}

/* Gruppiere verwandte Styles */
.button {
    padding: 10px 20px;
    border-radius: 5px;
}
```

## Testing

Teste deine Änderungen gründlich:

1. **Starte** die App: `npm start`
2. **Teste** alle geänderten Features
3. **Prüfe** ob keine Fehler in der Console
4. **Teste** auf Windows 10 UND 11 (falls möglich)

## Was wird NICHT akzeptiert?

❌ Änderungen ohne Beschreibung
❌ Ungetesteter Code
❌ Code der Sicherheitsprobleme einführt
❌ Große Änderungen ohne vorherige Diskussion
❌ Code der gegen die Lizenz verstößt

## Fragen?

Bei Fragen:

- **Öffne** ein Issue
- **Schreibe** an gogodevelop@outlook.com
- **Schaue** in bestehende PRs/Issues

## Verhaltenskodex

- Sei respektvoll
- Konstruktive Kritik
- Keine Beleidigungen oder Diskriminierung
- Hilf anderen Contributors

## Lizenz

Indem du beiträgst, stimmst du zu, dass deine Beiträge unter der MIT Lizenz lizenziert werden.

---

**Vielen Dank für deinen Beitrag! 🙏**
