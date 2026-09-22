const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const SUPABASE = require('./supabase-config.cjs');

function cloudSafeState(state) {
  const copy = structuredClone(state || {});
  copy.notes = Array.isArray(copy.notes) ? copy.notes.map(note => {
    const clean = { ...note };
    if (clean.type === 'organizer') {
      clean.desktopItems = Array.isArray(clean.desktopItems) ? clean.desktopItems.map(item => ({ id: item.id, name: item.name, kind: item.kind, order: item.order })) : [];
    }
    for (const key of ['captureImage', 'pinnedImage', 'screenshot', 'imageData', 'localPet', 'customPet']) delete clean[key];
    return clean;
  }) : [];
  delete copy.customPets;
  delete copy.petAssets;
  return copy;
}

function checksum(state) { return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex'); }

// Cloud documents deliberately exclude machine-local paths and binary assets.
// Re-applying a cloud payload must therefore hydrate, rather than replace,
// those fields or every successful sync would erase organizer icons/targets.
function preserveDeviceLocalFields(nextState, localState) {
  const next = structuredClone(nextState || {});
  const localNotes = new Map((localState?.notes || []).map(note => [note.id, note]));
  for (const note of next.notes || []) {
    const local = localNotes.get(note.id);
    if (!local) continue;
    for (const key of ['captureImage', 'pinnedImage', 'screenshot', 'imageData', 'localPet', 'customPet']) {
      if (note[key] == null && local[key] != null) note[key] = structuredClone(local[key]);
    }
    if (note.type !== 'organizer') continue;
    const localItems = new Map((local.desktopItems || []).map(item => [item.id, item]));
    for (const item of note.desktopItems || []) {
      const saved = localItems.get(item.id) || (local.desktopItems || []).find(candidate => candidate.name === item.name && candidate.kind === item.kind);
      if (!saved) continue;
      for (const key of ['path', 'icon', 'iconVersion']) if (item[key] == null && saved[key] != null) item[key] = saved[key];
    }
  }
  for (const key of ['customPets', 'petAssets']) if (next[key] == null && localState?.[key] != null) next[key] = structuredClone(localState[key]);
  return next;
}

function mergeStates(local, remote) {
  if (!remote?.notes) return local;
  const merged = structuredClone(remote);
  const remoteById = new Map(remote.notes.map(note => [note.id, note]));
  for (const note of local?.notes || []) {
    const cloudNote = remoteById.get(note.id);
    if (!cloudNote) { merged.notes.push(note); continue; }
    if (JSON.stringify(cloudNote) !== JSON.stringify(note)) {
      merged.notes.push({ ...note, id: `${note.id}-conflict-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, title: `${note.title || ''}（同步冲突副本）`, x: Number(note.x || 0) + 24, y: Number(note.y || 0) + 24 });
    }
  }
  return merged;
}

class CloudSyncManager {
  constructor({ app, safeStorage, serviceUrl = SUPABASE.url, anonKey = SUPABASE.anonKey, getState, applyState, onStatus = () => {} }) {
    this.app = app; this.safeStorage = safeStorage; this.serviceUrl = serviceUrl.replace(/\/$/, ''); this.anonKey = anonKey; this.getState = getState; this.applyState = applyState; this.onStatus = onStatus;
    this.sessionPath = path.join(app.getPath('userData'), 'cloud-session.bin');
    this.metaPath = path.join(app.getPath('userData'), 'cloud-sync.json');
    this.deviceId = this.loadMeta().deviceId || crypto.randomUUID();
    this.meta = { revision: 0, ...this.loadMeta(), deviceId: this.deviceId };
    this.session = this.loadSession(); this.timer = null; this.running = null;
  }
  loadMeta() { try { return JSON.parse(fs.readFileSync(this.metaPath, 'utf8')); } catch { return {}; } }
  saveMeta() { fs.writeFileSync(this.metaPath, JSON.stringify(this.meta), { mode: 0o600 }); }
  loadSession() { try { if (!this.safeStorage.isEncryptionAvailable()) return null; return JSON.parse(this.safeStorage.decryptString(fs.readFileSync(this.sessionPath))); } catch { return null; } }
  saveSession(value) { this.session = value; if (!value) { try { fs.unlinkSync(this.sessionPath); } catch {} return; } if (!this.safeStorage.isEncryptionAvailable()) throw new Error('Windows 安全存储不可用'); fs.writeFileSync(this.sessionPath, this.safeStorage.encryptString(JSON.stringify(value)), { mode: 0o600 }); }
  status(extra = {}) { return { loggedIn: Boolean(this.session?.access_token), email: this.session?.user?.email || null, revision: this.meta.revision || 0, lastSyncedAt: this.meta.lastSyncedAt || null, ...extra }; }
  async request(route, options = {}, retry = true) {
    const headers = { apikey: this.anonKey, 'content-type': 'application/json', ...(options.headers || {}) };
    if (this.session?.access_token) headers.authorization = `Bearer ${this.session.access_token}`;
    const response = await fetch(`${this.serviceUrl}${route}`, { ...options, headers, signal: AbortSignal.timeout(15000) });
    if (response.status === 401 && retry && this.session?.refresh_token) { await this.refresh(); return this.request(route, options, false); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || `云服务错误 ${response.status}`);
    return { response, data };
  }
  async auth(action, credentials) {
    const routes = { signup: '/auth/v1/signup', login: '/auth/v1/token?grant_type=password', reset: '/auth/v1/recover' };
    const route = routes[action]; if (!route) throw new Error('不支持的账号操作');
    const body = action === 'reset' ? { email: credentials.email } : { email: credentials.email, password: credentials.password };
    const { data } = await this.request(route, { method: 'POST', body: JSON.stringify(body) }, false);
    if (data.access_token) { this.saveSession(data); await this.registerDevice(); await this.sync('login'); }
    return this.status({ confirmationRequired: action === 'signup' && !data.access_token });
  }
  async refresh() { const token = this.session?.refresh_token; if (!token) throw new Error('请重新登录'); const { data } = await this.request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: token }) }, false); this.saveSession(data); }
  logout() { this.saveSession(null); this.meta.revision = 0; this.saveMeta(); this.onStatus(this.status()); return this.status(); }
  async registerDevice() {
    await this.request('/rest/v1/pindo_devices?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: this.deviceId, user_id: this.session.user.id, name: os.hostname(), platform: `${os.platform()} ${os.release()}`, app_version: this.app.getVersion(), last_seen_at: new Date().toISOString() })
    });
  }
  schedule() { if (!this.session) return; clearTimeout(this.timer); this.timer = setTimeout(() => void this.sync('local-change').catch(error => this.onStatus(this.status({ error: error.message }))), 3000); }
  async sync(reason = 'manual') {
    if (!this.session) throw new Error('请先登录 PinDo 账号');
    if (this.running) return this.running;
    this.running = this.runSync(reason).finally(() => { this.running = null; }); return this.running;
  }
  async runSync(reason) {
    this.onStatus(this.status({ syncing: true, reason }));
    const localFull = this.getState();
    const local = cloudSafeState(localFull);
    const localChecksum = checksum(local);
    const pull = await this.request('/rest/v1/pindo_sync_documents?select=revision,payload,checksum,device_id,updated_at&limit=1');
    const row = Array.isArray(pull.data) ? pull.data[0] : null;
    const remote = row ? { revision: Number(row.revision), state: row.payload, checksum: row.checksum, deviceId: row.device_id, updatedAt: Date.parse(row.updated_at) } : { revision: 0, state: null, checksum: null };
    if (remote.state && remote.revision > (this.meta.revision || 0)) {
      // A newer revision with identical content only advances metadata. It
      // must not rebuild every renderer and interrupt typing/dragging.
      if (remote.checksum !== localChecksum) {
        const merged = preserveDeviceLocalFields(mergeStates(local, remote.state), localFull);
        this.applyState(merged);
      }
      this.meta.revision = remote.revision;
    }
    const current = cloudSafeState(this.getState()); const currentChecksum = checksum(current);
    if (remote.checksum !== currentChecksum) {
      const pushed = await this.request('/rest/v1/rpc/pindo_push_sync', { method: 'POST', body: JSON.stringify({ p_base_revision: this.meta.revision || remote.revision || 0, p_device_id: this.deviceId, p_payload: current, p_checksum: currentChecksum }) });
      if (pushed.data?.conflict) {
        const merged = mergeStates(current, pushed.data.current?.state); this.applyState(merged); this.meta.revision = pushed.data.current?.revision || 0;
        return this.runSync('conflict-merge');
      }
      this.meta.revision = pushed.data.revision;
    }
    this.meta.lastSyncedAt = Date.now(); this.saveMeta(); const result = this.status({ syncing: false }); this.onStatus(result); return result;
  }
}

module.exports = { CloudSyncManager, cloudSafeState, mergeStates, checksum, preserveDeviceLocalFields };
