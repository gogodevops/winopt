const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const os = require('os');
const execPromise = util.promisify(exec);

let mainWindow;

// Prüfen ob als Administrator gestartet
async function isAdmin() {
  try {
    await execPromise('net session');
    return true;
  } catch (e) {
    return false;
  }
}

// ========== BACKUP MANAGER ==========

// Pfad zur Backup-Datei
function getBackupFilePath() {
  const userDataPath = app.getPath('userData');
  const backupsDir = path.join(userDataPath, 'backups');
  return { dir: backupsDir, file: path.join(backupsDir, 'registry-backups.json') };
}

// Backup-Datei laden
async function loadBackupFile() {
  try {
    const { dir, file } = getBackupFilePath();

    // Erstelle Verzeichnis falls nicht vorhanden
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      // Ignoriere Fehler wenn Ordner bereits existiert
    }

    // Lade Datei
    const data = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(data);

    // Validiere Struktur
    if (!parsed.version || !Array.isArray(parsed.backups)) {
      throw new Error('Invalid backup file structure');
    }

    return parsed;
  } catch (error) {
    // Erstelle neue leere Backup-Datei
    return {
      version: '1.0',
      backups: [],
      metadata: {
        totalBackups: 0,
        lastBackupTime: null,
        lastCleanup: null
      }
    };
  }
}

// Backup-Datei speichern (atomic write)
async function saveBackupFile(backupData) {
  try {
    const { dir, file } = getBackupFilePath();

    // Erstelle Verzeichnis falls nicht vorhanden
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      // Ignoriere Fehler
    }

    // Atomic write: Schreibe in temp file, dann rename
    const tempFile = file + '.tmp';
    await fs.writeFile(tempFile, JSON.stringify(backupData, null, 2), 'utf-8');
    await fs.rename(tempFile, file);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Registry-Wert lesen (mit Typ-Erkennung)
async function readRegistryValue(registryPath, registryName) {
  try {
    // Konvertiere PowerShell-Path zu reg-Path für Typ-Erkennung
    const regPath = registryPath.replace('HKLM:\\', 'HKLM\\').replace('HKCU:\\', 'HKCU\\');

    // Lese Wert
    const valueCommand = `powershell -Command "(Get-ItemProperty -Path '${registryPath}' -Name '${registryName}' -ErrorAction SilentlyContinue).'${registryName}'"`;
    const { stdout: value } = await execPromise(valueCommand);

    // Lese Typ mit reg query
    const typeCommand = `reg query "${regPath}" /v "${registryName}"`;
    const { stdout: typeOutput } = await execPromise(typeCommand);

    // Extrahiere Typ
    let valueType = 'REG_SZ';
    if (typeOutput.includes('REG_DWORD')) {
      valueType = 'REG_DWORD';
    } else if (typeOutput.includes('REG_SZ')) {
      valueType = 'REG_SZ';
    } else if (typeOutput.includes('REG_BINARY')) {
      valueType = 'REG_BINARY';
    } else if (typeOutput.includes('REG_MULTI_SZ')) {
      valueType = 'REG_MULTI_SZ';
    }

    return {
      exists: value.trim() !== '',
      value: value.trim(),
      type: valueType
    };
  } catch (error) {
    return {
      exists: false,
      value: null,
      type: null
    };
  }
}

// Backup-Eintrag erstellen
async function createBackupEntry(tweak, previousValue, category) {
  const timestamp = new Date().toISOString();
  const id = `backup_${Date.now()}_${tweak.id}`;

  return {
    id: id,
    timestamp: timestamp,
    type: 'auto',
    tweakId: tweak.id,
    tweakName: tweak.name,
    category: category,
    registryPath: tweak.registryPath,
    registryName: tweak.registryName,
    previousValue: previousValue.value,
    previousValueType: previousValue.type,
    newValue: tweak.expectedValue,
    canRestore: previousValue.exists,
    restored: false,
    restoredAt: null
  };
}

// Alte Backups aufräumen
async function cleanupOldBackups(backupData) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Behalte nur Backups die:
  // 1. Noch nicht wiederhergestellt wurden ODER
  // 2. Weniger als 30 Tage alt sind
  backupData.backups = backupData.backups.filter(backup => {
    if (!backup.restored) return true; // Behalte nicht-wiederhergestellte
    const backupDate = new Date(backup.timestamp);
    return backupDate > thirtyDaysAgo; // Behalte wenn < 30 Tage
  });

  // Limitiere auf maximal 100 Backups (behalte neueste)
  if (backupData.backups.length > 100) {
    backupData.backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    backupData.backups = backupData.backups.slice(0, 100);
  }

  backupData.metadata.lastCleanup = now.toISOString();
  backupData.metadata.totalBackups = backupData.backups.length;

  return backupData;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.ico')
  });

  mainWindow.loadFile('index.html');

  // DevTools für Entwicklung öffnen (nur für Development)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers für Fenster-Kontrollen
ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow.close();
});

