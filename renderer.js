const { ipcRenderer } = require('electron');

// Window Controls
document.getElementById('minimize-btn').addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
});

document.getElementById('maximize-btn').addEventListener('click', () => {
    ipcRenderer.send('maximize-window');
});

document.getElementById('close-btn').addEventListener('click', () => {
    ipcRenderer.send('close-window');
});

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        e.preventDefault();

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Show corresponding section
        const sectionId = item.getAttribute('data-section');
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');

        // Prüfe Status je nach Section
        if (sectionId === 'privacy') {
            await checkAllPrivacyTweaks();
        } else if (sectionId === 'performance') {
            await checkAllPerformanceTweaks();
        } else if (sectionId === 'services') {
            // Services werden beim Rendern automatisch geprüft
            // Nur re-checken wenn schon gerendert
            const existingServices = windowsServices.filter(s => s.exists);
            if (existingServices.length > 0) {
                existingServices.forEach(service => {
                    checkServiceStatus(service.name);
                });
            }
        } else if (sectionId === 'apps') {
            // Prüfe alle Apps
            bloatwareApps.forEach(app => {
                checkAppStatus(app.name, app.displayName);
            });
        } else if (sectionId === 'backups') {
            // Lade Backups
            await renderBackups('all');
        } else if (sectionId === 'system-info') {
            // Lade System-Informationen
            stopSystemInfoRefresh(); // Stoppe vorherigen Refresh
            await renderSystemInfo();
            startSystemInfoRefresh(); // Starte Auto-Refresh
        } else if (sectionId === 'appearance') {
            // Lade Erscheinungsbild-Tweaks und prüfe Status
            await checkAllAppearanceTweaks();
        } else if (sectionId === 'network') {
            // Lade Netzwerk-Tweaks und prüfe Status
            await checkAllNetworkTweaks();
        }
    });
});

// Check Admin Status
async function checkAdminStatus() {
    const isAdmin = await ipcRenderer.invoke('check-admin');
    const statusElement = document.getElementById('admin-status');

    if (isAdmin) {
        statusElement.classList.add('admin');
        statusElement.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-8-4z" fill="currentColor"/>
            </svg>
            <span>Administrator</span>
        `;
    } else {
        statusElement.classList.add('not-admin');
        statusElement.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
            </svg>
            <span>Keine Admin-Rechte</span>
        `;
    }
}

checkAdminStatus();

// Privacy Tweaks Data
const privacyTweaks = [
    {
        id: 'telemetry-disable',
        name: 'Windows Telemetrie deaktivieren',
        description: 'Verhindert das Sammeln und Senden von Diagnosedaten an Microsoft',
        impact: 'high',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
        registryName: 'AllowTelemetry',
        expectedValue: '0',
        defaultValue: '3', // 3=Full telemetry (Windows Standard)
        enabled: false
    },
    {
        id: 'cortana-disable',
        name: 'Cortana deaktivieren',
        description: 'Deaktiviert die Cortana-Sprachassistentin vollständig',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortana /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
        registryName: 'AllowCortana',
        expectedValue: '0',
        defaultValue: '1', // 1=aktiviert (Windows Standard)
        enabled: false
    },
    {
        id: 'activity-history',
        name: 'Aktivitätsverlauf deaktivieren',
        description: 'Verhindert das Speichern deiner App- und Browserverlauf',
        impact: 'low',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v PublishUserActivities /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
        registryName: 'PublishUserActivities',
        expectedValue: '0',
        defaultValue: '1', // 1=aktiviert (Windows Standard)
        enabled: false
    },
    {
        id: 'location-tracking',
        name: 'Standortverfolgung deaktivieren',
        description: 'Deaktiviert die Standortdienste systemweit',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v Value /t REG_SZ /d Deny /f',
        registryPath: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
        registryName: 'Value',
        expectedValue: 'Deny',
        enabled: false
    },
    {
        id: 'advertising-id',
        name: 'Werbe-ID deaktivieren',
        description: 'Verhindert personalisierte Werbung durch eindeutige ID',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo',
        registryName: 'Enabled',
        expectedValue: '0',
        defaultValue: '1', // 1=aktiviert (Windows Standard)
        enabled: false
    },
    {
        id: 'feedback',
        name: 'Windows Feedback deaktivieren',
        description: 'Deaktiviert Feedback-Anfragen von Windows',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Siuf\\Rules" /v NumberOfSIUFInPeriod /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules',
        registryName: 'NumberOfSIUFInPeriod',
        expectedValue: '0',
        defaultValue: 'DELETE', // Windows Standard: Eintrag existiert nicht
        enabled: false
    },
    {
        id: 'wifi-sense',
        name: 'WiFi-Sense deaktivieren',
        description: 'Verhindert automatisches Teilen von WLAN-Passwörtern',
        impact: 'high',
        command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowWiFiHotSpotReporting" /v value /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowWiFiHotSpotReporting',
        registryName: 'value',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'timeline',
        name: 'Windows Timeline deaktivieren',
        description: 'Deaktiviert die Timeline-Funktion die Aktivitäten speichert',
        impact: 'low',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableActivityFeed /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
        registryName: 'EnableActivityFeed',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'onedrive-disable',
        name: 'OneDrive deaktivieren',
        description: 'Verhindert dass OneDrive automatisch startet und Dateien synchronisiert',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive" /v DisableFileSyncNGSC /t REG_DWORD /d 1 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive',
        registryName: 'DisableFileSyncNGSC',
        expectedValue: '1',
        enabled: false
    },
    {
        id: 'web-search-disable',
        name: 'Websuche im Startmenü deaktivieren',
        description: 'Deaktiviert Bing-Websuche im Windows Startmenü',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v BingSearchEnabled /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search',
        registryName: 'BingSearchEnabled',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'suggested-apps',
        name: 'Vorgeschlagene Apps deaktivieren',
        description: 'Deaktiviert App-Vorschläge im Startmenü',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        registryName: 'SubscribedContent-338388Enabled',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'camera-access',
        name: 'Kamera-Zugriff für Apps deaktivieren',
        description: 'Verhindert dass Apps auf die Kamera zugreifen können',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" /v Value /t REG_SZ /d Deny /f',
        registryPath: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam',
        registryName: 'Value',
        expectedValue: 'Deny',
        enabled: false
    },
    {
        id: 'microphone-access',
        name: 'Mikrofon-Zugriff für Apps deaktivieren',
        description: 'Verhindert dass Apps auf das Mikrofon zugreifen können',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone" /v Value /t REG_SZ /d Deny /f',
        registryPath: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone',
        registryName: 'Value',
        expectedValue: 'Deny',
        enabled: false
    },
    {
        id: 'handwriting-data',
        name: 'Handschrift-Datensammlung deaktivieren',
        description: 'Verhindert das Sammeln von Handschrift- und Eingabedaten',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\InputPersonalization" /v RestrictImplicitTextCollection /t REG_DWORD /d 1 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\InputPersonalization',
        registryName: 'RestrictImplicitTextCollection',
        expectedValue: '1',
        defaultValue: '0', // 0=Personalisierung aktiviert (Windows Standard)
        enabled: false
    },
    {
        id: 'feedback-frequency',
        name: 'Feedback-Häufigkeit auf "Nie"',
        description: 'Setzt Windows Feedback-Anfragen auf Niemals',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Siuf\\Rules" /v PeriodInNanoSeconds /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules',
        registryName: 'PeriodInNanoSeconds',
        expectedValue: '0',
        defaultValue: 'DELETE', // Windows Standard: Eintrag existiert nicht
        enabled: false
    },
    {
        id: 'app-diagnostics',
        name: 'App-Diagnose deaktivieren',
        description: 'Verhindert dass Apps auf Diagnoseinformationen zugreifen',
        impact: 'low',
        command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics" /v Value /t REG_SZ /d Deny /f',
        registryPath: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics',
        registryName: 'Value',
        expectedValue: 'Deny',
        enabled: false
    },
    {
        id: 'windows-tips',
        name: 'Windows-Tipps deaktivieren',
        description: 'Deaktiviert Tipps, Tricks und Vorschläge von Windows',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        registryName: 'SubscribedContent-338389Enabled',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'update-p2p',
        name: 'Windows Update P2P deaktivieren',
        description: 'Verhindert das Teilen von Updates über P2P-Netzwerke',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization',
        registryName: 'DODownloadMode',
        expectedValue: '0',
        enabled: false
    }
];

