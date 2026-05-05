const { app } = require('electron');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

function normalizeBaseUrl(projectUrl) {
  return String(projectUrl || '').trim().replace(/\/+$/, '');
}

function getDownloadFileName(updateInfo) {
  const fileName = String(updateInfo?.fileName || '').trim();
  if (fileName) return fileName;

  const version = String(updateInfo?.latestVersion || app.getVersion()).trim();
  return `ProperLCP-${version || 'update'}.exe`;
}

class UpdateService extends EventEmitter {
  constructor({ getSetupRow, getRemoteAuthConfig, getAppIdentity }) {
    super();
    this.getSetupRow = getSetupRow;
    this.getRemoteAuthConfig = getRemoteAuthConfig;
    this.getAppIdentity = getAppIdentity;
    this.state = {
      status: 'idle',
      updateAvailable: false,
      checking: false,
      downloading: false,
      canInstall: false,
      currentVersion: app.getVersion(),
      latestVersion: app.getVersion(),
      message: '',
      error: '',
      updateInfo: null,
      downloadedPath: null,
      lastCheckedAt: null,
      progress: 0,
    };
  }

  emitState(overrides = {}) {
    this.state = {
      ...this.state,
      ...overrides,
    };
    this.emit('status', this.getStatus());
    return this.state;
  }

  getStatus() {
    return {
      ...this.state,
      updateInfo: this.state.updateInfo
        ? { ...this.state.updateInfo }
        : null,
    };
  }