// IPC Handler für Registry-Operationen (mit Backup und Revert)
ipcMain.handle('apply-registry-tweak', async (event, tweak, category, isReverting = false) => {
  try {
    console.log(`[REVERT DEBUG] Tweak: ${tweak.id}, isReverting: ${isReverting}`);

    if (isReverting) {
      // DEAKTIVIEREN: Finde letztes Backup und stelle wieder her
      const backupData = await loadBackupFile();
      console.log(`[REVERT DEBUG] Total backups: ${backupData.backups.length}`);

      const relevantBackups = backupData.backups.filter(b => b.tweakId === tweak.id && !b.restored);
      console.log(`[REVERT DEBUG] Relevant backups for ${tweak.id}: ${relevantBackups.length}`);

      const lastBackup = relevantBackups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      console.log(`[REVERT DEBUG] Last backup:`, lastBackup);

      if (lastBackup && lastBackup.canRestore && lastBackup.previousValue !== null) {
        // Stelle vorherigen Wert wieder her
        console.log(`[REVERT DEBUG] Restoring backup: previousValue=${lastBackup.previousValue}, type=${lastBackup.previousValueType}`);
        const regPath = tweak.registryPath.replace('HKLM:\\', 'HKLM\\').replace('HKCU:\\', 'HKCU\\');
        const restoreCommand = `reg add "${regPath}" /v "${tweak.registryName}" /t ${lastBackup.previousValueType} /d "${lastBackup.previousValue}" /f`;
        console.log(`[REVERT DEBUG] Restore command: ${restoreCommand}`);
        await execPromise(restoreCommand);

        // NICHT als restored markieren, damit es wiederverwendet werden kann!
        console.log(`[REVERT DEBUG] Backup kept for reuse (not marked as restored)`);

        return {
          success: true,
          message: tweak.name + ' wurde rückgängig gemacht'
        };
      } else if (tweak.defaultValue !== undefined) {
        // Verwende Standard-Wert wenn kein Backup existiert
        console.log(`[REVERT DEBUG] Using default value: ${tweak.defaultValue}`);
        const regPath = tweak.registryPath.replace('HKLM:\\', 'HKLM\\').replace('HKCU:\\', 'HKCU\\');

        // Spezielle Behandlung: Wenn defaultValue = 'DELETE', lösche den Eintrag
        if (tweak.defaultValue === 'DELETE') {
          console.log(`[DELETE DEBUG] ============ DELETING REGISTRY ENTRY ============`);
          const deleteCommand = `reg delete "${regPath}" /v "${tweak.registryName}" /f`;
          console.log(`[DELETE DEBUG] Delete command: ${deleteCommand}`);
          console.log(`[DELETE DEBUG] Registry path: ${regPath}`);
          console.log(`[DELETE DEBUG] Value name: ${tweak.registryName}`);

          try {
            const result = await execPromise(deleteCommand);
            console.log(`[DELETE DEBUG] Delete successful! Output: ${result.stdout}`);
          } catch (error) {
            // Ignoriere Fehler wenn Eintrag bereits gelöscht/nicht vorhanden
            console.log(`[DELETE DEBUG] Delete failed (entry may not exist): ${error.message}`);
            console.log(`[DELETE DEBUG] This is OK if the entry didn't exist`);
          }

          console.log(`[DELETE DEBUG] ============ DELETE COMPLETE ============`);
          return {
            success: true,
            message: tweak.name + ' auf Standard zurückgesetzt (Eintrag gelöscht)'
          };
        } else {
          // Normaler Wert setzen
          const defaultCommand = `reg add "${regPath}" /v "${tweak.registryName}" /t REG_DWORD /d ${tweak.defaultValue} /f`;
          console.log(`[REVERT DEBUG] Default command: ${defaultCommand}`);
          await execPromise(defaultCommand);

          return {
            success: true,
            message: tweak.name + ' auf Standard zurückgesetzt'
          };
        }
      } else {
        console.log(`[REVERT DEBUG] No backup and no default value!`);
        return {
          success: false,
          message: 'Kein Backup gefunden und kein Standard-Wert definiert'
        };
      }
    } else {
      // AKTIVIEREN: Prüfe ob Backup schon existiert
      const backupData = await loadBackupFile();
      const existingBackup = backupData.backups.find(b => b.tweakId === tweak.id && !b.restored);

      if (existingBackup) {
        // Backup existiert bereits, verwende es wieder
        console.log(`[BACKUP DEBUG] Existing backup found for ${tweak.id}, reusing it`);

        // Wende Tweak an
        const { stdout, stderr } = await execPromise(tweak.command);

        return {
          success: true,
          message: tweak.name + ' erfolgreich angewendet (Backup wiederverwendet)',
          backup: existingBackup
        };
      } else {
        // Kein Backup vorhanden, erstelle ein neues
        console.log(`[BACKUP DEBUG] No backup found for ${tweak.id}, creating new one`);

        // 1. Lese aktuellen Registry-Wert
        const previousValue = await readRegistryValue(tweak.registryPath, tweak.registryName);

        // 2. Erstelle Backup-Eintrag
        const backupEntry = await createBackupEntry(tweak, previousValue, category || 'unknown');

        // 3. Wende Tweak an
        const { stdout, stderr } = await execPromise(tweak.command);

        // 4. Speichere Backup bei Erfolg
        backupData.backups.push(backupEntry);
        backupData.metadata.totalBackups = backupData.backups.length;
        backupData.metadata.lastBackupTime = backupEntry.timestamp;

        await saveBackupFile(backupData);

        return {
          success: true,
          message: tweak.name + ' erfolgreich angewendet',
          backup: backupEntry
        };
      }
    }
  } catch (error) {
    return { success: false, message: 'Fehler: ' + error.message };
  }
});