// Performance Tweaks Data
const performanceTweaks = [
    {
        id: 'visual-effects',
        name: 'Visuelle Effekte optimieren',
        description: 'Reduziert Animationen für bessere Performance',
        impact: 'medium',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f',
        registryPath: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects',
        registryName: 'VisualFXSetting',
        expectedValue: '2',
        enabled: false
    },
    {
        id: 'startup-delay',
        name: 'Autostart-Verzögerung entfernen',
        description: 'Beschleunigt das Laden von Autostart-Programmen',
        impact: 'low',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v StartupDelayInMSec /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize',
        registryName: 'StartupDelayInMSec',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'superfetch',
        name: 'Superfetch optimieren',
        description: 'Optimiert Prefetch/Superfetch für SSDs',
        impact: 'medium',
        command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v EnableSuperfetch /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters',
        registryName: 'EnableSuperfetch',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'game-mode',
        name: 'Game Mode aktivieren',
        description: 'Aktiviert Windows Game Mode für bessere Gaming-Performance',
        impact: 'low',
        command: 'reg add "HKCU\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 1 /f',
        registryPath: 'HKCU:\\Software\\Microsoft\\GameBar',
        registryName: 'AutoGameModeEnabled',
        expectedValue: '1',
        defaultValue: '0', // 0=deaktiviert (häufiger Standard)
        enabled: false
    },
    {
        id: 'background-apps',
        name: 'Hintergrund-Apps deaktivieren',
        description: 'Verhindert dass Apps im Hintergrund laufen',
        impact: 'medium',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v GlobalUserDisabled /t REG_DWORD /d 1 /f',
        registryPath: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications',
        registryName: 'GlobalUserDisabled',
        expectedValue: '1',
        enabled: false
    },
    {
        id: 'transparency-disable',
        name: 'Transparenz-Effekte deaktivieren',
        description: 'Deaktiviert Transparenz für bessere Performance',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize',
        registryName: 'EnableTransparency',
        expectedValue: '0',
        defaultValue: '1', // 1=Transparenz an (Standard)
        enabled: false
    },
    {
        id: 'animations-disable',
        name: 'Animationen deaktivieren',
        description: 'Deaktiviert Windows-Animationen für schnellere UI',
        impact: 'medium',
        command: 'reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v MinAnimate /t REG_SZ /d 0 /f',
        registryPath: 'HKCU:\\Control Panel\\Desktop\\WindowMetrics',
        registryName: 'MinAnimate',
        expectedValue: '0',
        defaultValue: '1', // 1=Animationen an (Standard)
        enabled: false
    },
    {
        id: 'fast-startup-disable',
        name: 'Schnellstart deaktivieren',
        description: 'Deaktiviert Schnellstart (empfohlen für manche Systeme)',
        impact: 'low',
        command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power',
        registryName: 'HiberbootEnabled',
        expectedValue: '0',
        defaultValue: '1', // 1=Fast Startup aktiviert (Windows Standard)
        enabled: false
    },
    {
        id: 'search-indexing',
        name: 'Windows Search Indexierung optimieren',
        description: 'Deaktiviert Indexierung für bessere SSD-Performance',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v PreventIndexingOutlook /t REG_DWORD /d 1 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
        registryName: 'PreventIndexingOutlook',
        expectedValue: '1',
        enabled: false
    },
    {
        id: 'game-dvr-disable',
        name: 'Game DVR deaktivieren',
        description: 'Deaktiviert Xbox Game DVR für bessere Gaming-Performance',
        impact: 'medium',
        command: 'reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\System\\GameConfigStore',
        registryName: 'GameDVR_Enabled',
        expectedValue: '0',
        defaultValue: '1', // 1=aktiviert (Windows Standard)
        enabled: false
    },
    {
        id: 'notification-disable',
        name: 'Benachrichtigungen reduzieren',
        description: 'Deaktiviert unnötige System-Benachrichtigungen',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" /v ToastEnabled /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications',
        registryName: 'ToastEnabled',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'sysmain-disable',
        name: 'SysMain (Superfetch) deaktivieren',
        description: 'Deaktiviert SysMain Service für SSDs (spart RAM)',
        impact: 'medium',
        command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\SysMain" /v Start /t REG_DWORD /d 4 /f',
        registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\SysMain',
        registryName: 'Start',
        expectedValue: '4',
        enabled: false
    },
    {
        id: 'power-throttling',
        name: 'Power Throttling deaktivieren',
        description: 'Verhindert Drosselung von Prozessen für maximale Performance',
        impact: 'high',
        command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v PowerThrottlingOff /t REG_DWORD /d 1 /f',
        registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling',
        registryName: 'PowerThrottlingOff',
        expectedValue: '1',
        enabled: false
    }
];

