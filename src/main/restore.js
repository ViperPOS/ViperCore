const { app } = require('electron');
const fs = require('fs');
const path = require('path');

async function restoreLCdbLocal(sourceDbPath, sourceKey = null, currentKey = null) {
    try {
        await app.whenReady();

        const userDataPath = app.getPath('userData');
        const destDbPath = path.join(userDataPath, 'LC.db');

        console.log(`🔄 Restoring database from: ${sourceDbPath}`);
        console.log(`📁 Restoring to: ${destDbPath}`);

        if (!fs.existsSync(sourceDbPath)) {
            throw new Error(`Source database file not found at: ${sourceDbPath}`);
        }

        const destDir = path.dirname(destDbPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(destDir, `LC_backup_${timestamp}.db`);

        if (fs.existsSync(destDbPath)) {
            await fs.promises.copyFile(destDbPath, backupPath);
            console.log(`📋 Current database backed up to: ${backupPath}`);
        }

        if (sourceKey && currentKey && sourceKey !== currentKey) {
            console.log('🔐 Re-encrypting backup with current key...');
            reEncryptDatabase(sourceDbPath, sourceKey, destDbPath, currentKey);
        } else {
            await fs.promises.copyFile(sourceDbPath, destDbPath);
        }

        console.log(`✅ Local database restored successfully from: ${sourceDbPath}`);
        return true;
    } catch (error) {
        console.error('❌ Local restore failed:', error);
        return false;
    }
}

function reEncryptDatabase(sourcePath, sourceKey, destPath, destKey) {
    const Database = require('better-sqlite3-multiple-ciphers');
    const tempPath = destPath + '.reenc.tmp';
    let srcDb, destDb;
    try {
        srcDb = new Database(sourcePath, { readonly: true });
        srcDb.pragma(`key = '${sourceKey}'`);
        srcDb.pragma('journal_mode = DELETE');
        srcDb.prepare('SELECT count(*) FROM sqlite_master').get();

        destDb = new Database(tempPath);
        destDb.pragma(`key = '${destKey}'`);
        destDb.pragma('journal_mode = WAL');

        const escapedTemp = tempPath.replace(/'/g, "''");
        srcDb.exec(`ATTACH DATABASE '${escapedTemp}' AS reencrypted KEY '${destKey}'`);
        srcDb.exec("SELECT sqlcipher_export('reencrypted')");
        srcDb.exec("DETACH DATABASE reencrypted");

        destDb.close();
        srcDb.close();

        fs.copyFileSync(tempPath, destPath);
        console.log('🔐 Backup re-encrypted successfully.');
    } catch (err) {
        console.error('❌ Re-encryption failed:', err.message);
        throw err;
    } finally {
        if (srcDb) try { srcDb.close(); } catch (_) {}
        if (destDb) try { destDb.close(); } catch (_) {}
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
    }
}

module.exports = { restoreLCdbLocal };
