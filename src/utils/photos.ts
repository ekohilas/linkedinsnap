const STORAGE_KEY = 'linkedinsnap:photos';

/** Keeps the roll well inside the ~5MB localStorage budget. */
const MAX_PHOTOS = 12;

export interface Photo {
  id: string;
  dataUrl: string;
  takenAt: number;
}

function isPhoto(value: unknown): value is Photo {
  if (typeof value !== 'object' || value === null) return false;
  const photo = value as Partial<Photo>;
  return (
    typeof photo.id === 'string' &&
    typeof photo.dataUrl === 'string' &&
    typeof photo.takenAt === 'number'
  );
}

/** Newest first, so the gallery reads top to bottom. */
export function loadPhotos(): Photo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPhoto);
  } catch {
    return [];
  }
}

/**
 * Writes the roll, dropping the oldest photos until it fits. Returns what
 * actually made it to storage so the caller renders the truth.
 */
function writePhotos(photos: Photo[]): Photo[] {
  let kept = photos.slice(0, MAX_PHOTOS);

  while (kept.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
      return kept;
    } catch {
      // Out of quota (or storage unavailable): shed the oldest and retry.
      kept = kept.slice(0, kept.length - 1);
    }
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private browsing); keeping photos is best-effort.
  }
  return [];
}

export function addPhoto(dataUrl: string): Photo[] {
  const photo: Photo = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dataUrl,
    takenAt: Date.now(),
  };
  return writePhotos([photo, ...loadPhotos()]);
}

export function removePhoto(id: string): Photo[] {
  return writePhotos(loadPhotos().filter((photo) => photo.id !== id));
}