// Appearance Tweaks Data
const appearanceTweaks = [
    {
        id: 'dark-mode',
        name: 'Dark Mode aktivieren',
        description: 'Aktiviert systemweiten Dark Mode (Windows 10/11)',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme /t REG_DWORD /d 0 /f && reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v SystemUsesLightTheme /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize',
        registryName: 'AppsUseLightTheme',
        expectedValue: '0',
        defaultValue: '1', // 1=Light Theme (Standard)
        enabled: false
    },
    {
        id: 'taskbar-small',
        name: 'Kleine Taskleisten-Symbole',
        description: 'Verkleinert Taskleisten-Icons für mehr Platz (nur Windows 10)',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarSmallIcons /t REG_DWORD /d 1 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
        registryName: 'TaskbarSmallIcons',
        expectedValue: '1',
        defaultValue: '0', // 0=normale Größe (Standard)
        enabled: false
    },
    {
        id: 'show-file-extensions',
        name: 'Dateiendungen anzeigen',
        description: 'Zeigt Dateiendungen im Explorer an',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
        registryName: 'HideFileExt',
        expectedValue: '0',
        defaultValue: '1', // 1=verstecken (Standard)
        enabled: false
    },
    {
        id: 'show-hidden-files',
        name: 'Versteckte Dateien anzeigen',
        description: 'Zeigt versteckte Dateien und Ordner im Explorer',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Hidden /t REG_DWORD /d 1 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
        registryName: 'Hidden',
        expectedValue: '1',
        defaultValue: '2', // 2=nicht anzeigen (Standard)
        enabled: false
    },
    {
        id: 'taskbar-search-icon',
        name: 'Taskbar-Suche als Icon',
        description: 'Zeigt Suchfeld in Taskleiste nur als Icon',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v SearchboxTaskbarMode /t REG_DWORD /d 1 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search',
        registryName: 'SearchboxTaskbarMode',
        expectedValue: '1',
        defaultValue: '2', // 0=versteckt, 1=nur Icon, 2=Suchfeld (Standard)
        enabled: false
    },
    {
        id: 'compact-mode',
        name: 'Kompakter Explorer-Modus',
        description: 'Aktiviert kompakten Ansichtsmodus im Datei-Explorer (nur Windows 11)',
        impact: 'low',
        command: 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v UseCompactMode /t REG_DWORD /d 1 /f',
        registryPath: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
        registryName: 'UseCompactMode',
        expectedValue: '1',
        defaultValue: '0', // 0=normal (Standard)
        enabled: false
    }
];

// Network Tweaks Data
const networkTweaks = [
    {
        id: 'dns-cache-size',
        name: 'DNS Cache vergrößern',
        description: 'Erhöht DNS Cache für schnellere Namensauflösung',
        impact: 'low',
        command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v CacheHashTableBucketSize /t REG_DWORD /d 1 /f',
        registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters',
        registryName: 'CacheHashTableBucketSize',
        expectedValue: '1',
        enabled: false
    },
    {
        id: 'network-throttling',
        name: 'Netzwerk-Drosselung deaktivieren',
        description: 'Deaktiviert Windows Netzwerk-Throttling',
        impact: 'medium',
        command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v NetworkThrottlingIndex /t REG_DWORD /d 4294967295 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile',
        registryName: 'NetworkThrottlingIndex',
        expectedValue: '4294967295',
        enabled: false
    },
    {
        id: 'tcp-optimizer',
        name: 'TCP Optimizer',
        description: 'Optimiert TCP-Einstellungen für bessere Performance',
        impact: 'medium',
        command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v TcpAckFrequency /t REG_DWORD /d 1 /f',
        registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters',
        registryName: 'TcpAckFrequency',
        expectedValue: '1',
        enabled: false
    },
    {
        id: 'qos-disable',
        name: 'QoS Packet Scheduler deaktivieren',
        description: 'Verhindert Bandbreiten-Reservierung für QoS',
        impact: 'low',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v NonBestEffortLimit /t REG_DWORD /d 0 /f',
        registryPath: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched',
        registryName: 'NonBestEffortLimit',
        expectedValue: '0',
        enabled: false
    },
    {
        id: 'nagle-disable',
        name: 'Nagle-Algorithmus deaktivieren',
        description: 'Reduziert Netzwerk-Latenz für Gaming',
        impact: 'medium',
        command: 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" /v TcpAckFrequency /t REG_DWORD /d 1 /f',
        registryPath: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces',
        registryName: 'TcpAckFrequency',
        expectedValue: '1',
        enabled: false
    }
];

// Windows Services Data
const windowsServices = [
    {
        name: 'DiagTrack',
        displayName: 'Connected User Experiences and Telemetry',
        description: 'Sammelt Telemetriedaten. Kann sicher deaktiviert werden.',
        recommendation: 'disable',
        status: 'unknown',
        exists: false,
        originalStartupType: 'unknown'
    },
    {
        name: 'dmwappushservice',
        displayName: 'Device Management Wireless Application Protocol',
        description: 'WAP Push Nachrichten Service. Selten benötigt.',
        recommendation: 'disable',
        status: 'unknown',
        exists: false,
        originalStartupType: 'unknown'
    },
    {
        name: 'WSearch',
        displayName: 'Windows Search',
        description: 'Windows Suchindizierung. Kann Performance beeinträchtigen.',
        recommendation: 'optional',
        status: 'unknown',
        exists: false,
        originalStartupType: 'unknown'
    },
    {
        name: 'SysMain',
        displayName: 'Superfetch/SysMain',
        description: 'Lädt häufig genutzte Programme in RAM. Bei SSDs optional.',
        recommendation: 'optional',
        status: 'unknown',
        exists: false,
        originalStartupType: 'unknown'
    },
    {
        name: 'TabletInputService',
        displayName: 'Touch Keyboard and Handwriting Panel Service',
        description: 'Nur für Touchscreen-Geräte notwendig.',
        recommendation: 'disable',
        status: 'unknown',
        exists: false,
        originalStartupType: 'unknown'
    },
    {
        name: 'RetailDemo',
        displayName: 'Retail Demo Service',
        description: 'Demo-Modus für Einzelhandel. Nicht benötigt.',
        recommendation: 'disable',
        status: 'unknown',
        exists: false,
        originalStartupType: 'unknown'
    }
];

