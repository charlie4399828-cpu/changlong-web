const CMS_DB_NAME = "changlong_cms";
const CMS_DB_VERSION = 1;
const CMS_MEDIA_STORE = "media";
const CMS_DATA_KEY = "changlong_site_data";

let cmsDb = null;

function openCMSDatabase() {
  if (cmsDb) return Promise.resolve(cmsDb);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CMS_DB_NAME, CMS_DB_VERSION);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(CMS_MEDIA_STORE)) {
        db.createObjectStore(CMS_MEDIA_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = e => { cmsDb = e.target.result; resolve(cmsDb); };
    request.onerror = () => reject(request.error);
  });
}

async function saveMediaFile(file) {
  const db = await openCMSDatabase();
  const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now()
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CMS_MEDIA_STORE, "readwrite");
    tx.objectStore(CMS_MEDIA_STORE).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

async function getMediaRecord(id) {
  const db = await openCMSDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CMS_MEDIA_STORE, "readonly");
    const req = tx.objectStore(CMS_MEDIA_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteMediaFile(id) {
  const db = await openCMSDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CMS_MEDIA_STORE, "readwrite");
    tx.objectStore(CMS_MEDIA_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function listAllMedia() {
  const db = await openCMSDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CMS_MEDIA_STORE, "readonly");
    const req = tx.objectStore(CMS_MEDIA_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function loadSiteData() {
  try {
    const raw = localStorage.getItem(CMS_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSiteData(data) {
  localStorage.setItem(CMS_DATA_KEY, JSON.stringify(data));
  localStorage.setItem("changlong_cms_version", String(Date.now()));
}

function getCMSVersion() {
  return localStorage.getItem("changlong_cms_version") || "0";
}

function clearSiteData() {
  localStorage.removeItem(CMS_DATA_KEY);
}
