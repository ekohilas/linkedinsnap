const DB_NAME = 'linkedinsnap';
const DB_VERSION = 1;
const STORE = 'photos';

/** Where the roll lived before IndexedDB; migrated once, then removed. */
const LEGACY_STORAGE_KEY = 'linkedinsnap:photos';

export interface Photo {
  id: string;
  blob: Blob;
  takenAt: number;
}

interface LegacyPhoto {
  id: string;
  dataUrl: string;
  takenAt: number;
}

function isLegacyPhoto(value: unknown): value is LegacyPhoto {
  if (typeof value !== 'object' || value === null) return false;
  const photo = value as Partial<LegacyPhoto>;
  return (
    typeof photo.id === 'string' &&
    typeof photo.dataUrl === 'string' &&
    typeof photo.takenAt === 'number'
  );
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Aborted', 'AbortError'));
  });
}

/**
 * Copies photos saved by older versions out of localStorage. The old key is
 * only removed once every photo is safely in IndexedDB, so a failure part way
 * leaves the original copy to try again next time.
 */
async function migrateLegacyPhotos(db: IDBDatabase) {
  let stored: string | null;
  try {
    stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return;
  }
  if (!stored) return;

  let legacy: LegacyPhoto[] = [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) legacy = parsed.filter(isLegacyPhoto);
  } catch {
    // Unreadable: nothing we can recover from it.
  }

  // Decode before opening the transaction: it would close while we await.
  const photos = await Promise.all(
    legacy.map(async ({ id, dataUrl, takenAt }): Promise<Photo> => ({
      id,
      blob: await (await fetch(dataUrl)).blob(),
      takenAt,
    })),
  );

  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  // put, not add: a retry after a half-finished migration overwrites cleanly.
  photos.forEach((photo) => store.put(photo));
  await done(tx);

  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= (async () => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    const db = await request(req);
    try {
      await migrateLegacyPhotos(db);
    } catch (err) {
      console.error('Photo migration error:', err);
    }
    return db;
  })();
  // Let a failed open be retried rather than caching the failure.
  dbPromise.catch(() => {
    dbPromise = undefined;
  });
  return dbPromise;
}

/** Newest first, so the gallery reads top to bottom. */
export async function loadPhotos(): Promise<Photo[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const photos = await request(tx.objectStore(STORE).getAll() as IDBRequest<Photo[]>);
    return photos.sort((a, b) => b.takenAt - a.takenAt);
  } catch (err) {
    console.error('Photo load error:', err);
    return [];
  }
}

/**
 * Asks the browser not to clear the roll when the device runs low on space.
 * The browser may say no; the photos are still stored either way.
 */
function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

/** Saves a photo. Rejects (for example when storage is full) rather than
 * dropping older photos to make room. */
export async function addPhoto(blob: Blob): Promise<void> {
  const photo: Photo = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    blob,
    takenAt: Date.now(),
  };
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).add(photo);
  await done(tx);
  requestPersistence();
}