// Bloatware Apps Data
const bloatwareApps = [
    {
        name: '3DBuilder',
        displayName: '3D Builder',
        description: '3D-Modellierungs-App',
        category: 'Optional'
    },
    {
        name: 'BingWeather',
        displayName: 'Bing Wetter',
        description: 'Wetter-App von Microsoft',
        category: 'Optional'
    },
    {
        name: 'XboxApp',
        displayName: 'Xbox',
        description: 'Xbox Konsolen-Begleiter-App',
        category: 'Gaming'
    },
    {
        name: 'ZuneMusic',
        displayName: 'Groove Musik',
        description: 'Musik-Player von Microsoft',
        category: 'Media'
    },
    {
        name: 'WindowsMaps',
        displayName: 'Karten',
        description: 'Karten-App von Microsoft',
        category: 'Optional'
    },
    {
        name: 'OneNote',
        displayName: 'OneNote',
        description: 'Notizen-App (UWP Version)',
        category: 'Productivity'
    },
    {
        name: 'People',
        displayName: 'Kontakte',
        description: 'Kontakte-Verwaltung',
        category: 'Optional'
    },
    {
        name: 'SkypeApp',
        displayName: 'Skype',
        description: 'Skype UWP-App',
        category: 'Communication'
    },
    {
        name: 'GetStarted',
        displayName: 'Tipps',
        description: 'Windows Tipps-App',
        category: 'Optional'
    },
    {
        name: 'Solitaire',
        displayName: 'Microsoft Solitaire',
        description: 'Kartenspiel',
        category: 'Games'
    },
    {
        name: 'CandyCrush',
        displayName: 'Candy Crush',
        description: 'Vorinstalliertes Spiel',
        category: 'Games'
    }
];

// Toast Notification System
function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    document.getElementById('toast-container').appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Render Privacy Tweaks
function renderPrivacyTweaks() {
    const container = document.getElementById('privacy-tweaks');
    container.innerHTML = '';

    privacyTweaks.forEach(tweak => {
        const tweakElement = document.createElement('div');
        tweakElement.className = 'tweak-item';
        tweakElement.innerHTML = `
            <div class="tweak-header">
                <div class="tweak-title">${tweak.name}</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${tweak.enabled ? 'checked' : ''} data-tweak-id="${tweak.id}" id="tweak-${tweak.id}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="tweak-description">${tweak.description}</div>
            <div class="tweak-footer">
                <span class="impact-badge ${tweak.impact}">
                    ${tweak.impact === 'high' ? 'Hoher Einfluss' : tweak.impact === 'medium' ? 'Mittlerer Einfluss' : 'Geringer Einfluss'}
                </span>
            </div>
        `;

        // Add toggle event listener
        const toggle = tweakElement.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            await applyTweak(tweak, isEnabled, 'privacy');
        });

        container.appendChild(tweakElement);
    });
}

// Render Performance Tweaks
function renderPerformanceTweaks() {
    const container = document.getElementById('performance-tweaks');
    container.innerHTML = '';

    performanceTweaks.forEach(tweak => {
        const tweakElement = document.createElement('div');
        tweakElement.className = 'tweak-item';
        tweakElement.innerHTML = `
            <div class="tweak-header">
                <div class="tweak-title">${tweak.name}</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${tweak.enabled ? 'checked' : ''} data-tweak-id="${tweak.id}" id="tweak-${tweak.id}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="tweak-description">${tweak.description}</div>
            <div class="tweak-footer">
                <span class="impact-badge ${tweak.impact}">
                    ${tweak.impact === 'high' ? 'Hoher Einfluss' : tweak.impact === 'medium' ? 'Mittlerer Einfluss' : 'Geringer Einfluss'}
                </span>
            </div>
        `;

        const toggle = tweakElement.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            await applyTweak(tweak, isEnabled, 'performance');
        });

        container.appendChild(tweakElement);
    });
}

// Render Appearance Tweaks
function renderAppearanceTweaks() {
    const container = document.getElementById('appearance-tweaks');
    container.innerHTML = '';

    appearanceTweaks.forEach(tweak => {
        const tweakElement = document.createElement('div');
        tweakElement.className = 'tweak-item';
        tweakElement.innerHTML = `
            <div class="tweak-header">
                <div class="tweak-title">${tweak.name}</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${tweak.enabled ? 'checked' : ''} data-tweak-id="${tweak.id}" id="tweak-${tweak.id}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="tweak-description">${tweak.description}</div>
            <div class="tweak-footer">
                <span class="impact-badge ${tweak.impact}">
                    ${tweak.impact === 'high' ? 'Hoch' : tweak.impact === 'medium' ? 'Mittel' : 'Gering'}
                </span>
            </div>
        `;

        const toggle = tweakElement.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            await applyTweak(tweak, isEnabled, 'appearance');
        });

        container.appendChild(tweakElement);
    });
}

// Render Network Tweaks
function renderNetworkTweaks() {
    const container = document.getElementById('network-tweaks');
    container.innerHTML = '';

    networkTweaks.forEach(tweak => {
        const tweakElement = document.createElement('div');
        tweakElement.className = 'tweak-item';
        tweakElement.innerHTML = `
            <div class="tweak-header">
                <div class="tweak-title">${tweak.name}</div>
                <label class="toggle-switch">
                    <input type="checkbox" ${tweak.enabled ? 'checked' : ''} data-tweak-id="${tweak.id}" id="tweak-${tweak.id}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="tweak-description">${tweak.description}</div>
            <div class="tweak-footer">
                <span class="impact-badge ${tweak.impact}">
                    ${tweak.impact === 'high' ? 'Hoch' : tweak.impact === 'medium' ? 'Mittel' : 'Gering'}
                </span>
            </div>
        `;

        const toggle = tweakElement.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            await applyTweak(tweak, isEnabled, 'network');
        });

        container.appendChild(tweakElement);
    });
}

// Render Services (nur existierende)
async function renderServices() {
    const container = document.getElementById('services-list');
    container.innerHTML = '<div style="color: var(--text-secondary); padding: 20px;">Prüfe verfügbare Dienste...</div>';

    // Erst alle Dienste prüfen um zu sehen welche existieren
    for (const service of windowsServices) {
        const status = await ipcRenderer.invoke('check-service-status', service.name);
        service.exists = status.exists;
        service.originalStartupType = status.startupType;
    }

    // Nur existierende Dienste rendern
    const existingServices = windowsServices.filter(s => s.exists);

    container.innerHTML = '';

    if (existingServices.length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); padding: 20px;">Keine Dienste gefunden oder keine Berechtigung.</div>';
        return;
    }

    existingServices.forEach(service => {
        const serviceElement = document.createElement('div');
        serviceElement.className = 'service-item';
        serviceElement.innerHTML = `
            <div class="service-header">
                <div>
                    <div class="service-title">${service.displayName}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;" id="service-status-${service.name}">
                        Status: Prüfe...
                    </div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="service-${service.name}" data-service-name="${service.name}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="service-description">${service.description}</div>
            <div style="margin-top: 8px;">
                <span class="impact-badge ${service.recommendation === 'disable' ? 'high' : 'medium'}">
                    ${service.recommendation === 'disable' ? 'Empfohlen zu deaktivieren' : 'Optional'}
                </span>
                <span class="impact-badge low" id="service-startup-${service.name}" style="margin-left: 8px;">
                    Startyp: ${service.originalStartupType}
                </span>
            </div>
        `;

        // Add toggle event listener
        const toggle = serviceElement.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', async (e) => {
            const shouldEnable = e.target.checked;
            await manageServiceToggle(service.name, shouldEnable, service.originalStartupType);
            // Nach Änderung Status neu prüfen
            setTimeout(() => checkServiceStatus(service.name), 1500);
        });

        container.appendChild(serviceElement);
    });

    // Status für alle existierenden Dienste prüfen
    existingServices.forEach(service => {
        checkServiceStatus(service.name);
    });
}