// IPC Handler für Dienste-Management (aktivieren/deaktivieren)
ipcMain.handle('manage-service', async (event, serviceName, shouldEnable, originalStartupType) => {
  try {
    if (shouldEnable) {
      // Aktiviere Dienst - stelle auf ursprünglichen Typ zurück
      const startType = originalStartupType === 'auto' ? 'auto' : 'demand'; // auto oder manual
      const configCommand = `sc config "${serviceName}" start= ${startType}`;
      await execPromise(configCommand);

      // Versuche Dienst zu starten
      try {
        const startCommand = `sc start "${serviceName}"`;
        await execPromise(startCommand);
      } catch (e) {
        // Ignoriere Fehler wenn Dienst bereits läuft
      }

      return {
        success: true,
        message: `Dienst wurde aktiviert (${startType === 'auto' ? 'Automatisch' : 'Manuell'})`
      };
    } else {
      // Deaktiviere Dienst
      const stopCommand = `sc stop "${serviceName}"`;
      try {
        await execPromise(stopCommand);
      } catch (e) {
        // Ignoriere Fehler wenn Dienst bereits gestoppt ist
      }

      const configCommand = `sc config "${serviceName}" start= disabled`;
      await execPromise(configCommand);

      return {
        success: true,
        message: 'Dienst wurde deaktiviert und gestoppt'
      };
    }
  } catch (error) {
    return { success: false, message: 'Fehler: ' + error.message };
  }
});

// IPC Handler für App-Deinstallation
ipcMain.handle('remove-app', async (event, appName) => {
  try {
    const command = `powershell -Command "Get-AppxPackage *${appName}* | Remove-AppxPackage"`;
    const { stdout, stderr } = await execPromise(command);
    return { success: true, message: `${appName} wurde entfernt` };
  } catch (error) {
    return { success: false, message: 'Fehler: ' + error.message };
  }
});

// IPC Handler für Admin-Check
ipcMain.handle('check-admin', async () => {
  return await isAdmin();
});

// IPC Handler für Registry-Wert prüfen
ipcMain.handle('check-registry-value', async (event, path, name, expectedValue, expectedType) => {
  try {
    // Reg query mit PowerShell für bessere Kompatibilität
    const command = `powershell -Command "(Get-ItemProperty -Path '${path}' -Name '${name}' -ErrorAction SilentlyContinue).'${name}'"`;
    const { stdout } = await execPromise(command);
    const actualValue = stdout.trim();

    console.log(`[BACKEND DEBUG] Path: ${path}, Name: ${name}, Expected: "${expectedValue}", Actual: "${actualValue}"`);

    // Prüfe ob Wert existiert und dem erwarteten Wert entspricht
    if (actualValue === '') {
      console.log(`[BACKEND DEBUG] Wert existiert nicht`);
      return false; // Wert existiert nicht
    }

    // Vergleiche mit erwartetem Wert
    const result = actualValue === expectedValue.toString();
    console.log(`[BACKEND DEBUG] Vergleich: "${actualValue}" === "${expectedValue.toString()}" = ${result}`);
    return result;
  } catch (error) {
    console.log(`[BACKEND DEBUG] Fehler: ${error.message}`);
    return false; // Bei Fehler = nicht aktiv
  }
});

