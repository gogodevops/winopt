# Windows Optimizer Pro

Ein modernes, visuelles Tool zur Windows-Optimierung mit Fokus auf Datenschutz, Performance und Benutzerfreundlichkeit.

![Windows Optimizer Pro](https://img.shields.io/badge/Windows-10%2F11-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

## ✨ Features

- **🔒 Datenschutz & Telemetrie** - Deaktiviere Windows-Telemetrie, Cortana, Standortverfolgung und mehr
- **⚡ Performance-Optimierung** - Verbessere die Systemleistung durch Registry-Tweaks
- **🛠️ Dienste-Management** - Verwalte Windows-Dienste um Ressourcen zu sparen
- **🗑️ Bloatware-Entfernung** - Entferne vorinstallierte Apps die du nicht brauchst
- **🎨 Moderne UI** - Dunkles, modernes Design mit Animationen und visuellen Feedback
- **💾 Automatische Backups** - Sichere Registry-Backups werden automatisch erstellt
- **📊 System-Überwachung** - Überwache CPU, RAM, Festplatten und Netzwerk in Echtzeit

## 📸 Screenshots

*Screenshots folgen*

## 🚀 Installation

### Voraussetzungen

- Windows 10 (Version 1809+) oder Windows 11
- Node.js (Version 16 oder höher) - [Download](https://nodejs.org/)
- Administrator-Rechte

### Schritt-für-Schritt Anleitung

1. **Repository klonen**
   ```bash
   git clone https://github.com/gogodevops/winopt.git
   cd winopt
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Anwendung starten**
   ```bash
   npm start
   ```

### Anwendung bauen

Um eine ausführbare .exe-Datei zu erstellen:

```bash
npm run build
```

Die fertige Anwendung findest du im `dist` Ordner.

**Wichtig:** Der Build benötigt Administrator-Rechte. Nutze:
```bash
npm run start:admin
```

## 💻 Verwendung

### Administrator-Rechte

Die meisten Funktionen benötigen Administrator-Rechte. Starte die Anwendung mit "Als Administrator ausführen".

### Datenschutz-Tweaks

1. Navigiere zum "Datenschutz"-Tab
2. Aktiviere/Deaktiviere einzelne Tweaks über die Toggle-Switches
3. Jeder Tweak zeigt seinen Einfluss (Hoch/Mittel/Gering)
4. Ein Neustart kann für manche Änderungen erforderlich sein

### Performance-Optimierung

1. Navigiere zum "Performance"-Tab
2. Wähle die gewünschten Optimierungen aus
3. Die Änderungen werden sofort angewendet

### Backup & Restore

Alle Registry-Änderungen werden automatisch gesichert. Du kannst sie jederzeit über die Backup-Funktion wiederherstellen.

## ⚠️ Wichtige Hinweise

### Sicherheitshinweise

- **Erstelle einen Wiederherstellungspunkt** bevor du größere Änderungen vornimmst
- Alle Registry-Tweaks sind reversibel
- Bei Unsicherheit: Teste einzelne Tweaks statt alle auf einmal
- Administrator-Rechte werden benötigt und sollten verantwortungsvoll genutzt werden

### Haftungsausschluss

Diese Software wird OHNE JEGLICHE GEWÄHRLEISTUNG bereitgestellt. Die Nutzung erfolgt vollständig auf eigene Gefahr. Es besteht keine Haftung für Schäden jeglicher Art.

Siehe [Nutzungsbedingungen](https://github.com/gogodevops/winopt/blob/main/NUTZUNGSBEDINGUNGEN.md) für Details.

## 🛠️ Technologie-Stack

- **Electron** - Cross-Platform Desktop-Framework
- **Node.js** - Backend-Logik
- **HTML/CSS/JavaScript** - Frontend
- **Windows Registry API** - Für System-Tweaks
- **PowerShell** - Für erweiterte Funktionen

## 📁 Projekt-Struktur

```
winopt/
├── main.js              # Electron Hauptprozess
├── index.html           # UI Layout
├── styles.css           # Styling
├── renderer.js          # Frontend-Logik
├── package.json         # Projekt-Konfiguration
├── README.md            # Diese Datei
└── assets/              # Icons und Bilder
```

## 🤝 Beitragen

Da dies ein Open-Source-Projekt ist, sind Beiträge willkommen!

### Wie kann ich beitragen?

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/NeuesFeature`)
3. Committe deine Änderungen (`git commit -m 'Add: Neues Feature'`)
4. Push zum Branch (`git push origin feature/NeuesFeature`)
5. Öffne einen Pull Request

### Code Style

- Verwende sinnvolle Variablennamen
- Kommentiere komplexe Logik
- Teste deine Änderungen

## 🐛 Bug Reports

Wenn du einen Bug findest:

1. Prüfe ob der Bug bereits gemeldet wurde
2. Erstelle ein [neues Issue](https://github.com/gogodevops/winopt/issues)
3. Beschreibe das Problem detailliert
4. Füge Screenshots hinzu (falls relevant)
5. Nenne deine Windows-Version

## 📋 Roadmap

- [ ] Backup & Restore Funktionalität verbessern
- [ ] Automatische Wiederherstellungspunkt-Erstellung
- [ ] Mehr Tweaks und Optimierungen
- [ ] Export/Import von Konfigurationen
- [ ] Geplante Tasks für automatische Optimierung
- [ ] Multi-Sprach-Unterstützung (Englisch)

## 📄 Lizenz

Dieses Projekt ist lizenziert unter der MIT Lizenz - siehe [LICENSE](LICENSE) Datei für Details.

```
MIT License - Frei verwendbar für private und kommerzielle Zwecke
```

## 👤 Autor

**GoGo DevOps**
- GitHub: [@gogodevops](https://github.com/gogodevops)
- Email: gogodevelop@outlook.com

## 🙏 Danksagungen

- Electron Team für das großartige Framework
- Alle Contributors die an diesem Projekt mitarbeiten
- Windows-Community für Feedback und Support

## ⚖️ Disclaimer

Dieses Tool modifiziert Windows-Systemeinstellungen. Nutze es auf eigene Verantwortung. Erstelle immer Backups bevor du größere Änderungen vornimmst.

**Keine Verbindung zu Microsoft:** Dieses Projekt steht in keiner offiziellen Verbindung zu Microsoft und wird von Microsoft weder unterstützt noch empfohlen.

---

**Website:** https://github.com/gogodevops/winopt
**Entwickelt mit ❤️ für Windows 10/11**
