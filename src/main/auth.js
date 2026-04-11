const bcrypt = require('bcryptjs');

function readAuthConfig() {
  const supabaseEnabled = String(process.env.SUPABASE_AUTH_ENABLED || '').toLowerCase() === 'true';

  return {
    provider: process.env.AUTH_PROVIDER || 'local',
    supabaseEnabled,
    allowRemoteAuth: supabaseEnabled && process.env.NODE_ENV === 'production',
  };
}

function normalizeLoginInput(username, password) {
  return {
    username: String(username || '').trim().toLowerCase(),
    password: String(password || ''),
  };
}

function hashSecret(secret) {
  return bcrypt.hashSync(String(secret || ''), 12);
}

function compareSecret(secret, hash) {
  if (!secret || !hash) {
    return false;
  }

  return bcrypt.compareSync(String(secret), String(hash));
}

function isSupabaseAuthEnabled() {
  return readAuthConfig().allowRemoteAuth;
}

function getAuthBootstrapState() {
  const config = readAuthConfig();

  return {
    provider: config.provider,
    remoteEnabled: config.allowRemoteAuth,
    devDisabled: !config.allowRemoteAuth,
  };
}

module.exports = {
  readAuthConfig,
  normalizeLoginInput,
  hashSecret,
  compareSecret,
  isSupabaseAuthEnabled,
  getAuthBootstrapState,
};