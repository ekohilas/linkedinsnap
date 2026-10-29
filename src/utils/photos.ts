const DB_NAME = 'linkedinsnap';
const DB_VERSION = 1;
const STORE = 'photos';

/**
 * Where a photo goes when IndexedDB can't save it (private browsing, mostly).
 * localStorage only has room for one, so each capture replaces the last.
 */
const FALLBACK_STORAGE_KEY = 'linkedinsnap:fallback-photo';

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

interface FallbackPhoto {
  id: string;
  dataUrl: string;
  takenAt: number;
}

function isFallbackPhoto(value: unknown): value is FallbackPhoto {
  if (typeof value !== 'object' || value === null) return false;
  const photo = value as Partial<FallbackPhoto>;
  return (
    typeof photo.id === 'string' &&
    typeof photo.dataUrl === 'string' &&
    typeof photo.takenAt === 'number'
  );
}

async function loadFallbackPhoto(): Promise<Photo | undefined> {
  try {
    const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!stored) return undefined;
    const parsed: unknown = JSON.parse(stored);
    if (!isFallbackPhoto(parsed)) return undefined;
    const { id, dataUrl, takenAt } = parsed;
    return { id, blob: await (await fetch(dataUrl)).blob(), takenAt };
  } catch {
    return undefined;
  }
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadStoredPhotos(): Promise<Photo[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    return await request(tx.objectStore(STORE).getAll() as IDBRequest<Photo[]>);
  } catch (err) {
    console.error('Photo load error:', err);
    return [];
  }
}

export interface Roll {
  /** Newest first, so the gallery reads top to bottom. */
  photos: Photo[];
  /** True when photos are falling back to the one-photo localStorage slot. */
  limited: boolean;
}

export async function loadPhotos(): Promise<Roll> {
  const [stored, fallback] = await Promise.all([
    loadStoredPhotos(),
    loadFallbackPhoto(),
  ]);
  const photos = fallback ? [...stored, fallback] : stored;
  return {
    photos: photos.sort((a, b) => b.takenAt - a.takenAt),
    limited: fallback !== undefined,
  };
}

/**
 * Asks the browser not to clear the roll when the device runs low on space.
 * The browser may say no; the photos are still stored either way.
 */
function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

async function storePhoto(photo: Photo) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).add(photo);
  await done(tx);
  requestPersistence();
}

/**
 * Saves a photo, never dropping older ones from IndexedDB to make room. If
 * IndexedDB can't take it, the photo replaces the single localStorage slot
 * instead. Rejects only when neither can store it.
 */
export async function addPhoto(blob: Blob): Promise<void> {
  const photo: Photo = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    blob,
    takenAt: Date.now(),
  };

  try {
    await storePhoto(photo);
    return;
  } catch (err) {
    console.error('Photo save error, falling back to localStorage:', err);
  }

  const fallback: FallbackPhoto = {
    id: photo.id,
    dataUrl: await toDataUrl(blob),
    takenAt: photo.takenAt,
  };
  localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(fallback));
}