// Render Bloatware Apps
function renderApps() {
    const container = document.getElementById('apps-list');
    container.innerHTML = '';

    bloatwareApps.forEach(app => {
        const appElement = document.createElement('div');
        appElement.className = 'app-item';
        appElement.innerHTML = `
            <div class="app-header">
                <div>
                    <div class="app-title">${app.displayName}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;" id="app-status-${app.name}">
                        Status: Prüfe...
                    </div>
                </div>
                <button class="btn btn-danger" id="remove-btn-${app.name}" onclick="removeApp('${app.name}')" disabled>
                    Prüfe...
                </button>
            </div>
            <div class="app-description">${app.description}</div>
            <div style="margin-top: 8px;">
                <span class="impact-badge low">Kategorie: ${app.category}</span>
            </div>
        `;

        container.appendChild(appElement);
    });

    // Status für alle Apps prüfen
    bloatwareApps.forEach(app => {
        checkAppStatus(app.name, app.displayName);
    });
}

// Apply Registry Tweak (mit Backup und Revert)
async function applyTweak(tweak, enable, category = 'unknown') {
    // Wenn deaktiviert wird, setze isReverting=true
    const isReverting = !enable;
    console.log(`[FRONTEND DEBUG] applyTweak: id=${tweak.id}, enable=${enable}, isReverting=${isReverting}, category=${category}`);
    console.log(`[FRONTEND DEBUG] defaultValue=${tweak.defaultValue}`);

    const result = await ipcRenderer.invoke('apply-registry-tweak', tweak, category, isReverting);
    console.log(`[FRONTEND DEBUG] Result:`, result);

    if (result.success) {
        tweak.enabled = enable;
        showToast('Erfolgreich', result.message, 'success');

        // Bei Appearance Tweaks Explorer neu starten für sofortige Änderungen
        if (category === 'appearance') {
            setTimeout(async () => {
                const restartResult = await ipcRenderer.invoke('restart-explorer');
                if (restartResult.success) {
                    showToast('Info', 'Explorer wurde neu gestartet für sofortige Anzeige', 'info');
                }
            }, 1000); // 1 Sekunde warten
        }
    } else {
        showToast('Fehler', result.message, 'error');
        // Bei Fehler Toggle zurücksetzen
        const checkbox = document.getElementById(`tweak-${tweak.id}`);
        if (checkbox) {
            checkbox.checked = !enable;
        }
    }
}

// Prüfe einzelnen Service-Status
async function checkServiceStatus(serviceName) {
    const status = await ipcRenderer.invoke('check-service-status', serviceName);

    const statusElement = document.getElementById(`service-status-${serviceName}`);
    const checkbox = document.getElementById(`service-${serviceName}`);
    const startupElement = document.getElementById(`service-startup-${serviceName}`);

    if (statusElement && checkbox) {
        if (!status.exists) {
            statusElement.textContent = 'Status: Nicht gefunden';
            statusElement.style.color = 'var(--error)';
            checkbox.checked = false;
            checkbox.disabled = true;
            return;
        }

        // Update Startup-Type Badge
        if (startupElement) {
            const startupText = status.startupType === 'auto' ? 'Automatisch' :
                               status.startupType === 'manual' ? 'Manuell' :
                               status.startupType === 'disabled' ? 'Deaktiviert' : 'Unbekannt';
            startupElement.textContent = `Startyp: ${startupText}`;
        }

        // Toggle ist AN wenn NICHT deaktiviert (kann laufen oder gestoppt sein)
        checkbox.checked = !status.isDisabled;

        // Status-Text
        if (status.isDisabled) {
            statusElement.textContent = 'Status: Deaktiviert';
            statusElement.style.color = 'var(--accent-green)';
        } else if (status.running) {
            statusElement.textContent = 'Status: Läuft (Aktiviert)';
            statusElement.style.color = 'var(--accent-blue)';
        } else {
            statusElement.textContent = 'Status: Gestoppt (aber aktiviert)';
            statusElement.style.color = 'var(--accent-orange)';
        }
    }
}

// Manage Service Toggle (aktivieren/deaktivieren)
async function manageServiceToggle(serviceName, shouldEnable, originalStartupType) {
    const result = await ipcRenderer.invoke('manage-service', serviceName, shouldEnable, originalStartupType);

    if (result.success) {
        showToast('Erfolgreich', result.message, 'success');
    } else {
        showToast('Fehler', result.message, 'error');
    }
}

// Prüfe einzelnen App-Status
async function checkAppStatus(appName, displayName) {
    const isInstalled = await ipcRenderer.invoke('check-app-installed', appName);

    const statusElement = document.getElementById(`app-status-${appName}`);
    const removeBtn = document.getElementById(`remove-btn-${appName}`);

    if (statusElement && removeBtn) {
        if (isInstalled) {
            statusElement.textContent = 'Status: Installiert';
            statusElement.style.color = 'var(--accent-orange)';
            removeBtn.textContent = 'Entfernen';
            removeBtn.disabled = false;
            removeBtn.style.opacity = '1';
            removeBtn.style.cursor = 'pointer';
        } else {
            statusElement.textContent = 'Status: Nicht installiert';
            statusElement.style.color = 'var(--accent-green)';
            removeBtn.textContent = 'Bereits entfernt';
            removeBtn.disabled = true;
            removeBtn.style.opacity = '0.5';
            removeBtn.style.cursor = 'not-allowed';
        }
    }
}

