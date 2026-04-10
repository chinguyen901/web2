/**
 * Cart source of truth: Neon via /api/cart. Mirrors server state into localStorage for badges + static UI.
 */
(function (global) {
  var AUTH_KEY = "uv_auth";
  var CART_KEY = "uv_cart_count";
  var CART_ITEMS_KEY = "uv_cart_items";
  var cartApiUnavailable = false;

  function getToken() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      var j = JSON.parse(raw);
      return j.token || null;
    } catch (_e) {
      return null;
    }
  }

  function normalizeItem(row) {
    var p = row.product;
    var pid = row.productId || (p && p.id);
    return {
      id: pid,
      name: (p && p.name) || "Item",
      price: Number((p && p.price) || 0),
      image: p && p.images && p.images[0] ? p.images[0] : "",
      meta: (p && p.category) || "",
      quantity: row.quantity
    };
  }

  function getLocalItems() {
    try {
      var raw = localStorage.getItem(CART_ITEMS_KEY) || "[]";
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function applyLocalItems(items) {
    var safeItems = Array.isArray(items) ? items : [];
    localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(safeItems));
    var count = safeItems.reduce(function (s, i) {
      return s + Number(i.quantity || 0);
    }, 0);
    localStorage.setItem(CART_KEY, String(count));
    global.dispatchEvent(new CustomEvent("uv-cart-updated"));
  }

  function applyLocalFromCart(cartRows) {
    var rows = cartRows || [];
    applyLocalItems(rows.map(normalizeItem));
  }

  function authHeaders() {
    var t = getToken();
    if (!t) return null;
    return { Authorization: "Bearer " + t };
  }

  function isMissingCartTableMessage(data) {
    var msg = data && data.message ? String(data.message) : "";
    return msg.indexOf("CartItem") >= 0 && msg.indexOf("does not exist") >= 0;
  }

  function isCachedPlanMessage(data) {
    var msg = data && data.message ? String(data.message) : "";
    return msg.indexOf("cached plan must not change result type") >= 0;
  }

  function markCartApiUnavailable(data) {
    if (isMissingCartTableMessage(data)) {
      cartApiUnavailable = true;
      // Avoid showing stale local cart when DB cart table is unavailable.
      applyLocalFromCart([]);
      return true;
    }
    return false;
  }

  function syncFromServer() {
    var h = authHeaders();
    if (!h) return Promise.resolve(null);
    if (cartApiUnavailable) return Promise.resolve(null);
    return fetch("/api/cart", { headers: h })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (_ref) {
        var res = _ref.res;
        var data = _ref.data;
        if (res.ok && data && data.success) {
          applyLocalFromCart(data.cart);
          return data.cart;
        }
        if (isCachedPlanMessage(data)) {
          throw new Error("Database plan cache refreshed. Please retry this action.");
        }
        if (markCartApiUnavailable(data)) return [];
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function add(productId, qty) {
    var h = authHeaders();
    if (!h) return Promise.reject(new Error("Can not add: please login."));
    if (cartApiUnavailable) {
      return Promise.reject(
        new Error("Cart DB is not ready on server. Run Prisma migrate deploy on Vercel.")
      );
    }
    var prev = getLocalItems();
    var next = prev.slice();
    var idx = -1;
    for (var i = 0; i < next.length; i++) {
      if (String(next[i].id) === String(productId)) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      next[idx] = Object.assign({}, next[idx], {
        quantity: Number(next[idx].quantity || 0) + Number(qty || 1)
      });
    } else {
      next.push({
        id: String(productId),
        name: "Updating...",
        price: 0,
        image: "",
        meta: "",
        quantity: Number(qty || 1)
      });
    }
    applyLocalItems(next);

    return fetch("/api/cart", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, h),
      body: JSON.stringify({ productId: String(productId), quantity: qty || 1 })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (_ref2) {
        var res = _ref2.res;
        var data = _ref2.data;
        if (!res.ok || !data.success) {
          if (isCachedPlanMessage(data)) {
            applyLocalItems(prev);
            throw new Error("Database just changed. Please click Add again.");
          }
          if (markCartApiUnavailable(data)) {
            applyLocalItems(prev);
            throw new Error("Cart DB is not ready on server. Run Prisma migrate deploy on Vercel.");
          }
          applyLocalItems(prev);
          throw new Error((data && data.message) || "Add to cart failed");
        }
        applyLocalFromCart(data.cart);
        return data.cart;
      });
  }

  function updateQty(productId, quantity) {
    var h = authHeaders();
    if (!h) return Promise.reject(new Error("Not logged in."));
    if (cartApiUnavailable) {
      return Promise.reject(
        new Error("Cart DB is not ready on server. Run Prisma migrate deploy on Vercel.")
      );
    }
    var prev = getLocalItems();
    var next = prev.slice();
    for (var i = 0; i < next.length; i++) {
      if (String(next[i].id) === String(productId)) {
        next[i] = Object.assign({}, next[i], { quantity: Number(quantity) });
        break;
      }
    }
    applyLocalItems(next);

    return fetch("/api/cart/item?productId=" + encodeURIComponent(productId), {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, h),
      body: JSON.stringify({ quantity: quantity })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (_ref3) {
        var res = _ref3.res;
        var data = _ref3.data;
        if (!res.ok || !data.success) {
          if (isCachedPlanMessage(data)) {
            applyLocalItems(prev);
            throw new Error("Database just changed. Please try update quantity again.");
          }
          if (markCartApiUnavailable(data)) {
            applyLocalItems(prev);
            throw new Error("Cart DB is not ready on server. Run Prisma migrate deploy on Vercel.");
          }
          applyLocalItems(prev);
          throw new Error((data && data.message) || "Update failed");
        }
        applyLocalFromCart(data.cart);
        return data.cart;
      });
  }

  function remove(productId) {
    var h = authHeaders();
    if (!h) return Promise.reject(new Error("Not logged in."));
    if (cartApiUnavailable) {
      applyLocalFromCart([]);
      return Promise.resolve([]);
    }
    var prev = getLocalItems();
    var next = prev.filter(function (it) {
      return String(it.id) !== String(productId);
    });
    applyLocalItems(next);

    return fetch("/api/cart/item?productId=" + encodeURIComponent(productId), {
      method: "DELETE",
      headers: h
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (_ref4) {
        var res = _ref4.res;
        var data = _ref4.data;
        if (!res.ok || !data.success) {
          if (isCachedPlanMessage(data)) {
            applyLocalItems(prev);
            throw new Error("Database just changed. Please try removing item again.");
          }
          if (markCartApiUnavailable(data)) {
            return [];
          }
          applyLocalItems(prev);
          throw new Error((data && data.message) || "Remove failed");
        }
        applyLocalFromCart(data.cart);
        return data.cart;
      });
  }

  function clearAll() {
    var h = authHeaders();
    if (!h) return Promise.resolve();
    if (cartApiUnavailable) {
      applyLocalFromCart([]);
      return Promise.resolve();
    }
    return fetch("/api/cart", { headers: h })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (_ref5) {
        var res = _ref5.res;
        var data = _ref5.data;
        if (!res.ok || !data.success) {
          applyLocalFromCart([]);
          return;
        }
        var rows = data.cart || [];
        if (!rows.length) {
          applyLocalFromCart([]);
          return;
        }
        var chain = Promise.resolve();
        rows.forEach(function (row) {
          var pid = row.productId || (row.product && row.product.id);
          if (!pid) return;
          chain = chain.then(function () {
            return fetch("/api/cart/item?productId=" + encodeURIComponent(pid), {
              method: "DELETE",
              headers: h
            }).then(function (r) {
              return r.json();
            });
          });
        });
        return chain.then(function () {
          return syncFromServer();
        });
      })
      .catch(function () {
        applyLocalFromCart([]);
      });
  }

  global.UrbanVibeCart = {
    getToken: getToken,
    syncFromServer: syncFromServer,
    add: add,
    updateQty: updateQty,
    remove: remove,
    clearAll: clearAll,
    applyLocalFromCart: applyLocalFromCart,
    normalizeItem: normalizeItem,
    CART_ITEMS_KEY: CART_ITEMS_KEY,
    CART_KEY: CART_KEY
  };
})(window);