// IPC Handler für Service-Status prüfen (erweitert mit Startup-Type)
ipcMain.handle('check-service-status', async (event, serviceName) => {
  try {
    // Prüfe Status und Konfiguration
    const queryCommand = `sc query "${serviceName}"`;
    const configCommand = `sc qc "${serviceName}"`;

    const { stdout: queryOutput } = await execPromise(queryCommand);
    const { stdout: configOutput } = await execPromise(configCommand);

    // Prüfe ob Service läuft
    const isRunning = queryOutput.includes('RUNNING');
    const isStopped = queryOutput.includes('STOPPED');

    // Extrahiere Startup-Type
    let startupType = 'unknown';
    if (configOutput.includes('AUTO_START')) {
      startupType = 'auto';
    } else if (configOutput.includes('DEMAND_START')) {
      startupType = 'manual';
    } else if (configOutput.includes('DISABLED')) {
      startupType = 'disabled';
    }

    return {
      exists: true,
      running: isRunning,
      stopped: isStopped,
      startupType: startupType,
      isDisabled: startupType === 'disabled'
    };
  } catch (error) {
    return {
      exists: false,
      running: false,
      stopped: false,
      startupType: 'unknown',
      isDisabled: false
    };
  }
});

// IPC Handler für installierte Apps prüfen
ipcMain.handle('check-app-installed', async (event, appName) => {
  try {
    const command = `powershell -Command "Get-AppxPackage *${appName}* | Select-Object -ExpandProperty Name"`;
    const { stdout } = await execPromise(command);
    return stdout.trim() !== ''; // Wenn Output vorhanden = App installiert
  } catch (error) {
    return false;
  }
});

// IPC Handler für Explorer-Neustart
ipcMain.handle('restart-explorer', async () => {
  try {
    // Stoppe Explorer
    await execPromise('taskkill /f /im explorer.exe');

    // Warte kurz
    await new Promise(resolve => setTimeout(resolve, 500));

    // Starte Explorer neu
    await execPromise('start explorer.exe');

    return { success: true, message: 'Explorer wurde neu gestartet' };
  } catch (error) {
    return { success: false, message: 'Fehler beim Neustart: ' + error.message };
  }
});

// ========== BACKUP IPC HANDLERS ==========