// Remove App
async function removeApp(appName) {
    // Prüfe erst ob App installiert ist
    const isInstalled = await ipcRenderer.invoke('check-app-installed', appName);
    if (!isInstalled) {
        showToast('Info', 'App ist bereits entfernt', 'info');
        return;
    }

    if (!confirm(`Möchtest du diese App wirklich entfernen?`)) {
        return;
    }

    showToast('Info', `Entferne App...`, 'info');
    const result = await ipcRenderer.invoke('remove-app', appName);

    if (result.success) {
        showToast('Erfolgreich', result.message, 'success');
        // Status nach 2 Sekunden neu prüfen
        setTimeout(() => {
            checkAppStatus(appName, '');
            updateDashboard();
        }, 2000);
    } else {
        showToast('Fehler', result.message, 'error');
    }
}

// Prüfe ob ein Tweak aktiv ist
async function checkTweakStatus(tweak) {
    if (!tweak.registryPath || !tweak.registryName) {
        console.log(`[DEBUG] Tweak ${tweak.id}: Kein Registry-Pfad definiert`);
        return false; // Kann nicht geprüft werden
    }

    const isActive = await ipcRenderer.invoke(
        'check-registry-value',
        tweak.registryPath,
        tweak.registryName,
        tweak.expectedValue
    );

    console.log(`[DEBUG] Tweak ${tweak.id}: Path=${tweak.registryPath}, Name=${tweak.registryName}, Expected=${tweak.expectedValue}, IsActive=${isActive}`);

    tweak.enabled = isActive;
    return isActive;
}

// Prüfe alle Privacy Tweaks und zähle aktive
async function checkAllPrivacyTweaks() {
    let activeCount = 0;
    for (const tweak of privacyTweaks) {
        const isActive = await checkTweakStatus(tweak);
        if (isActive) activeCount++;

        // Update Checkbox in UI
        const checkbox = document.getElementById(`tweak-${tweak.id}`);
        console.log(`[DEBUG] Privacy Tweak ${tweak.id}: checkbox=${checkbox ? 'gefunden' : 'NICHT GEFUNDEN'}, isActive=${isActive}`);
        if (checkbox) {
            checkbox.checked = isActive;
            console.log(`[DEBUG] Checkbox für ${tweak.id} auf ${isActive} gesetzt`);
        }
    }
    return { active: activeCount, total: privacyTweaks.length };
}

// Prüfe alle Performance Tweaks und zähle aktive
async function checkAllPerformanceTweaks() {
    let activeCount = 0;
    for (const tweak of performanceTweaks) {
        const isActive = await checkTweakStatus(tweak);
        if (isActive) activeCount++;

        // Update Checkbox in UI
        const checkbox = document.getElementById(`tweak-${tweak.id}`);
        console.log(`[DEBUG] Performance Tweak ${tweak.id}: checkbox=${checkbox ? 'gefunden' : 'NICHT GEFUNDEN'}, isActive=${isActive}`);
        if (checkbox) {
            checkbox.checked = isActive;
            console.log(`[DEBUG] Checkbox für ${tweak.id} auf ${isActive} gesetzt`);
        }
    }
    return { active: activeCount, total: performanceTweaks.length };
}

// Prüfe alle Appearance Tweaks und zähle aktive
async function checkAllAppearanceTweaks() {
    let activeCount = 0;
    for (const tweak of appearanceTweaks) {
        let isActive = false;

        // Spezielle Behandlung für Dark Mode (prüft beide Registry-Werte)
        if (tweak.id === 'dark-mode') {
            const appsValue = await ipcRenderer.invoke(
                'check-registry-value',
                'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize',
                'AppsUseLightTheme',
                '0'
            );
            const systemValue = await ipcRenderer.invoke(
                'check-registry-value',
                'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize',
                'SystemUsesLightTheme',
                '0'
            );

            console.log(`[DEBUG] Dark Mode: AppsUseLightTheme=${appsValue}, SystemUsesLightTheme=${systemValue}`);

            // Beide Werte müssen 0 sein für vollständigen Dark Mode
            isActive = appsValue && systemValue;
        } else {
            isActive = await checkTweakStatus(tweak);
        }

        if (isActive) activeCount++;

        // Update Checkbox in UI
        const checkbox = document.getElementById(`tweak-${tweak.id}`);
        console.log(`[DEBUG] Appearance Tweak ${tweak.id}: checkbox=${checkbox ? 'gefunden' : 'NICHT GEFUNDEN'}, isActive=${isActive}`);
        if (checkbox) {
            checkbox.checked = isActive;
            tweak.enabled = isActive;
            console.log(`[DEBUG] Checkbox für ${tweak.id} auf ${isActive} gesetzt`);
        }
    }
    return { active: activeCount, total: appearanceTweaks.length };
}

// Prüfe alle Network Tweaks und zähle aktive
async function checkAllNetworkTweaks() {
    let activeCount = 0;
    for (const tweak of networkTweaks) {
        const isActive = await checkTweakStatus(tweak);
        if (isActive) activeCount++;

        // Update Checkbox in UI
        const checkbox = document.getElementById(`tweak-${tweak.id}`);
        console.log(`[DEBUG] Network Tweak ${tweak.id}: checkbox=${checkbox ? 'gefunden' : 'NICHT GEFUNDEN'}, isActive=${isActive}`);
        if (checkbox) {
            checkbox.checked = isActive;
            console.log(`[DEBUG] Checkbox für ${tweak.id} auf ${isActive} gesetzt`);
        }
    }
    return { active: activeCount, total: networkTweaks.length };
}

// Prüfe deaktivierte Dienste (nur existierende)
async function checkStoppedServices() {
    let disabledCount = 0;
    for (const service of windowsServices) {
        const status = await ipcRenderer.invoke('check-service-status', service.name);
        // Zähle nur existierende und deaktivierte Dienste
        if (status.exists && status.isDisabled) {
            disabledCount++;
        }
    }
    return disabledCount;
}

// Prüfe entfernte Apps
async function checkRemovedApps() {
    let removedCount = 0;
    for (const app of bloatwareApps) {
        const isInstalled = await ipcRenderer.invoke('check-app-installed', app.name);
        if (!isInstalled) removedCount++;
    }
    return removedCount;
}

