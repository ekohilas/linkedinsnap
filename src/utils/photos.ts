const DB_NAME = 'linkedinsnap';
const DB_VERSION = 1;
const STORE = 'photos';

export interface Photo {
  id: string;
  blob: Blob;
  takenAt: number;
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

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    req.result.createObjectStore(STORE, { keyPath: 'id' });
  };
  dbPromise = request(req);
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