// Alle Backups abrufen
ipcMain.handle('get-backups', async () => {
  try {
    const backupData = await loadBackupFile();
    return { success: true, data: backupData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Backups nach Kategorie filtern
ipcMain.handle('get-backups-by-category', async (event, category) => {
  try {
    const backupData = await loadBackupFile();
    const filtered = backupData.backups.filter(b => b.category === category && !b.restored);
    return { success: true, backups: filtered };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Backup wiederherstellen
ipcMain.handle('restore-backup', async (event, backupId) => {
  try {
    const backupData = await loadBackupFile();
    const backup = backupData.backups.find(b => b.id === backupId);

    if (!backup) {
      return { success: false, message: 'Backup nicht gefunden' };
    }

    if (!backup.canRestore || backup.previousValue === null) {
      return { success: false, message: 'Backup kann nicht wiederhergestellt werden (kein vorheriger Wert)' };
    }

    // Registry-Pfad konvertieren
    const regPath = backup.registryPath.replace('HKLM:\\', 'HKLM\\').replace('HKCU:\\', 'HKCU\\');

    // Stelle Registry-Wert wieder her
    const restoreCommand = `reg add "${regPath}" /v "${backup.registryName}" /t ${backup.previousValueType} /d "${backup.previousValue}" /f`;
    await execPromise(restoreCommand);

    // Markiere als wiederhergestellt
    backup.restored = true;
    backup.restoredAt = new Date().toISOString();

    await saveBackupFile(backupData);

    return {
      success: true,
      message: `${backup.tweakName} wurde erfolgreich wiederhergestellt`
    };
  } catch (error) {
    return { success: false, message: 'Fehler beim Wiederherstellen: ' + error.message };
  }
});

// Backup löschen
ipcMain.handle('delete-backup', async (event, backupId) => {
  try {
    const backupData = await loadBackupFile();
    const initialLength = backupData.backups.length;

    backupData.backups = backupData.backups.filter(b => b.id !== backupId);

    if (backupData.backups.length === initialLength) {
      return { success: false, message: 'Backup nicht gefunden' };
    }

    backupData.metadata.totalBackups = backupData.backups.length;
    await saveBackupFile(backupData);

    return { success: true, message: 'Backup gelöscht' };
  } catch (error) {
    return { success: false, message: 'Fehler: ' + error.message };
  }
});

// Alte Backups aufräumen
ipcMain.handle('cleanup-backups', async () => {
  try {
    let backupData = await loadBackupFile();
    const beforeCount = backupData.backups.length;

    backupData = await cleanupOldBackups(backupData);
    await saveBackupFile(backupData);

    const removedCount = beforeCount - backupData.backups.length;

    return {
      success: true,
      message: `${removedCount} alte Backups entfernt`,
      removedCount: removedCount
    };
  } catch (error) {
    return { success: false, message: 'Fehler: ' + error.message };
  }
});

// ========== SYSTEM INFO IPC HANDLERS ==========

// CPU-Informationen
ipcMain.handle('get-cpu-info', async () => {
  try {
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const cpuCores = cpus.length;

    // CPU-Auslastung berechnen
    let cpuUsage = 0;
    try {
      // Methode 1: Über WMIC (zuverlässiger)
      const usageCommand = `wmic cpu get loadpercentage`;
      const { stdout } = await execPromise(usageCommand);
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        cpuUsage = parseFloat(lines[1].trim());
      }
    } catch (e) {
      // Methode 2: Fallback über os.cpus() (approximiert)
      const cpuInfo = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpuInfo.forEach(cpu => {
        for (let type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpuInfo.length;
      const total = totalTick / cpuInfo.length;
      cpuUsage = (100 - ~~(100 * idle / total));
    }

    // CPU-Frequenz (aktuell)
    let frequency = cpus[0].speed; // Fallback
    try {
      // Versuche aktuelle Frequenz zu lesen
      const freqCommand = `powershell -Command "Get-WmiObject Win32_Processor | Select-Object -ExpandProperty CurrentClockSpeed"`;
      const { stdout: freqOut } = await execPromise(freqCommand);
      const freq = parseInt(freqOut.trim());
      if (freq && freq > 0) {
        frequency = freq;
      }
    } catch (e) {
      // Verwende os.cpus() speed als Fallback
      frequency = cpus[0].speed;
    }

    return {
      success: true,
      data: {
        model: cpuModel,
        cores: cpuCores,
        usage: parseFloat(cpuUsage).toFixed(1),
        frequency: frequency,
        speeds: cpus.map(cpu => cpu.speed)
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// RAM-Informationen
ipcMain.handle('get-ram-info', async () => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = ((usedMem / totalMem) * 100).toFixed(1);

    return {
      success: true,
      data: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: usagePercent
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Festplatten-Informationen
ipcMain.handle('get-disk-info', async () => {
  try {
    const command = `powershell -Command "Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -ne $null} | Select-Object Name, @{Name='TotalGB';Expression={[math]::Round(($_.Used + $_.Free)/1GB, 2)}}, @{Name='UsedGB';Expression={[math]::Round($_.Used/1GB, 2)}}, @{Name='FreeGB';Expression={[math]::Round($_.Free/1GB, 2)}}, @{Name='PercentUsed';Expression={[math]::Round(($_.Used/($_.Used + $_.Free))*100, 1)}} | ConvertTo-Json"`;

    const { stdout } = await execPromise(command);
    let drives = JSON.parse(stdout);

    // Stelle sicher dass es ein Array ist
    if (!Array.isArray(drives)) {
      drives = [drives];
    }

    return {
      success: true,
      data: drives
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Netzwerk-Informationen
ipcMain.handle('get-network-info', async () => {
  try {
    const command = `powershell -Command "Get-NetAdapterStatistics | Where-Object {$_.ReceivedBytes -gt 0} | Select-Object Name, ReceivedBytes, SentBytes | ConvertTo-Json"`;

    const { stdout } = await execPromise(command);
    let adapters = JSON.parse(stdout);

    // Stelle sicher dass es ein Array ist
    if (!Array.isArray(adapters)) {
      adapters = [adapters];
    }

    return {
      success: true,
      data: {
        adapters: adapters
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// System-Uptime
ipcMain.handle('get-system-uptime', async () => {
  try {
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    let formatted = '';
    if (days > 0) {
      formatted = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      formatted = `${hours}h ${minutes}m`;
    } else {
      formatted = `${minutes}m`;
    }

    return {
      success: true,
      data: {
        seconds: uptime,
        formatted: formatted
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