// Dashboard mit echten Daten aktualisieren
async function updateDashboard() {
    // Zeige Loading-Status in allen Karten
    const privacyCard = document.querySelector('.stat-card:nth-child(1) .stat-value');
    const performanceCard = document.querySelector('.stat-card:nth-child(2) .stat-value');
    const performanceLabel = document.querySelector('.stat-card:nth-child(2) .stat-label');
    const servicesCard = document.querySelector('.stat-card:nth-child(3) .stat-value');
    const appsCard = document.querySelector('.stat-card:nth-child(4) .stat-value');

    // Setze Loading-Texte
    if (privacyCard) privacyCard.textContent = 'Prüfe...';
    if (performanceCard) performanceCard.textContent = 'Prüfe...';
    if (performanceLabel) performanceLabel.textContent = 'Wird geladen';
    if (servicesCard) servicesCard.textContent = '...';
    if (appsCard) appsCard.textContent = '...';

    // Prüfe alle Werte (parallel für bessere Performance)
    const [privacyStats, performanceStats, stoppedServices, removedApps] = await Promise.all([
        checkAllPrivacyTweaks(),
        checkAllPerformanceTweaks(),
        checkStoppedServices(),
        checkRemovedApps()
    ]);

    // Update Privacy Card
    if (privacyCard) {
        privacyCard.textContent = `${privacyStats.active}/${privacyStats.total}`;
    }

    // Update Performance Card
    if (performanceCard && performanceLabel) {
        if (performanceStats.active >= performanceStats.total * 0.7) {
            performanceCard.textContent = 'Optimiert';
            performanceLabel.textContent = 'System läuft gut';
        } else if (performanceStats.active >= performanceStats.total * 0.4) {
            performanceCard.textContent = 'Teilweise';
            performanceLabel.textContent = `${performanceStats.active}/${performanceStats.total} aktiv`;
        } else {
            performanceCard.textContent = 'Nicht optimiert';
            performanceLabel.textContent = `${performanceStats.active}/${performanceStats.total} aktiv`;
        }
    }

    // Update Services Card
    if (servicesCard) {
        servicesCard.textContent = stoppedServices;
    }

    // Update Apps Card
    if (appsCard) {
        appsCard.textContent = removedApps;
    }

    // Zeige Success-Toast
    showToast('Aktualisiert', 'Dashboard wurde erfolgreich aktualisiert', 'success');
}

// Quick Actions
function applyAllPrivacyTweaks() {
    showToast('Info', 'Wende alle Datenschutz-Tweaks an...', 'info');

    privacyTweaks.forEach(async (tweak) => {
        if (!tweak.enabled) {
            await applyTweak(tweak, true, 'privacy');
        }
    });

    renderPrivacyTweaks();
    setTimeout(updateDashboard, 2000); // Dashboard nach 2 Sek aktualisieren
}

function optimizePerformance() {
    showToast('Info', 'Optimiere System-Performance...', 'info');

    performanceTweaks.forEach(async (tweak) => {
        if (!tweak.enabled) {
            await applyTweak(tweak, true, 'performance');
        }
    });

    renderPerformanceTweaks();
    setTimeout(updateDashboard, 2000); // Dashboard nach 2 Sek aktualisieren
}

// ========== BACKUP FUNKTIONEN ==========

// Backup-Listen rendern
async function renderBackups(filter = 'all') {
    const container = document.getElementById('backups-list');
    container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">Lade Backups...</div>';

    try {
        const result = await ipcRenderer.invoke('get-backups');

        if (!result.success) {
            container.innerHTML = '<div style="padding: 20px; color: var(--error);">Fehler beim Laden der Backups</div>';
            return;
        }

        const backupData = result.data;
        let backups = backupData.backups;

        // Filter anwenden
        if (filter !== 'all') {
            backups = backups.filter(b => {
                if (filter === 'manual') return b.type === 'manual';
                return b.category === filter;
            });
        }

        // Sortiere nach Datum (neueste zuerst)
        backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Update Stats
        updateBackupStats(backupData);

        // Render Backups
        container.innerHTML = '';
        if (backups.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">Keine Backups vorhanden</div>';
            return;
        }

        backups.forEach(backup => {
            const backupElement = createBackupElement(backup);
            container.appendChild(backupElement);
        });
    } catch (error) {
        container.innerHTML = `<div style="padding: 20px; color: var(--error);">Fehler: ${error.message}</div>`;
    }
}

