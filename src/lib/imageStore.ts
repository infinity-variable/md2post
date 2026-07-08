/**
 * 图片 IndexedDB 存储
 * LocalStorage 有 ~5MB 限制，base64 图片很容易超出
 * IndexedDB 没有此限制，适合存储图片
 */

const DB_NAME = "md2post-images";
const STORE_NAME = "images";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadImageStore(): Promise<Record<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    const keysRequest = store.getAllKeys();

    let results: Record<string, string> = {};
    let dataDone = false;
    let keysDone = false;

    function tryResolve() {
      if (dataDone && keysDone) {
        const keys = keysRequest.result as IDBValidKey[];
        const values = request.result as string[];
        for (let i = 0; i < keys.length; i++) {
          results[String(keys[i])] = values[i];
        }
        resolve(results);
      }
    }

    request.onsuccess = () => { dataDone = true; tryResolve(); };
    keysRequest.onsuccess = () => { keysDone = true; tryResolve(); };
    request.onerror = () => reject(request.error);
    keysRequest.onerror = () => reject(keysRequest.error);
  });
}

export async function saveImageToStore(ref: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(dataUrl, ref);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteImageFromStore(ref: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(ref);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearImageStore(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 清理未引用的图片：删除 IndexedDB 中未被 markdown 内容引用的图片
 * @param usedRefs 当前 markdown 中正在使用的 ref 集合
 * @returns 被删除的 ref 列表
 */
export async function cleanupUnusedImages(usedRefs: Set<string>): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const keysRequest = store.getAllKeys();

    keysRequest.onsuccess = () => {
      const allKeys = keysRequest.result as IDBValidKey[];
      const deleted: string[] = [];
      for (const key of allKeys) {
        const ref = String(key);
        if (!usedRefs.has(ref)) {
          store.delete(ref);
          deleted.push(ref);
        }
      }
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    };
    keysRequest.onerror = () => reject(keysRequest.error);
  });
}