  async fetchUpdateInfo() {
    const setupRow = await this.getSetupRow?.();
    const remoteConfig = this.getRemoteAuthConfig?.(setupRow);
    const appIdentity = await Promise.resolve(this.getAppIdentity?.());

    if (!setupRow || Number(setupRow?.is_initialized || 0) !== 1) {
      throw new Error('App setup is incomplete.');
    }

    if (!remoteConfig?.functionsBaseUrl || !remoteConfig?.anonKey) {
      throw new Error('Supabase update configuration is missing.');
    }

    const appInstanceId = String(appIdentity?.appInstanceId || '').trim();
    if (!appInstanceId) {
      throw new Error('App instance identity is unavailable.');
    }

    const payload = {
      tenantId: String(setupRow.tenant_id || '').trim(),
      appInstanceId,
      currentVersion: app.getVersion(),
      platform: String(appIdentity?.platform || process.platform).trim(),
      arch: String(appIdentity?.arch || process.arch).trim(),
      appVersion: String(appIdentity?.appVersion || app.getVersion()).trim(),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(`${normalizeBaseUrl(remoteConfig.functionsBaseUrl)}/check-update`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${remoteConfig.anonKey}`,
          apikey: remoteConfig.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        throw new Error('Update check timed out after 15 seconds.');
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to check for updates.');
    }

    return data;
  }

  async checkForUpdates() {
    this.emitState({
      status: 'checking',
      checking: true,
      error: '',
      message: 'Checking for updates...',
      progress: 0,
    });

    try {
      const data = await this.fetchUpdateInfo();

      if (!data?.updateAvailable) {
        return this.emitState({
          status: 'idle',
          checking: false,
          updateAvailable: false,
          canInstall: false,
          updateInfo: null,
          downloadedPath: null,
          latestVersion: data?.latestVersion || app.getVersion(),
          message: data?.message || 'You are already on the latest version.',
          error: '',
          lastCheckedAt: new Date().toISOString(),
          progress: 0,
        });
      }

      return this.emitState({
        status: 'update-available',
        checking: false,
        updateAvailable: true,
        canInstall: false,
        updateInfo: data,
        downloadedPath: null,
        latestVersion: data.latestVersion || app.getVersion(),
        message: data.message || `Version ${data.latestVersion} is available.`,
        error: '',
        lastCheckedAt: new Date().toISOString(),
        progress: 0,
      });
    } catch (error) {
      const message = error?.message || 'Failed to check for updates.';
      this.emit('error', { message });
      return this.emitState({
        status: 'error',
        checking: false,
        error: message,
        message: '',
        progress: 0,
      });
    }
  }

  async downloadLatestUpdate() {
    const updateInfo = this.state.updateInfo;

    if (!updateInfo?.downloadUrl && !updateInfo?.chunkUrls) {
      throw new Error('No downloadable update is available.');
    }

    const targetDir = path.join(app.getPath('temp'), 'ProperLCP-Updates');
    await fs.promises.mkdir(targetDir, { recursive: true });

    const fileName = getDownloadFileName(updateInfo);
    const targetPath = path.join(targetDir, fileName);

    this.emitState({
      status: 'downloading',
      downloading: true,
      canInstall: false,
      error: '',
      message: 'Downloading update...',
      progress: 0,
    });

    try {
      const isChunked = Number(updateInfo.chunkCount) > 1 && Array.isArray(updateInfo.chunkUrls) && updateInfo.chunkUrls.length > 0;
      const totalBytes = Number(updateInfo.fileSize || 0);
      let transferredBytes = 0;
      const speedTracker = { bytes: 0, lastTime: Date.now(), speed: 0 };

      const trackSpeed = (bytes) => {
        const now = Date.now();
        speedTracker.bytes += bytes;
        const elapsed = now - speedTracker.lastTime;
        if (elapsed >= 1000) {
          speedTracker.speed = Math.round((speedTracker.bytes / elapsed) * 1000);
          speedTracker.bytes = 0;
          speedTracker.lastTime = now;
        }
        return speedTracker.speed;
      };

      const buildProgressPayload = (extra = {}) => {
        const speed = speedTracker.speed;
        const remaining = speed > 0 && totalBytes > 0 ? Math.max(0, Math.ceil((totalBytes - transferredBytes) / speed)) : null;
        return {
          status: 'downloading',
          progress: totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0,
          transferredBytes,
          totalBytes,
          downloadedPath: targetPath,
          speed,
          remainingSeconds: remaining,
          ...extra,
        };
      };

      if (isChunked) {
        const writeStream = fs.createWriteStream(targetPath);

        writeStream.on('error', (err) => {
          writeStream.destroy();
          throw err;
        });

        try {
          for (let i = 0; i < updateInfo.chunkUrls.length; i++) {
            this.emitState({
              message: `Downloading chunk ${i + 1} of ${updateInfo.chunkUrls.length}...`,
              chunkIndex: i,
              chunkTotal: updateInfo.chunkUrls.length,
            });

            const response = await fetch(updateInfo.chunkUrls[i]);
            if (!response.ok || !response.body) {
              throw new Error(`Failed to download chunk ${i + 1}.`);
            }

            const readable = Readable.fromWeb(response.body);

            await new Promise((resolve, reject) => {
              readable.on('data', (chunk) => {
                transferredBytes += chunk.length;
                trackSpeed(chunk.length);
                this.emit('progress', buildProgressPayload({
                  chunkIndex: i,
                  chunkTotal: updateInfo.chunkUrls.length,
                }));
              });

              readable.on('error', (err) => {
                readable.destroy();
                reject(err);
              });
              readable.on('end', resolve);
              readable.pipe(writeStream, { end: false });
            });
          }
        } catch (chunkErr) {
          writeStream.destroy();
          await fs.promises.unlink(targetPath).catch(() => {});
          throw chunkErr;
        }

        writeStream.end();
        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      } else {
        const response = await fetch(updateInfo.downloadUrl);
        if (!response.ok || !response.body) {
          throw new Error('Failed to download update artifact.');
        }

        const contentLength = Number(response.headers.get('content-length') || 0);
        const effectiveTotal = totalBytes || contentLength;
        const writeStream = fs.createWriteStream(targetPath);
        const readable = Readable.fromWeb(response.body);

        await new Promise((resolve, reject) => {
          readable.on('data', (chunk) => {
            transferredBytes += chunk.length;
            trackSpeed(chunk.length);
            this.emit('progress', buildProgressPayload());
          });

          readable.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('finish', resolve);

          readable.pipe(writeStream);
        });
      }

      if (updateInfo.sha256) {
        this.emitState({ message: 'Verifying download...' });
        const fileBuffer = await fs.promises.readFile(targetPath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        if (hash !== updateInfo.sha256) {
          await fs.promises.unlink(targetPath).catch(() => {});
          throw new Error('Download verification failed. The file may be corrupted.');
        }
      }

      return this.emitState({
        status: 'downloaded',
        downloading: false,
        canInstall: true,
        downloadedPath: targetPath,
        progress: 100,
        message: 'Update downloaded. You can install it now.',
        error: '',
      });
    } catch (error) {
      const message = error?.message || 'Failed to download update artifact.';
      this.emit('error', { message });
      return this.emitState({
        status: 'error',
        downloading: false,
        canInstall: false,
        downloadedPath: null,
        message: '',
        error: message,
        progress: 0,
      });
    }
  }

  async installDownloadedUpdate() {
    const downloadedPath = this.state.downloadedPath;
    if (!downloadedPath || !fs.existsSync(downloadedPath)) {
      throw new Error('Download the update before installing it.');
    }

    try {
      if (process.platform === 'win32') {
        spawn(downloadedPath, [], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        }).unref();
      } else {
        spawn(downloadedPath, [], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      }
    } catch (error) {
      const message = error?.message || 'Failed to launch installer.';
      this.emit('error', { message });
      return this.emitState({
        status: 'error',
        error: message,
        message: '',
      });
    }

    this.emitState({
      status: 'installing',
      message: 'Launching installer...',
      error: '',
    });

    app.quit();
    return { success: true };
  }
}

module.exports = UpdateService;