// Backup-Element erstellen
function createBackupElement(backup) {
    const div = document.createElement('div');
    div.className = 'backup-item' + (backup.restored ? ' restored' : '');

    const date = new Date(backup.timestamp);
    const formattedDate = date.toLocaleString('de-DE');

    const categoryClass = backup.category === 'privacy' ? 'privacy' : 'performance';

    div.innerHTML = `
        <div class="backup-header">
            <div>
                <div class="backup-title">${backup.tweakName}${backup.restored ? ' (Wiederhergestellt)' : ''}</div>
                <div class="backup-meta">
                    <span class="backup-date">${formattedDate}</span>
                    <span class="backup-category-badge ${categoryClass}">${backup.category === 'privacy' ? 'Datenschutz' : 'Performance'}</span>
                </div>
            </div>
            <div class="backup-actions">
                ${!backup.restored && backup.canRestore ? `<button class="btn btn-primary btn-sm" onclick="restoreBackup('${backup.id}')">Wiederherstellen</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteBackup('${backup.id}')">Löschen</button>
            </div>
        </div>
        <div class="backup-details">
            <div class="backup-detail-item">
                <span class="detail-label">Registry-Pfad:</span>
                <span class="detail-value">${backup.registryPath}</span>
            </div>
            <div class="backup-detail-item">
                <span class="detail-label">Registry-Name:</span>
                <span class="detail-value">${backup.registryName}</span>
            </div>
            <div class="backup-detail-item">
                <span class="detail-label">Vorheriger Wert:</span>
                <span class="detail-value">${backup.previousValue || 'N/A'}</span>
            </div>
            <div class="backup-detail-item">
                <span class="detail-label">Neuer Wert:</span>
                <span class="detail-value">${backup.newValue}</span>
            </div>
        </div>
    `;

    return div;
}

// Backup Stats aktualisieren
function updateBackupStats(backupData) {
    document.getElementById('total-backups').textContent = backupData.backups.length;
    const restorable = backupData.backups.filter(b => !b.restored && b.canRestore).length;
    document.getElementById('restorable-backups').textContent = restorable;
}

// Backup wiederherstellen
async function restoreBackup(backupId) {
    if (!confirm('Möchtest du diesen Backup wirklich wiederherstellen?')) {
        return;
    }

    showToast('Info', 'Stelle Backup wieder her...', 'info');

    try {
        const result = await ipcRenderer.invoke('restore-backup', backupId);

        if (result.success) {
            showToast('Erfolgreich', result.message, 'success');
            await renderBackups('all');
            await updateDashboard();
        } else {
            showToast('Fehler', result.message, 'error');
        }
    } catch (error) {
        showToast('Fehler', 'Unerwarteter Fehler: ' + error.message, 'error');
    }
}

// Backup löschen
async function deleteBackup(backupId) {
    if (!confirm('Backup unwiderruflich löschen?')) {
        return;
    }

    try {
        const result = await ipcRenderer.invoke('delete-backup', backupId);

        if (result.success) {
            showToast('Erfolgreich', 'Backup gelöscht', 'success');
            await renderBackups('all');
        } else {
            showToast('Fehler', result.message, 'error');
        }
    } catch (error) {
        showToast('Fehler', 'Unerwarteter Fehler: ' + error.message, 'error');
    }
}

// Backup Filter Event Listeners
document.querySelectorAll('.backup-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        document.querySelectorAll('.backup-filters .filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const filter = e.target.getAttribute('data-filter');
        await renderBackups(filter);
    });
});

// ========== SYSTEM INFO FUNKTIONEN ==========

let systemInfoInterval = null;

// System-Info rendern
async function renderSystemInfo() {
    try {
        // CPU Info
        const cpuResult = await ipcRenderer.invoke('get-cpu-info');
        if (cpuResult.success) {
            const cpu = cpuResult.data;
            document.getElementById('cpu-model').textContent = cpu.model;
            document.getElementById('cpu-cores').textContent = cpu.cores;
            document.getElementById('cpu-usage').textContent = `${cpu.usage}%`;
            document.getElementById('cpu-progress').style.width = `${cpu.usage}%`;
            document.getElementById('cpu-frequency').textContent = `${cpu.frequency} MHz`;

            // Farbe basierend auf Auslastung
            const cpuProgress = document.getElementById('cpu-progress');
            if (cpu.usage > 80) {
                cpuProgress.style.background = 'var(--error)';
            } else if (cpu.usage > 50) {
                cpuProgress.style.background = 'var(--accent-orange)';
            } else {
                cpuProgress.style.background = 'var(--accent-green)';
            }
        }

        // RAM Info
        const ramResult = await ipcRenderer.invoke('get-ram-info');
        if (ramResult.success) {
            const ram = ramResult.data;
            const totalGB = (ram.total / 1024 / 1024 / 1024).toFixed(2);
            const usedGB = (ram.used / 1024 / 1024 / 1024).toFixed(2);
            const freeGB = (ram.free / 1024 / 1024 / 1024).toFixed(2);

            document.getElementById('ram-total').textContent = `${totalGB} GB`;
            document.getElementById('ram-used').textContent = `${usedGB} GB`;
            document.getElementById('ram-free').textContent = `${freeGB} GB`;
            document.getElementById('ram-usage').textContent = `${ram.usagePercent}%`;
            document.getElementById('ram-progress').style.width = `${ram.usagePercent}%`;

            // Farbe basierend auf Auslastung
            const ramProgress = document.getElementById('ram-progress');
            if (ram.usagePercent > 80) {
                ramProgress.style.background = 'var(--error)';
            } else if (ram.usagePercent > 60) {
                ramProgress.style.background = 'var(--accent-orange)';
            } else {
                ramProgress.style.background = 'var(--accent-green)';
            }
        }

        // Disk Info
        const diskResult = await ipcRenderer.invoke('get-disk-info');
        if (diskResult.success) {
            const diskList = document.getElementById('disk-list');
            diskList.innerHTML = '';

            diskResult.data.forEach(drive => {
                const diskCard = document.createElement('div');
                diskCard.className = 'disk-card';

                let fillColor = 'var(--accent-green)';
                if (drive.PercentUsed > 80) fillColor = 'var(--error)';
                else if (drive.PercentUsed > 60) fillColor = 'var(--accent-orange)';

                diskCard.innerHTML = `
                    <div class="disk-header">
                        <span class="disk-name">Laufwerk ${drive.Name}:</span>
                        <span class="disk-usage">${drive.UsedGB} GB / ${drive.TotalGB} GB (${drive.PercentUsed}%)</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${drive.PercentUsed}%; background: ${fillColor}"></div>
                    </div>
                `;
                diskList.appendChild(diskCard);
            });
        }

        // Network Info
        const networkResult = await ipcRenderer.invoke('get-network-info');
        if (networkResult.success) {
            const networkList = document.getElementById('network-list');
            networkList.innerHTML = '';

            networkResult.data.adapters.forEach(adapter => {
                const receivedMB = (adapter.ReceivedBytes / 1024 / 1024).toFixed(2);
                const sentMB = (adapter.SentBytes / 1024 / 1024).toFixed(2);

                const netCard = document.createElement('div');
                netCard.className = 'network-card';
                netCard.innerHTML = `
                    <div class="network-name">${adapter.Name}</div>
                    <div class="network-stats">
                        <div class="network-stat">
                            <span class="network-label">Empfangen:</span>
                            <span class="network-value">${receivedMB} MB</span>
                        </div>
                        <div class="network-stat">
                            <span class="network-label">Gesendet:</span>
                            <span class="network-value">${sentMB} MB</span>
                        </div>
                    </div>
                `;
                networkList.appendChild(netCard);
            });
        }

        // Uptime
        const uptimeResult = await ipcRenderer.invoke('get-system-uptime');
        if (uptimeResult.success) {
            document.getElementById('system-uptime').textContent = uptimeResult.data.formatted;
        }
    } catch (error) {
        showToast('Fehler', 'Fehler beim Laden: ' + error.message, 'error');
    }
}

// System-Info manuell aktualisieren
async function refreshSystemInfo() {
    showToast('Info', 'Aktualisiere System-Informationen...', 'info');
    await renderSystemInfo();
    showToast('Erfolgreich', 'System-Informationen aktualisiert', 'success');
}

// Auto-Refresh starten
function startSystemInfoRefresh() {
    if (systemInfoInterval) {
        clearInterval(systemInfoInterval);
    }
    systemInfoInterval = setInterval(renderSystemInfo, 5000); // Alle 5 Sekunden
}

// Auto-Refresh stoppen
function stopSystemInfoRefresh() {
    if (systemInfoInterval) {
        clearInterval(systemInfoInterval);
        systemInfoInterval = null;
    }
}

// Initialize UI
renderPrivacyTweaks();
renderPerformanceTweaks();
renderServices();
renderApps();
renderAppearanceTweaks();
renderNetworkTweaks();

// Status für alle Tweaks prüfen beim initialen Laden
setTimeout(async () => {
    console.log('[INIT] Starte Status-Prüfung für alle Tweaks...');
    await checkAllPrivacyTweaks();
    console.log('[INIT] Privacy Tweaks geprüft');
    await checkAllPerformanceTweaks();
    console.log('[INIT] Performance Tweaks geprüft');
    await checkAllAppearanceTweaks();
    console.log('[INIT] Appearance Tweaks geprüft');
    await checkAllNetworkTweaks();
    console.log('[INIT] Network Tweaks geprüft');
    updateDashboard();
    console.log('[INIT] Dashboard aktualisiert');
}, 500); // Nach 500ms starten damit UI geladen ist
