/**
 * IndexedDB cache for GET /api/products responses (24h TTL) + background full-catalog snapshot.
 * Prefetch runs in requestIdleCallback / setTimeout to stay off the critical path.
 */
(function (global) {
  var DB_NAME = "urbanvibe_products_v1";
  var STORE_PAGES = "pages";
  var STORE_CATALOG = "catalog";
  var DAY_MS = 86400000;

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onerror = function () {
        reject(req.error);
      };
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_PAGES)) db.createObjectStore(STORE_PAGES);
        if (!db.objectStoreNames.contains(STORE_CATALOG)) db.createObjectStore(STORE_CATALOG);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
    });
  }

  function idbGet(storeName, key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readonly");
        var r = tx.objectStore(storeName).get(key);
        r.onsuccess = function () {
          resolve(r.result || null);
        };
        r.onerror = function () {
          reject(r.error);
        };
      });
    });
  }

  function idbPut(storeName, key, value) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function isFresh(cachedAt) {
    return cachedAt && Date.now() - cachedAt < DAY_MS;
  }

  /**
   * Fetch JSON for a full URL; serve from IDB if fresh.
   */
  function fetchProducts(url, opts) {
    var useCache = !opts || opts.useCache !== false;
    if (!useCache) {
      return fetch(url)
        .then(function (res) {
          return res.json().then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (_ref) {
          var res = _ref.res;
          var json = _ref.json;
          if (res.ok && json && json.success) {
            idbPut(STORE_PAGES, url, { cachedAt: Date.now(), json: json }).catch(function () {});
          }
          return json;
        });
    }
    return idbGet(STORE_PAGES, url).then(function (row) {
      if (row && isFresh(row.cachedAt) && row.json) {
        return row.json;
      }
      return fetch(url)
        .then(function (res) {
          return res.json().then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (_ref2) {
          var res = _ref2.res;
          var json = _ref2.json;
          if (res.ok && json && json.success) {
            return idbPut(STORE_PAGES, url, { cachedAt: Date.now(), json: json }).then(function () {
              return json;
            });
          }
          return json;
        });
    });
  }

  var idle =
    global.requestIdleCallback ||
    function (cb) {
      return setTimeout(function () {
        cb({ timeRemaining: function () {
          return 50;
        } });
      }, 250);
    };

  function schedulePrefetch(buildUrl, totalPages, fromPage, maxPrefetch) {
    if (fromPage > totalPages || maxPrefetch < 1) return;
    var end = Math.min(totalPages, fromPage + maxPrefetch - 1);
    var p = fromPage;
    function work(deadline) {
      while (p <= end) {
        if (deadline.timeRemaining && deadline.timeRemaining() < 6 && p < end) {
          idle(work);
          return;
        }
        var u = buildUrl(p);
        fetchProducts(u, { useCache: true }).catch(function () {});
        p += 1;
      }
    }
    idle(work);
  }

  var CATALOG_META_KEY = "snapshot";

  function getCatalogSnapshot() {
    return idbGet(STORE_CATALOG, CATALOG_META_KEY).then(function (row) {
      if (!row || !isFresh(row.updatedAt) || !Array.isArray(row.items)) return null;
      return row;
    });
  }

  function setCatalogSnapshot(items) {
    return idbPut(STORE_CATALOG, CATALOG_META_KEY, {
      updatedAt: Date.now(),
      items: items
    });
  }

  /**
   * Download all product pages in the background (yields between pages). Safe to call often; skips if snapshot fresh.
   */
  function startBackgroundCatalogSync() {
    getCatalogSnapshot().then(function (existing) {
      if (existing && existing.items && existing.items.length) return;

      idle(function () {
        var all = [];
        var page = 1;
        var limit = 100;

        function nextPage() {
          var url = "/api/products?page=" + page + "&limit=" + limit + "&sort=newest";
          fetch(url)
            .then(function (res) {
              return res.json();
            })
            .then(function (json) {
              if (!json || !json.success || !json.data) {
                if (all.length) setCatalogSnapshot(all).catch(function () {});
                return;
              }
              var tp = (json.pagination && json.pagination.totalPages) || 1;
              all = all.concat(json.data);
              if (page >= tp) {
                setCatalogSnapshot(all).catch(function () {});
                return;
              }
              page += 1;
              setTimeout(nextPage, 0);
            })
            .catch(function () {
              if (all.length) setCatalogSnapshot(all).catch(function () {});
            });
        }
        nextPage();
      });
    });
  }

  global.UrbanVibeProductCache = {
    fetchProducts: fetchProducts,
    schedulePrefetch: schedulePrefetch,
    getCatalogSnapshot: getCatalogSnapshot,
    startBackgroundCatalogSync: startBackgroundCatalogSync,
    DAY_MS: DAY_MS
  };
})(window);
