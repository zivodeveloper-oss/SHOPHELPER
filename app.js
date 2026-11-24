
    (function () {
      const STORAGE_KEY = "zivo_shophelper_cloud_v1";
      const TERMS_KEY = "zivo_shophelper_terms_accepted_v6";

      const LOGO_CANDIDATES = [
        "favicon.png",
        "./favicon.png",
        "/favicon.png",
        "https://raw.githubusercontent.com/zivodeveloper-oss/SHOPHELPER/main/favicon.png"
      ];

      function initLogoFallback() {
        const imgs = Array.from(document.querySelectorAll(".zivo-logo-img"));
        const favLink = document.getElementById("faviconLink");
        const shortcutLink = document.getElementById("shortcutIconLink");

        function tryCandidate(img, idx) {
          if (idx >= LOGO_CANDIDATES.length) {
            img.style.display = "none";
            return;
          }
          const candidate = LOGO_CANDIDATES[idx];
          img.onerror = () => tryCandidate(img, idx + 1);
          img.src = candidate;
          if (idx === 0 && favLink && shortcutLink) {
            favLink.href = candidate;
            shortcutLink.href = candidate;
          }
        }

        imgs.forEach((img) => tryCandidate(img, 0));
      }

      initLogoFallback();

      const VIEW_TITLES = {
        home: "Main Dashboard",
        catalog: "Product Catalog",
        inventory: "Stock Inventory",
        services: "Services Manager",
        billing: "Bill Creator",
        returns: "Customer Returns",
        ai: "AI Business Assistant",
        customers: "Credit Manager",
        history: "Sales History",
        suppliers: "Suppliers & Orders",
        studio: "Status Creator",
        settings: "Business Setup",
        quicksettings: "Quick Settings",
        labels: "Price Tags & Offers",
        firebase: "Firebase Cloud Sync"
      };

      function detectDefaultUiMode() {
        const ua = navigator.userAgent || "";
        return /android/i.test(ua) ? "android" : "windows";
      }

      const defaultState = {
        account: null,
        sessionUnlocked: false,
        shop: {
          city: "Patna, Bihar",
          upiId: "",
          gstin: "",
          theme: "dark",
          uiMode: detectDefaultUiMode()
        },
        firebase: {
          projectId: "zivo-shophelper",
          docKey: "",
          lastSync: ""
        },
        inventory: [],
        services: [],
        returns: [],
        suppliers: [],
        customers: [],
        bills: [],
        cart: [],
        billSeq: 1
      };

      let state = loadState();
      let viewHistory = ["home"];
      let activeView = "home";
      let calcBuf = "";
      let pickedCost = 0;
      let cartUndoStack = [];

      function loadState() { return structuredClone(defaultState); }

      let saveQueue = Promise.resolve();
      function saveState() {
        if (!state.sessionUnlocked || !window.__zivoCloud?.saveShopData) return;
        const payload = {
          shop: state.shop, inventory: state.inventory, services: state.services,
          returns: state.returns, suppliers: state.suppliers, customers: state.customers,
          bills: state.bills, billSeq: state.billSeq
        };
        saveQueue = saveQueue.then(() => window.__zivoCloud.saveShopData(payload))
          .catch(err => { console.error(err); toast(err?.message || "Cloud save failed"); });
      }

      function formatINR(n) {
        return "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      function toast(text) {
        const el = document.getElementById("toastMsg");
        el.textContent = text;
        el.classList.add("show");
        clearTimeout(window.__zToast);
        window.__zToast = setTimeout(() => el.classList.remove("show"), 2500);
      }

      function esc(s) {
        return String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function hasAcceptedTerms() {
        try {
          return localStorage.getItem(TERMS_KEY) === "yes";
        } catch {
          return false;
        }
      }

      const tabSignupBtn = document.getElementById("tabSignupBtn");
      const tabLoginBtn = document.getElementById("tabLoginBtn");
      const signupFields = document.getElementById("signupFields");
      const loginFields = document.getElementById("loginFields");

      function showAuthTab(mode) {
        const isLogin = mode === "login";
        tabLoginBtn.classList.toggle("active", isLogin);
        tabSignupBtn.classList.toggle("active", !isLogin);
        loginFields.classList.toggle("hidden", !isLogin);
        signupFields.classList.toggle("hidden", isLogin);
      }

      function syncStage() {
        document.body.classList.remove("stage-terms", "stage-auth", "stage-app");
        if (!hasAcceptedTerms()) {
          document.body.classList.add("stage-terms");
        } else if (!state.account || !state.sessionUnlocked) {
          document.body.classList.add("stage-auth");
          if (state.account) {
            document.getElementById("loginEmail").value = state.account.email || "";
            showAuthTab("login");
          } else {
            showAuthTab("signup");
          }
        } else {
          document.body.classList.add("stage-app");
        }
      }

      function applyThemeAndPlatform() {
        const isLight = state.shop.theme === "light";
        const isAndroid = state.shop.uiMode === "android";

        document.body.classList.toggle("light-mode", isLight);
        document.body.classList.toggle("platform-android", isAndroid);
        document.body.classList.toggle("platform-windows", !isAndroid);

        document.getElementById("btnHeaderTheme").textContent = isLight ? "🌙 Dark" : "☀️ Light";
        document.getElementById("btnHeaderUiMode").textContent = isAndroid ? "🖥️ Windows UI" : "📱 Android UI";
      }

      // Stage 1: Terms Gate
      const chkAgreeTerms = document.getElementById("chkAgreeTerms");
      const chkAgreeAge18 = document.getElementById("chkAgreeAge18");
      const btnAcceptTerms = document.getElementById("btnAcceptTerms");

      function updateTermsButtonState() {
        btnAcceptTerms.disabled = !(chkAgreeTerms.checked && chkAgreeAge18.checked);
      }
      chkAgreeTerms.addEventListener("change", updateTermsButtonState);
      chkAgreeAge18.addEventListener("change", updateTermsButtonState);

      btnAcceptTerms.addEventListener("click", () => {
        if (!(chkAgreeTerms.checked && chkAgreeAge18.checked)) return;
        try {
          localStorage.setItem(TERMS_KEY, "yes");
        } catch {}
        syncStage();
        toast("Terms accepted — please sign in");
      });

      document.getElementById("btnBackToTerms").addEventListener("click", () => {
        try {
          localStorage.removeItem(TERMS_KEY);
        } catch {}
        chkAgreeTerms.checked = false;
        chkAgreeAge18.checked = false;
        updateTermsButtonState();
        syncStage();
      });

      // Stage 2: Login / Create Profile Gate
      tabSignupBtn.addEventListener("click", () => showAuthTab("signup"));
      tabLoginBtn.addEventListener("click", () => showAuthTab("login"));

      document.getElementById("btnCreateAccount").addEventListener("click", async () => {
        const userName = document.getElementById("regUserName").value.trim();
        const email = document.getElementById("regEmail").value.trim().toLowerCase();
        const shopName = document.getElementById("regShopName").value.trim();
        const age = Number(document.getElementById("regAge").value) || 0;
        const password = document.getElementById("regPin").value;
        if (!userName || !email || !shopName || !password) return toast("Complete all required fields");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Enter a valid email address");
        if (password.length < 8) return toast("Password must be at least 8 characters");
        if (age < 18) return toast("You must confirm that you are 18 or older");
        try {
          const result = await window.__zivoCloud.createShop({ userName, email, password, shopName, age });
          state.account = { userName, email, shopName, age, role: "owner" };
          state.shop = { ...defaultState.shop, name: shopName };
          state.shopId = result.shopId;
          state.sessionUnlocked = true;
          await loadCloudState();
          syncStage(); renderAll(); toast(`Welcome to ${shopName}!`);
        } catch (err) { toast(err?.message || "Account creation failed"); }
      });

      document.getElementById("btnLoginAccount").addEventListener("click", async () => {
        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const password = document.getElementById("loginPin").value;
        if (!email || !password) return toast("Enter your email and password");
        try {
          const result = await window.__zivoCloud.signIn(email, password);
          state.account = result.profile;
          state.shopId = result.shopId;
          state.sessionUnlocked = true;
          await loadCloudState();
          syncStage(); renderAll(); toast(`Welcome back, ${state.account.shopName}!`);
        } catch (err) { toast(err?.message || "Login failed"); }
      });

      async function loadCloudState() {
        const cloud = await window.__zivoCloud.loadShopData();
        if (cloud) {
          state.shop = { ...defaultState.shop, ...(cloud.shop || {}) };
          for (const key of ["inventory","services","returns","suppliers","customers","bills"])
            state[key] = Array.isArray(cloud[key]) ? cloud[key] : [];
          state.billSeq = Math.max(1, Number(cloud.billSeq) || 1);
        }
      }

      // Stage 3: Navigation
      function syncBottomNav() {
        document.querySelectorAll(".android-nav-btn").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-bnav") === activeView);
        });
      }

      function navigateTo(viewKey, record = true) {
        if (!VIEW_TITLES[viewKey]) viewKey = "home";
        if (record && activeView !== viewKey) {
          viewHistory.push(viewKey);
          if (viewHistory.length > 25) viewHistory.shift();
        }
        activeView = viewKey;
        document.querySelectorAll(".app-view").forEach((v) => v.classList.add("hidden"));
        document.getElementById("view-" + viewKey)?.classList.remove("hidden");
        document.getElementById("headerContextLabel").textContent = VIEW_TITLES[viewKey];
        syncBottomNav();
        renderAll();
      }

      document.querySelectorAll(".module-tile").forEach((tile) => {
        tile.addEventListener("click", () => {
          const v = tile.getAttribute("data-view");
          const m = tile.getAttribute("data-modal");
          if (v) navigateTo(v);
          else if (m) openModal(m);
        });
      });

      document.querySelectorAll(".android-nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          navigateTo(btn.getAttribute("data-bnav") || "home");
        });
      });

      document.getElementById("headerBrandHome").addEventListener("click", () => navigateTo("home"));
      document.getElementById("headerDashPill").addEventListener("click", () => navigateTo("home"));
      document.getElementById("btnHeaderHome").addEventListener("click", () => navigateTo("home"));
      document.getElementById("btnHeaderRefresh").addEventListener("click", () => {
        renderAll();
        toast("Dashboard refreshed");
      });
      document.getElementById("btnHeaderBack").addEventListener("click", () => {
        if (viewHistory.length > 1) {
          viewHistory.pop();
          navigateTo(viewHistory[viewHistory.length - 1], false);
        } else {
          navigateTo("home", false);
        }
      });

      const floatingFab = document.getElementById("btnFloatingBill");
      const floatingActions = document.getElementById("floatingActions");

      function closeQuickActions() {
        floatingActions.classList.remove("open");
        floatingFab.setAttribute("aria-expanded", "false");
      }
      floatingFab.addEventListener("click", () => {
        const willOpen = !floatingActions.classList.contains("open");
        floatingActions.classList.toggle("open", willOpen);
        floatingFab.setAttribute("aria-expanded", String(willOpen));
      });
      floatingActions.querySelectorAll("[data-quick-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.getAttribute("data-quick-action");
          closeQuickActions();
          if (action === "eod") openModal("eodModal");
          else if (action === "calculator") openModal("calcModal");
          else {
            navigateTo(action);
            if (action === "billing") {
              const itemInput = document.getElementById("billItemName");
              if (itemInput) setTimeout(() => itemInput.focus(), 80);
            }
            if (action === "inventory") {
              const productInput = document.getElementById("invName");
              if (productInput) setTimeout(() => productInput.focus(), 80);
            }
          }
        });
      });
      document.addEventListener("click", (event) => {
        if (!floatingFab.contains(event.target) && !floatingActions.contains(event.target)) closeQuickActions();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeQuickActions();
        if (event.altKey || event.ctrlKey || event.metaKey) {
          const key = event.key.toLowerCase();
          if (key === "b") {
            event.preventDefault();
            closeQuickActions();
            navigateTo("billing");
            setTimeout(() => document.getElementById("billItemName")?.focus(), 80);
          } else if (key === "k") {
            event.preventDefault();
            closeQuickActions();
            navigateTo("home");
            document.getElementById("moduleSearchInput")?.focus();
          } else if (key === "i") {
            event.preventDefault();
            closeQuickActions();
            navigateTo("inventory");
          }
        }
      });

      function toggleUiMode() {
        state.shop.uiMode = state.shop.uiMode === "android" ? "windows" : "android";
        saveState();
        applyThemeAndPlatform();
        renderHome();
        toast(state.shop.uiMode === "android" ? "Switched to Android UI" : "Switched to Windows UI");
      }

      document.getElementById("btnHeaderUiMode").addEventListener("click", toggleUiMode);
      document.getElementById("btnToggleUiModePref").addEventListener("click", toggleUiMode);

      document.getElementById("btnHeaderTheme").addEventListener("click", () => {
        state.shop.theme = state.shop.theme === "light" ? "dark" : "light";
        saveState();
        applyThemeAndPlatform();
      });

      document.getElementById("btnBannerRestock").addEventListener("click", () => navigateTo("inventory"));
      document.getElementById("btnGoInvFromCatalog").addEventListener("click", () => navigateTo("inventory"));

      document.getElementById("btnOpenAboutDev").addEventListener("click", () => openModal("aboutDevModal"));
      document.getElementById("btnLogout").addEventListener("click", () => {
        state.sessionUnlocked = false;
        saveState();
        syncStage();
        toast("Logged out");
      });

      function openModal(id) {
        document.getElementById(id)?.classList.add("open");
        if (id === "eodModal") renderEodModal();
      }

      document.querySelectorAll(".close-modal-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.getElementById(btn.getAttribute("data-modal"))?.classList.remove("open");
        });
      });

      document.querySelectorAll(".modal-overlay").forEach((overlay) => {
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) overlay.classList.remove("open");
        });
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          document.querySelectorAll(".modal-overlay.open").forEach((m) => m.classList.remove("open"));
          document.querySelectorAll(".dropdown-list").forEach((d) => d.classList.add("hidden"));
        }
      });

      document.addEventListener("click", (e) => {
        if (!e.target.closest(".field") && !e.target.closest(".toolbar-strip")) {
          document.querySelectorAll(".dropdown-list").forEach((d) => d.classList.add("hidden"));
        }
      });

      // Module & Record Search
      const moduleSearchInput = document.getElementById("moduleSearchInput");
      const moduleSearchDropdown = document.getElementById("moduleSearchDropdown");
      const btnClearSearch = document.getElementById("btnClearSearch");

      function runGlobalSearch() {
        const q = moduleSearchInput.value.trim().toLowerCase();
        if (!q) {
          moduleSearchDropdown.classList.add("hidden");
          return;
        }
        const results = [];

        Object.entries(VIEW_TITLES).forEach(([k, label]) => {
          if (label.toLowerCase().includes(q) || k.toLowerCase().includes(q)) {
            results.push({ label: `Module: ${label}`, badge: "Open", go: () => navigateTo(k) });
          }
        });

        state.inventory.forEach((item) => {
          if (item.name.toLowerCase().includes(q) || (item.sku || "").toLowerCase().includes(q)) {
            results.push({
              label: `Item: ${item.name} (Stock: ${item.stock})`,
              badge: formatINR(item.price),
              go: () => {
                addCartLine({ name: item.name, qty: 1, price: item.price, costPrice: item.costPrice || 0, gst: item.gst || 0 });
                navigateTo("billing");
                toast(`Added ${item.name} to bill`);
              }
            });
          }
        });

        state.services.forEach((srv) => {
          if (srv.name.toLowerCase().includes(q)) {
            results.push({
              label: `Service: ${srv.name}`,
              badge: formatINR(srv.fee),
              go: () => {
                addCartLine({ name: srv.name, qty: 1, price: srv.fee, costPrice: 0, gst: srv.gst || 0 });
                navigateTo("billing");
              }
            });
          }
        });

        state.customers.forEach((c) => {
          if (c.name.toLowerCase().includes(q) || (c.phone || "").includes(q)) {
            results.push({
              label: `Customer: ${c.name}`,
              badge: `Due ${formatINR(c.balance)}`,
              go: () => navigateTo("customers")
            });
          }
        });

        state.bills.forEach((b) => {
          const itemMatch = Array.isArray(b.items) && b.items.some((it) => (it.name || "").toLowerCase().includes(q));
          if (
            (b.billNo || "").toLowerCase().includes(q) ||
            (b.customerName || "").toLowerCase().includes(q) ||
            (b.mode || "").toLowerCase().includes(q) ||
            itemMatch
          ) {
            results.push({
              label: `Bill ${b.billNo} • ${b.customerName} (${b.mode})`,
              badge: formatINR(b.grandTotal),
              go: () => {
                state.cart = structuredClone(b.items || []);
                document.getElementById("billCustName").value = b.customerName || "";
                document.getElementById("billPayMode").value = b.mode || "Cash";
                document.getElementById("billDiscount").value = b.discount || 0;
                navigateTo("billing");
              }
            });
          }
        });

        if (!results.length) {
          moduleSearchDropdown.innerHTML = `<div class="dropdown-item"><span>No module, item, customer, or bill matches "${esc(q)}"</span></div>`;
        } else {
          moduleSearchDropdown.innerHTML = results
            .slice(0, 10)
            .map((r) => `<div class="dropdown-item"><span>${esc(r.label)}</span><strong>${esc(r.badge)}</strong></div>`)
            .join("");
          moduleSearchDropdown.querySelectorAll(".dropdown-item").forEach((row, idx) => {
            row.addEventListener("click", () => {
              results[idx].go();
              moduleSearchDropdown.classList.add("hidden");
            });
          });
        }
        moduleSearchDropdown.classList.remove("hidden");
      }

      moduleSearchInput.addEventListener("input", runGlobalSearch);
      moduleSearchInput.addEventListener("focus", () => {
        if (moduleSearchInput.value.trim()) runGlobalSearch();
      });
      btnClearSearch.addEventListener("click", () => {
        moduleSearchInput.value = "";
        moduleSearchDropdown.classList.add("hidden");
      });

      function getTodayDateStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }

      function renderHome() {
        const shopName = state.account?.shopName || "Zivo Retail Store";
        document.getElementById("welcomeShopHeading").textContent = `Welcome Back, ${shopName} 👋`;

        const today = getTodayDateStr();
        const todayBills = state.bills.filter((b) => (b.date || "").slice(0, 10) === today);

        let salesSum = 0;
        let profitSum = 0;
        let cashSum = 0;
        let upiSum = 0;
        let udhaarBillSum = 0;

        todayBills.forEach((b) => {
          const amt = Number(b.grandTotal) || 0;
          salesSum += amt;
          profitSum += Number(b.profit) || 0;
          if (b.mode === "Cash") cashSum += amt;
          else if (b.mode === "UPI") upiSum += amt;
          else if (b.mode === "Udhaar") udhaarBillSum += amt;
        });

        const totalUdhaar = state.customers.reduce((s, c) => s + (Number(c.balance) || 0), 0);
        const lowItems = state.inventory.filter((i) => Number(i.stock) <= Number(i.lowThreshold ?? 5));
        const uiName = state.shop.uiMode === "android" ? "Android UI" : "Windows UI";

        document.getElementById("welcomeBreakdown").textContent =
          `Cash: ${formatINR(cashSum)} • UPI: ${formatINR(upiSum)} • Today Udhaar: ${formatINR(udhaarBillSum)} • Low Stock: ${lowItems.length} • ${uiName}`;
        document.getElementById("dashTodaySales").textContent = formatINR(salesSum);
        document.getElementById("dashTodayProfit").textContent = formatINR(profitSum);

        document.getElementById("subInvCount").textContent = `${state.inventory.length} items`;
        document.getElementById("subKhataCount").textContent = `${formatINR(totalUdhaar)} udhaar`;
        document.getElementById("subSrvCount").textContent = `${state.services.length} services`;
        document.getElementById("subRetCount").textContent = `${state.returns.length} returns`;
        document.getElementById("subBillsCount").textContent = `${state.bills.length} bills`;
        document.getElementById("subSupCount").textContent = `${state.suppliers.length} orders`;

        const banner = document.getElementById("lowStockBanner");
        if (lowItems.length > 0) {
          banner.classList.remove("hidden");
          document.getElementById("lowStockBannerText").textContent =
            `Low stock alert on ${lowItems.length} item(s): ${lowItems.map((i) => `${i.name} (${i.stock})`).join(", ")}`;
        } else {
          banner.classList.add("hidden");
        }

        document.getElementById("cloudStatusBadge").textContent = state.firebase.docKey
          ? `● Cloud: ${state.firebase.docKey}`
          : "● Active Users: 1 Online";
      }

      document.getElementById("catalogFilterInput").addEventListener("input", renderCatalog);

      function renderCatalog() {
        const q = (document.getElementById("catalogFilterInput").value || "").trim().toLowerCase();
        const combined = [
          ...state.inventory.map((i) => ({
            kind: "inv",
            id: i.id,
            name: i.name,
            meta: i.sku ? `Product • SKU: ${i.sku}` : "Product",
            price: i.price,
            costPrice: i.costPrice || 0,
            stockText: `${i.stock} in stock`,
            gst: i.gst || 0
          })),
          ...state.services.map((s) => ({
            kind: "srv",
            id: s.id,
            name: s.name,
            meta: "Shop Service",
            price: s.fee,
            costPrice: 0,
            stockText: "Service Fee",
            gst: s.gst || 0
          }))
        ].filter((row) => !q || row.name.toLowerCase().includes(q) || row.meta.toLowerCase().includes(q));

        const tbody = document.getElementById("catalogTableBody");
        if (!combined.length) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No items in catalog yet. Add products in Stock Inventory or services in Services Manager.</td></tr>`;
          return;
        }
        tbody.innerHTML = combined
          .map(
            (r, idx) => `
            <tr>
              <td><strong>${esc(r.name)}</strong></td>
              <td>${esc(r.meta)}</td>
              <td>${formatINR(r.price)}</td>
              <td>${esc(r.stockText)}</td>
              <td>${r.gst}%</td>
              <td><button class="btn btn-teal btn-xs cat-bill-btn" data-idx="${idx}" type="button">+ Add to Bill</button></td>
            </tr>`
          )
          .join("");

        tbody.querySelectorAll(".cat-bill-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const item = combined[Number(btn.getAttribute("data-idx"))];
            if (!item) return;
            addCartLine({ name: item.name, qty: 1, price: item.price, costPrice: item.costPrice, gst: item.gst });
            navigateTo("billing");
            toast(`Added ${item.name} to bill`);
          });
        });
      }

      document.getElementById("invFilterSelect").addEventListener("change", renderInventory);

      function resetInvForm() {
        document.getElementById("invEditId").value = "";
        document.getElementById("invFormTitle").textContent = "Add / Edit Product";
        ["invName", "invSku", "invCost", "invPrice", "invStock"].forEach((id) => (document.getElementById(id).value = ""));
        document.getElementById("invLow").value = "5";
        document.getElementById("invGst").value = "0";
        document.getElementById("btnCancelInvEdit").classList.add("hidden");
      }

      document.getElementById("btnCancelInvEdit").addEventListener("click", resetInvForm);

      document.getElementById("btnSaveInv").addEventListener("click", () => {
        const editId = document.getElementById("invEditId").value;
        const name = document.getElementById("invName").value.trim();
        const sku = document.getElementById("invSku").value.trim();
        const costPrice = Math.max(0, Number(document.getElementById("invCost").value) || 0);
        const price = Math.max(0, Number(document.getElementById("invPrice").value) || 0);
        const stock = Math.max(0, Number(document.getElementById("invStock").value) || 0);
        const lowThreshold = Math.max(0, Number(document.getElementById("invLow").value) || 0);
        const gst = Number(document.getElementById("invGst").value) || 0;

        if (!name) {
          toast("Enter product name");
          return;
        }
        if (editId) {
          const item = state.inventory.find((x) => x.id === editId);
          if (item) Object.assign(item, { name, sku, costPrice, price, stock, lowThreshold, gst });
          toast("Product updated");
        } else {
          state.inventory.push({ id: "inv-" + Date.now(), name, sku, costPrice, price, stock, lowThreshold, gst });
          toast("Product added");
        }
        resetInvForm();
        saveState();
        renderAll();
      });

      function renderInventory() {
        document.getElementById("invCountBadge").textContent = `${state.inventory.length} Products`;
        const filterMode = document.getElementById("invFilterSelect").value;
        const list = state.inventory.filter((i) => {
          const isLow = Number(i.stock) <= Number(i.lowThreshold ?? 5);
          if (filterMode === "LOW") return isLow;
          if (filterMode === "OK") return !isLow;
          return true;
        });

        const tbody = document.getElementById("invTableBody");
        if (!list.length) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">No matching inventory items</td></tr>`;
          return;
        }
        tbody.innerHTML = list
          .map((i) => {
            const isLow = Number(i.stock) <= Number(i.lowThreshold ?? 5);
            return `
              <tr>
                <td><strong>${esc(i.name)}</strong></td>
                <td>${esc(i.sku || "-")}</td>
                <td>${formatINR(i.costPrice)}</td>
                <td>${formatINR(i.price)}</td>
                <td>${i.stock}</td>
                <td>${i.gst}%</td>
                <td style="font-weight:800;color:${isLow ? "#f59e0b" : "#22c55e"};">${isLow ? "Low Stock" : "In Stock"}</td>
                <td>
                  <div class="btn-row">
                    <button class="btn btn-teal btn-xs bill-inv" data-id="${i.id}" type="button">+ Bill</button>
                    <button class="btn btn-dark btn-xs edit-inv" data-id="${i.id}" type="button">Edit</button>
                    <button class="btn btn-red btn-xs del-inv" data-id="${i.id}" type="button">✕</button>
                  </div>
                </td>
              </tr>`;
          })
          .join("");
      }

      document.getElementById("invTableBody").addEventListener("click", (e) => {
        const bBtn = e.target.closest(".bill-inv");
        const eBtn = e.target.closest(".edit-inv");
        const dBtn = e.target.closest(".del-inv");
        if (bBtn) {
          const item = state.inventory.find((x) => x.id === bBtn.getAttribute("data-id"));
          if (!item) return;
          addCartLine({ name: item.name, qty: 1, price: item.price, costPrice: item.costPrice || 0, gst: item.gst || 0 });
          toast(`Added ${item.name} to bill`);
        } else if (eBtn) {
          const item = state.inventory.find((x) => x.id === eBtn.getAttribute("data-id"));
          if (!item) return;
          document.getElementById("invEditId").value = item.id;
          document.getElementById("invFormTitle").textContent = "Editing: " + item.name;
          document.getElementById("invName").value = item.name;
          document.getElementById("invSku").value = item.sku || "";
          document.getElementById("invCost").value = item.costPrice || 0;
          document.getElementById("invPrice").value = item.price;
          document.getElementById("invStock").value = item.stock;
          document.getElementById("invLow").value = item.lowThreshold ?? 5;
          document.getElementById("invGst").value = item.gst || 0;
          document.getElementById("btnCancelInvEdit").classList.remove("hidden");
        } else if (dBtn) {
          state.inventory = state.inventory.filter((x) => x.id !== dBtn.getAttribute("data-id"));
          saveState();
          renderAll();
        }
      });

      document.getElementById("btnAddService").addEventListener("click", () => {
        const name = document.getElementById("srvName").value.trim();
        const fee = Math.max(0, Number(document.getElementById("srvFee").value) || 0);
        const gst = Number(document.getElementById("srvGst").value) || 0;
        if (!name) {
          toast("Enter service name");
          return;
        }
        state.services.push({ id: "srv-" + Date.now(), name, fee, gst });
        document.getElementById("srvName").value = "";
        document.getElementById("srvFee").value = "";
        saveState();
        renderAll();
        toast("Service added");
      });

      function renderServices() {
        const tbody = document.getElementById("srvTableBody");
        if (!state.services.length) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No services added</td></tr>`;
          return;
        }
        tbody.innerHTML = state.services
          .map(
            (s) => `
            <tr>
              <td><strong>${esc(s.name)}</strong></td>
              <td>${formatINR(s.fee)}</td>
              <td>${s.gst}%</td>
              <td>
                <div class="btn-row">
                  <button class="btn btn-teal btn-xs bill-srv" data-id="${s.id}" type="button">+ Bill</button>
                  <button class="btn btn-red btn-xs del-srv" data-id="${s.id}" type="button">✕</button>
                </div>
              </td>
            </tr>`
          )
          .join("");
      }

      document.getElementById("srvTableBody").addEventListener("click", (e) => {
        const bBtn = e.target.closest(".bill-srv");
        const dBtn = e.target.closest(".del-srv");
        if (bBtn) {
          const s = state.services.find((x) => x.id === bBtn.getAttribute("data-id"));
          if (!s) return;
          addCartLine({ name: s.name, qty: 1, price: s.fee, costPrice: 0, gst: s.gst });
          navigateTo("billing");
        } else if (dBtn) {
          state.services = state.services.filter((x) => x.id !== dBtn.getAttribute("data-id"));
          saveState();
          renderAll();
        }
      });

      function pushCartUndo() {
        cartUndoStack.push(structuredClone(state.cart));
        if (cartUndoStack.length > 20) cartUndoStack.shift();
      }

      document.getElementById("btnUndoCart").addEventListener("click", () => {
        if (!cartUndoStack.length) {
          toast("Nothing to undo");
          return;
        }
        state.cart = cartUndoStack.pop();
        saveState();
        renderBilling();
        toast("Undid last bill change");
      });

      function addCartLine(line) {
        pushCartUndo();
        const match = state.cart.find(
          (x) => x.name.toLowerCase() === line.name.toLowerCase() && Number(x.price) === Number(line.price)
        );
        if (match) {
          match.qty = Number(match.qty) + (Number(line.qty) || 1);
        } else {
          state.cart.push({
            name: line.name,
            qty: Number(line.qty) || 1,
            price: Number(line.price) || 0,
            costPrice: Number(line.costPrice) || 0,
            gst: Number(line.gst) || 0
          });
        }
        saveState();
        renderBilling();
      }

      const billItemName = document.getElementById("billItemName");
      const billItemDropdown = document.getElementById("billItemDropdown");

      billItemName.addEventListener("input", () => {
        pickedCost = 0;
        const q = billItemName.value.trim().toLowerCase();
        if (!q) {
          billItemDropdown.classList.add("hidden");
          return;
        }
        const hits = [
          ...state.inventory
            .filter((i) => i.name.toLowerCase().includes(q) || (i.sku || "").toLowerCase().includes(q))
            .map((i) => ({ name: i.name, price: i.price, costPrice: i.costPrice || 0, gst: i.gst || 0, tag: `Stock: ${i.stock}` })),
          ...state.services
            .filter((s) => s.name.toLowerCase().includes(q))
            .map((s) => ({ name: s.name, price: s.fee, costPrice: 0, gst: s.gst || 0, tag: "Service" }))
        ];
        if (!hits.length) {
          billItemDropdown.classList.add("hidden");
          return;
        }
        billItemDropdown.innerHTML = hits
          .map((h, idx) => `<div class="dropdown-item" data-idx="${idx}"><span>${esc(h.name)} (${esc(h.tag)})</span><strong>${formatINR(h.price)}</strong></div>`)
          .join("");
        billItemDropdown.querySelectorAll(".dropdown-item").forEach((row, idx) => {
          row.addEventListener("click", () => {
            billItemName.value = hits[idx].name;
            document.getElementById("billItemPrice").value = hits[idx].price;
            document.getElementById("billItemGst").value = hits[idx].gst;
            pickedCost = hits[idx].costPrice;
            billItemDropdown.classList.add("hidden");
          });
        });
        billItemDropdown.classList.remove("hidden");
      });

      function submitCartLine() {
        const name = billItemName.value.trim();
        const qty = Number(document.getElementById("billItemQty").value) || 0;
        const price = Math.max(0, Number(document.getElementById("billItemPrice").value) || 0);
        const gst = Number(document.getElementById("billItemGst").value) || 0;
        if (!name || qty <= 0) {
          toast("Enter item name and valid quantity");
          return;
        }
        const invHit = state.inventory.find((i) => i.name.toLowerCase() === name.toLowerCase());
        const costPrice = pickedCost || (invHit ? Number(invHit.costPrice) || 0 : 0);
        addCartLine({ name, qty, price, costPrice, gst });
        billItemName.value = "";
        document.getElementById("billItemQty").value = "1";
        document.getElementById("billItemPrice").value = "0";
        pickedCost = 0;
        billItemDropdown.classList.add("hidden");
        billItemName.focus();
      }

      document.getElementById("btnAddToCart").addEventListener("click", submitCartLine);
      ["billItemName", "billItemQty", "billItemPrice"].forEach((id) => {
        document.getElementById(id).addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submitCartLine();
          }
        });
      });

      const billCustName = document.getElementById("billCustName");
      const billCustDropdown = document.getElementById("billCustDropdown");
      billCustName.addEventListener("input", () => {
        renderBilling();
        const q = billCustName.value.trim().toLowerCase();
        if (!q) {
          billCustDropdown.classList.add("hidden");
          return;
        }
        const matches = state.customers.filter((c) => c.name.toLowerCase().includes(q));
        if (!matches.length) {
          billCustDropdown.classList.add("hidden");
          return;
        }
        billCustDropdown.innerHTML = matches
          .map((c, idx) => `<div class="dropdown-item" data-idx="${idx}"><span>${esc(c.name)}</span><strong>Due ${formatINR(c.balance)}</strong></div>`)
          .join("");
        billCustDropdown.querySelectorAll(".dropdown-item").forEach((row, idx) => {
          row.addEventListener("click", () => {
            billCustName.value = matches[idx].name;
            if (matches[idx].phone) document.getElementById("billCustPhone").value = matches[idx].phone;
            billCustDropdown.classList.add("hidden");
            renderBilling();
          });
        });
        billCustDropdown.classList.remove("hidden");
      });

      function calcTotals() {
        let sub = 0;
        let gst = 0;
        let cost = 0;
        state.cart.forEach((l) => {
          const base = l.qty * l.price;
          sub += base;
          gst += base * (l.gst / 100);
          cost += l.qty * (l.costPrice || 0);
        });
        const disc = Math.max(0, Number(document.getElementById("billDiscount").value) || 0);
        const total = Math.max(0, sub + gst - disc);
        const profit = Math.max(0, sub - disc - cost);
        return { sub, gst, disc, total, profit };
      }

      function renderBilling() {
        const tbody = document.getElementById("cartTableBody");
        if (!state.cart.length) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Bill is empty</td></tr>`;
        } else {
          tbody.innerHTML = state.cart
            .map((l, idx) => {
              const amt = l.qty * l.price * (1 + l.gst / 100);
              return `
                <tr>
                  <td><strong>${esc(l.name)}</strong></td>
                  <td>
                    <div class="qty-stepper">
                      <button class="btn btn-dark btn-xs q-dec" data-idx="${idx}" type="button">−</button>
                      <span>${l.qty}</span>
                      <button class="btn btn-dark btn-xs q-inc" data-idx="${idx}" type="button">+</button>
                    </div>
                  </td>
                  <td>${formatINR(l.price)}</td>
                  <td>${l.gst}%</td>
                  <td><strong>${formatINR(amt)}</strong></td>
                  <td><button class="btn btn-red btn-xs rem-cart" data-idx="${idx}" type="button">✕</button></td>
                </tr>`;
            })
            .join("");
        }

        const paper = document.getElementById("billPaperSize").value;
        const sheet = document.getElementById("printableReceiptArea");
        sheet.classList.remove("paper-thermal-80", "paper-thermal-58", "paper-a4");
        sheet.classList.add("paper-" + paper);

        const t = calcTotals();
        const shopName = state.account?.shopName || "Zivo Retail Store";
        const cust = document.getElementById("billCustName").value.trim() || "Walk-in Customer";
        const mode = document.getElementById("billPayMode").value;
        const cashRecv = Number(document.getElementById("billCashReceived")?.value) || 0;
        const noteText = document.getElementById("billNote")?.value.trim() || "";

        document.getElementById("rcptShopTitle").textContent = shopName;
        document.getElementById("rcptShopSub").textContent = `${state.shop.city}${state.shop.gstin ? " • GSTIN: " + state.shop.gstin : ""}`;
        document.getElementById("rcptNo").textContent = `Bill #INV-${String(state.billSeq).padStart(3, "0")}`;
        document.getElementById("rcptDate").textContent = new Date().toLocaleDateString("en-IN");
        document.getElementById("rcptCust").textContent = `Customer: ${cust}`;

        document.getElementById("rcptItemsBody").innerHTML = state.cart.length
          ? state.cart
              .map(
                (i) =>
                  `<tr><td style="padding:4px;">${esc(i.name)}</td><td style="padding:4px;">${i.qty}</td><td style="padding:4px;text-align:right;">${formatINR(
                    i.qty * i.price * (1 + i.gst / 100)
                  )}</td></tr>`
              )
              .join("")
          : `<tr><td colspan="3" style="text-align:center;color:#6b7280;padding:8px;">No items</td></tr>`;

        document.getElementById("rcptSub").textContent = formatINR(t.sub);
        document.getElementById("rcptGst").textContent = formatINR(t.gst);
        document.getElementById("rcptDisc").textContent = formatINR(t.disc);
        document.getElementById("rcptTotal").textContent = formatINR(t.total);
        document.getElementById("rcptMode").textContent = mode;

        const chgRow = document.getElementById("rcptChangeRow");
        if (mode === "Cash" && cashRecv > 0 && t.total > 0) {
          chgRow.classList.remove("hidden");
          document.getElementById("rcptChange").textContent = formatINR(Math.max(0, cashRecv - t.total));
        } else {
          chgRow.classList.add("hidden");
        }

        const noteEl = document.getElementById("rcptNoteLine");
        if (noteText) {
          noteEl.classList.remove("hidden");
          noteEl.textContent = `Note: ${noteText}`;
        } else {
          noteEl.classList.add("hidden");
        }

        document.getElementById("rcptFooterNote").textContent = state.shop.upiId
          ? `Pay via UPI: ${state.shop.upiId}`
          : "Thank you for visiting!";
      }

      document.getElementById("cartTableBody").addEventListener("click", (e) => {
        const inc = e.target.closest(".q-inc");
        const dec = e.target.closest(".q-dec");
        const rem = e.target.closest(".rem-cart");
        if (inc || dec || rem) pushCartUndo();
        if (inc) {
          state.cart[Number(inc.getAttribute("data-idx"))].qty += 1;
        } else if (dec) {
          const idx = Number(dec.getAttribute("data-idx"));
          if (state.cart[idx].qty > 1) state.cart[idx].qty -= 1;
          else state.cart.splice(idx, 1);
        } else if (rem) {
          state.cart.splice(Number(rem.getAttribute("data-idx")), 1);
        } else return;
        saveState();
        renderBilling();
      });

      ["billDiscount", "billPayMode", "billPaperSize", "billCashReceived", "billNote"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("input", renderBilling);
        el.addEventListener("change", renderBilling);
      });

      document.getElementById("btnClearCart").addEventListener("click", () => {
        if (!state.cart.length) return;
        pushCartUndo();
        state.cart = [];
        saveState();
        renderBilling();
        toast("Bill cleared (Undo available)");
      });

      document.getElementById("btnFinalizeBill").addEventListener("click", () => {
        if (!state.cart.length) {
          toast("Add items before saving bill");
          return;
        }
        const t = calcTotals();
        const customerName = document.getElementById("billCustName").value.trim() || "Walk-in Customer";
        const phone = document.getElementById("billCustPhone").value.trim();
        const mode = document.getElementById("billPayMode").value;
        const note = document.getElementById("billNote").value.trim();
        const billNo = `INV-${String(state.billSeq++).padStart(3, "0")}`;

        if (document.getElementById("chkDeductStock").checked) {
          state.cart.forEach((line) => {
            const inv = state.inventory.find((i) => i.name.toLowerCase() === line.name.toLowerCase());
            if (inv) inv.stock = Math.max(0, Number(inv.stock) - Number(line.qty));
          });
        }

        if (mode === "Udhaar") {
          const existing = state.customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase());
          if (existing) {
            existing.balance = (Number(existing.balance) || 0) + t.total;
            if (phone && !existing.phone) existing.phone = phone;
          } else {
            state.customers.push({ id: "cus-" + Date.now(), name: customerName, phone, balance: t.total });
          }
        }

        state.bills.push({
          id: "bill-" + Date.now(),
          billNo,
          date: new Date().toISOString(),
          customerName,
          phone,
          mode,
          note,
          items: structuredClone(state.cart),
          subtotal: t.sub,
          gstTotal: t.gst,
          discount: t.disc,
          grandTotal: t.total,
          profit: t.profit
        });

        state.cart = [];
        cartUndoStack = [];
        document.getElementById("billDiscount").value = "0";
        document.getElementById("billCashReceived").value = "";
        document.getElementById("billNote").value = "";
        saveState();
        renderAll();
        toast(`Bill ${billNo} saved (${formatINR(t.total)})`);
      });

      document.getElementById("btnPrintBill").addEventListener("click", () => window.print());

      function buildBillText() {
        const t = calcTotals();
        const shopName = state.account?.shopName || "Zivo Retail Store";
        const cust = document.getElementById("billCustName").value.trim() || "Customer";
        const lines = state.cart.map((i) => `• ${i.name} x${i.qty} = ${formatINR(i.qty * i.price * (1 + i.gst / 100))}`);
        const note = document.getElementById("billNote").value.trim();
        return (
          `*${shopName}*\nBill for ${cust}\n` +
          (lines.length ? lines.join("\n") + "\n" : "") +
          (t.disc > 0 ? `Discount: ${formatINR(t.disc)}\n` : "") +
          `*Total: ${formatINR(t.total)}* (${document.getElementById("billPayMode").value})` +
          (note ? `\nNote: ${note}` : "") +
          (state.shop.upiId ? `\nUPI: ${state.shop.upiId}` : "")
        );
      }

      document.getElementById("btnCopyBillText").addEventListener("click", () => {
        const text = buildBillText().replace(/\*/g, "");
        navigator.clipboard?.writeText(text).then(() => toast("Bill summary copied"));
      });

      document.getElementById("btnWhatsAppBill").addEventListener("click", () => {
        const text = buildBillText();
        const phone = document.getElementById("billCustPhone").value.replace(/\D/g, "");
        window.open(
          phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer"
        );
      });

      document.getElementById("btnRecordReturn").addEventListener("click", () => {
        const item = document.getElementById("retItem").value.trim();
        const qty = Math.max(1, Number(document.getElementById("retQty").value) || 1);
        const refund = Math.max(0, Number(document.getElementById("retRefund").value) || 0);
        const restocked = document.getElementById("chkRestockReturn").checked;
        if (!item) {
          toast("Enter returned item name");
          return;
        }
        if (restocked) {
          const inv = state.inventory.find((i) => i.name.toLowerCase() === item.toLowerCase());
          if (inv) inv.stock = Number(inv.stock) + qty;
        }
        state.returns.push({ id: "ret-" + Date.now(), date: new Date().toISOString(), item, qty, refund, restocked });
        document.getElementById("retItem").value = "";
        document.getElementById("retRefund").value = "";
        saveState();
        renderAll();
        toast("Return recorded");
      });

      function renderReturns() {
        const tbody = document.getElementById("retTableBody");
        tbody.innerHTML = state.returns.length
          ? state.returns
              .slice()
              .reverse()
              .map(
                (r, idx) =>
                  `<tr>
                    <td>${new Date(r.date).toLocaleDateString("en-IN")}</td>
                    <td><strong>${esc(r.item)}</strong></td>
                    <td>${r.qty}</td>
                    <td>${formatINR(r.refund)}</td>
                    <td><button class="btn btn-red btn-xs del-ret" data-idx="${state.returns.length - 1 - idx}" type="button">✕</button></td>
                  </tr>`
              )
              .join("")
          : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No returns recorded</td></tr>`;
      }

      document.getElementById("retTableBody").addEventListener("click", (e) => {
        const delBtn = e.target.closest(".del-ret");
        if (!delBtn) return;
        const idx = Number(delBtn.getAttribute("data-idx"));
        if (idx >= 0 && idx < state.returns.length) {
          state.returns.splice(idx, 1);
          saveState();
          renderAll();
          toast("Return entry removed");
        }
      });

      document.getElementById("btnAddKhata").addEventListener("click", () => {
        const name = document.getElementById("khataName").value.trim();
        const phone = document.getElementById("khataPhone").value.trim();
        const balance = Math.max(0, Number(document.getElementById("khataDue").value) || 0);
        if (!name) {
          toast("Enter customer name");
          return;
        }
        state.customers.push({ id: "cus-" + Date.now(), name, phone, balance });
        document.getElementById("khataName").value = "";
        document.getElementById("khataPhone").value = "";
        document.getElementById("khataDue").value = "0";
        saveState();
        renderAll();
        toast("Customer saved");
      });

      function renderCustomers() {
        const total = state.customers.reduce((s, c) => s + (Number(c.balance) || 0), 0);
        document.getElementById("khataTotalBadge").textContent = `Total Udhaar: ${formatINR(total)}`;
        const tbody = document.getElementById("khataTableBody");
        tbody.innerHTML = state.customers.length
          ? state.customers
              .map(
                (c) => `
                <tr>
                  <td><strong>${esc(c.name)}</strong></td>
                  <td>${esc(c.phone || "-")}</td>
                  <td style="color:#f59e0b;font-weight:800;">${formatINR(c.balance)}</td>
                  <td><input type="number" min="1" step="any" placeholder="₹ Amt" class="khata-amt-input" data-id="${c.id}" style="max-width:110px;padding:5px 8px;font-size:12px;" /></td>
                  <td>
                    <div class="btn-row">
                      <button class="btn btn-amber btn-xs add-khata" data-id="${c.id}" type="button">+ Due</button>
                      <button class="btn btn-green btn-xs settle-khata" data-id="${c.id}" type="button">Settle</button>
                      <button class="btn btn-teal btn-xs remind-khata" data-id="${c.id}" type="button">📲 Remind</button>
                      <button class="btn btn-red btn-xs del-khata" data-id="${c.id}" type="button">✕</button>
                    </div>
                  </td>
                </tr>`
              )
              .join("")
          : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No khata entries</td></tr>`;
      }

      document.getElementById("khataTableBody").addEventListener("click", (e) => {
        const addBtn = e.target.closest(".add-khata");
        const settleBtn = e.target.closest(".settle-khata");
        const remindBtn = e.target.closest(".remind-khata");
        const delBtn = e.target.closest(".del-khata");

        if (addBtn || settleBtn) {
          const id = (addBtn || settleBtn).getAttribute("data-id");
          const c = state.customers.find((x) => x.id === id);
          const inp = document.querySelector(`.khata-amt-input[data-id="${id}"]`);
          const amt = Number(inp?.value) || 0;
          if (!c || amt <= 0) {
            toast("Enter a valid amount first");
            return;
          }
          if (addBtn) c.balance = (Number(c.balance) || 0) + amt;
          else c.balance = Math.max(0, (Number(c.balance) || 0) - amt);
          saveState();
          renderAll();
          toast("Khata updated");
        } else if (remindBtn) {
          const c = state.customers.find((x) => x.id === remindBtn.getAttribute("data-id"));
          if (!c) return;
          const shopName = state.account?.shopName || "Zivo Retail Store";
          const msg = `Namaste ${c.name}, reminder from *${shopName}*: your pending balance is *${formatINR(c.balance)}*.`;
          const phone = (c.phone || "").replace(/\D/g, "");
          window.open(
            phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`,
            "_blank",
            "noopener,noreferrer"
          );
        } else if (delBtn) {
          state.customers = state.customers.filter((x) => x.id !== delBtn.getAttribute("data-id"));
          saveState();
          renderAll();
        }
      });

      document.getElementById("historyModeFilter").addEventListener("change", renderHistory);
      document.getElementById("historySearchInput").addEventListener("input", renderHistory);

      function renderHistory() {
        const mode = document.getElementById("historyModeFilter").value;
        const q = (document.getElementById("historySearchInput").value || "").trim().toLowerCase();
        const rows = state.bills.filter((b) => {
          const modeOk = mode === "ALL" || b.mode === mode;
          const qOk =
            !q ||
            (b.billNo || "").toLowerCase().includes(q) ||
            (b.customerName || "").toLowerCase().includes(q);
          return modeOk && qOk;
        });
        const tbody = document.getElementById("historyTableBody");
        tbody.innerHTML = rows.length
          ? rows
              .slice()
              .reverse()
              .map(
                (b) => `
                <tr>
                  <td><strong>${esc(b.billNo)}</strong></td>
                  <td>${new Date(b.date).toLocaleString("en-IN")}</td>
                  <td>${esc(b.customerName)}</td>
                  <td>${esc(b.mode)}</td>
                  <td>${formatINR(b.grandTotal)}</td>
                  <td style="color:var(--cyan-val);">${formatINR(b.profit || 0)}</td>
                  <td>
                    <div class="btn-row">
                      <button class="btn btn-dark btn-xs open-bill" data-id="${b.id}" type="button">View</button>
                      <button class="btn btn-red btn-xs del-bill" data-id="${b.id}" type="button">✕</button>
                    </div>
                  </td>
                </tr>`
              )
              .join("")
          : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No matching invoices</td></tr>`;
      }

      document.getElementById("historyTableBody").addEventListener("click", (e) => {
        const openBtn = e.target.closest(".open-bill");
        const delBtn = e.target.closest(".del-bill");
        if (openBtn) {
          const b = state.bills.find((x) => x.id === openBtn.getAttribute("data-id"));
          if (!b) return;
          state.cart = structuredClone(b.items || []);
          document.getElementById("billCustName").value = b.customerName || "";
          document.getElementById("billCustPhone").value = b.phone || "";
          document.getElementById("billPayMode").value = b.mode || "Cash";
          document.getElementById("billDiscount").value = b.discount || 0;
          document.getElementById("billNote").value = b.note || "";
          navigateTo("billing");
          toast(`Loaded ${b.billNo}`);
        } else if (delBtn) {
          const id = delBtn.getAttribute("data-id");
          const b = state.bills.find((x) => x.id === id);
          if (b && Array.isArray(b.items)) {
            b.items.forEach((line) => {
              const inv = state.inventory.find((i) => i.name.toLowerCase() === line.name.toLowerCase());
              if (inv) inv.stock = Number(inv.stock) + Number(line.qty);
            });
          }
          state.bills = state.bills.filter((x) => x.id !== id);
          saveState();
          renderAll();
          toast("Bill deleted & stock restored");
        }
      });

      document.getElementById("btnExportCsv").addEventListener("click", () => {
        const rows = [["Invoice", "Date", "Customer", "Mode", "Total", "Profit"].join(",")].concat(
          state.bills.map((b) => [b.billNo, b.date, `"${String(b.customerName || "").replace(/"/g, '""')}"`, b.mode, b.grandTotal, b.profit || 0].join(","))
        );
        const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "zivo-sales.csv";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      document.getElementById("btnAddSupplier").addEventListener("click", () => {
        const supplier = document.getElementById("supName").value.trim();
        const items = document.getElementById("supItems").value.trim();
        const total = Math.max(0, Number(document.getElementById("supCost").value) || 0);
        if (!supplier || !items) {
          toast("Enter supplier name and items");
          return;
        }
        state.suppliers.push({ id: "sup-" + Date.now(), date: new Date().toISOString(), supplier, items, total, status: "Ordered" });
        ["supName", "supItems", "supCost"].forEach((id) => (document.getElementById(id).value = ""));
        saveState();
        renderAll();
        toast("Order recorded");
      });

      function renderSuppliers() {
        const tbody = document.getElementById("supTableBody");
        tbody.innerHTML = state.suppliers.length
          ? state.suppliers
              .slice()
              .reverse()
              .map(
                (s) => `
                <tr>
                  <td>${new Date(s.date).toLocaleDateString("en-IN")}</td>
                  <td>${esc(s.supplier)}</td>
                  <td>${esc(s.items)}</td>
                  <td>${formatINR(s.total)}</td>
                  <td>${esc(s.status)}</td>
                  <td>
                    <div class="btn-row">
                      ${s.status !== "Received" ? `<button class="btn btn-green btn-xs recv-sup" data-id="${s.id}" type="button">Received</button>` : ""}
                      <button class="btn btn-red btn-xs del-sup" data-id="${s.id}" type="button">✕</button>
                    </div>
                  </td>
                </tr>`
              )
              .join("")
          : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No supplier orders</td></tr>`;
      }

      document.getElementById("supTableBody").addEventListener("click", (e) => {
        const rBtn = e.target.closest(".recv-sup");
        const dBtn = e.target.closest(".del-sup");
        if (rBtn) {
          const o = state.suppliers.find((x) => x.id === rBtn.getAttribute("data-id"));
          if (o) o.status = "Received";
          saveState();
          renderSuppliers();
          toast("Order marked received");
        } else if (dBtn) {
          state.suppliers = state.suppliers.filter((x) => x.id !== dBtn.getAttribute("data-id"));
          saveState();
          renderAll();
        }
      });

      ["promoHeading", "promoSub"].forEach((id) => {
        document.getElementById(id).addEventListener("input", () => {
          document.getElementById("promoPreviewTitle").textContent = document.getElementById("promoHeading").value;
          document.getElementById("promoPreviewBody").textContent = document.getElementById("promoSub").value;
        });
      });

      function getStatusMessage() {
        const shop = state.account?.shopName || "Zivo Retail Store";
        return `*${shop}*\n${document.getElementById("promoHeading").value}\n${document.getElementById("promoSub").value}`;
      }

      document.getElementById("btnCopyStatus").addEventListener("click", () => {
        const text = `${document.getElementById("promoHeading").value}\n${document.getElementById("promoSub").value}`;
        navigator.clipboard?.writeText(text).then(() => toast("Status text copied"));
      });

      document.getElementById("btnShareStatusWa").addEventListener("click", () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(getStatusMessage())}`, "_blank", "noopener,noreferrer");
      });

      ["tagProductName", "tagProductPrice", "tagOfferBadge"].forEach((id) => {
        document.getElementById(id).addEventListener("input", () => {
          document.getElementById("tagOutName").textContent = document.getElementById("tagProductName").value || "Product";
          document.getElementById("tagOutPrice").textContent = formatINR(document.getElementById("tagProductPrice").value);
          document.getElementById("tagOutOffer").textContent = document.getElementById("tagOfferBadge").value || "";
        });
      });

      function askAi(q) {
        const feed = document.getElementById("aiFeed");
        const u = document.createElement("div");
        u.style.cssText = "align-self:flex-end;background:rgba(13,148,136,0.25);padding:8px 12px;border-radius:10px;font-size:12.5px;";
        u.textContent = q;
        feed.appendChild(u);

        const low = q.toLowerCase();
        const totalUdhaar = state.customers.reduce((s, c) => s + (Number(c.balance) || 0), 0);
        let ans = `You have ${state.inventory.length} products, ${state.customers.length} khata accounts (total udhaar ${formatINR(totalUdhaar)}), and ${state.bills.length} saved bills.`;
        if (low.includes("sale") || low.includes("profit")) {
          ans = `Today's sales are ${document.getElementById("dashTodaySales").textContent} and profit is ${
            document.getElementById("dashTodayProfit").textContent
          }.`;
        } else if (low.includes("stock")) {
          const lowItems = state.inventory.filter((i) => Number(i.stock) <= Number(i.lowThreshold ?? 5));
          ans = lowItems.length
            ? `Low stock items: ${lowItems.map((i) => `${i.name} (${i.stock})`).join(", ")}.`
            : "All items are above their low-stock alert level.";
        } else if (low.includes("udhaar") || low.includes("credit")) {
          const due = state.customers.filter((c) => Number(c.balance) > 0);
          ans = due.length
            ? `Pending udhaar: ${due.map((c) => `${c.name} (${formatINR(c.balance)})`).join(", ")}.`
            : "No pending udhaar right now.";
        }

        const b = document.createElement("div");
        b.style.cssText = "background:var(--bg-soft);border-left:3px solid var(--cyan-accent);padding:9px 12px;border-radius:10px;font-size:12.5px;";
        b.textContent = ans;
        feed.appendChild(b);
        feed.scrollTop = feed.scrollHeight;
      }

      document.getElementById("btnAskAi").addEventListener("click", () => {
        const inp = document.getElementById("aiPromptInput");
        if (!inp.value.trim()) return;
        askAi(inp.value.trim());
        inp.value = "";
      });
      document.getElementById("aiPromptInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("btnAskAi").click();
      });
      document.getElementById("btnClearAi").addEventListener("click", () => {
        document.getElementById("aiFeed").innerHTML = `<div style="background:var(--bg-soft);border-left:3px solid var(--cyan-accent);padding:10px 12px;border-radius:10px;font-size:12.5px;">Chat cleared. Ask about today's sales, profit, low stock, or pending udhaar.</div>`;
      });
      document.querySelectorAll(".ai-chip").forEach((c) => c.addEventListener("click", () => askAi(c.getAttribute("data-q"))));

      document.getElementById("btnSaveSetup").addEventListener("click", () => {
        if (!state.account) {
          state.account = {
            userName: document.getElementById("setUserName").value.trim() || "Shop Owner",
            email: document.getElementById("setEmail").value.trim() || "",
            shopName: document.getElementById("setShopName").value.trim() || "Zivo Retail Store",
            age: 18,
            pin: ""
          };
        } else {
          state.account.shopName = document.getElementById("setShopName").value.trim() || state.account.shopName;
          state.account.userName = document.getElementById("setUserName").value.trim() || state.account.userName;
          state.account.email = document.getElementById("setEmail").value.trim() || state.account.email;
        }
        state.shop.upiId = document.getElementById("setUpi").value.trim();
        state.shop.city = document.getElementById("setCity").value.trim();
        state.shop.gstin = document.getElementById("setGstin").value.trim();
        saveState();
        renderAll();
        toast("Business setup saved");
      });

      document.getElementById("btnDownloadBackup").addEventListener("click", () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `zivo-shop-backup-${getTodayDateStr()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      document.getElementById("importBackupFile").addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const p = JSON.parse(String(reader.result));
            if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error();
            const acc = p.account ? { ...p.account } : state.account;
            if (acc && "plan" in acc) delete acc.plan;
            state = {
              account: acc,
              sessionUnlocked: Boolean(acc),
              shop: { ...defaultState.shop, ...(p.shop || {}) },
              firebase: { ...defaultState.firebase, ...(p.firebase || {}), projectId: "zivo-shophelper" },
              inventory: Array.isArray(p.inventory) ? p.inventory : [],
              services: Array.isArray(p.services) ? p.services : [],
              returns: Array.isArray(p.returns) ? p.returns : [],
              suppliers: Array.isArray(p.suppliers) ? p.suppliers : [],
              customers: Array.isArray(p.customers) ? p.customers : [],
              bills: Array.isArray(p.bills) ? p.bills : [],
              cart: Array.isArray(p.cart) ? p.cart : [],
              billSeq: Math.max(1, Number(p.billSeq) || 1)
            };
            saveState();
            syncStage();
            renderAll();
            toast("Backup imported");
          } catch {
            toast("Invalid JSON backup");
          }
          e.target.value = "";
        };
        reader.readAsText(file);
      });

      document.getElementById("btnToggleThemePref").addEventListener("click", () => {
        state.shop.theme = state.shop.theme === "light" ? "dark" : "light";
        saveState();
        applyThemeAndPlatform();
      });

      document.getElementById("btnViewTermsAgain").addEventListener("click", () => {
        try {
          localStorage.removeItem(TERMS_KEY);
        } catch {}
        chkAgreeTerms.checked = false;
        chkAgreeAge18.checked = false;
        updateTermsButtonState();
        syncStage();
      });

      document.getElementById("btnResetDemoData").addEventListener("click", () => {
        const keepAcc = state.account;
        const keepFb = state.firebase;
        const keepShop = state.shop;
        const keepUnlocked = state.sessionUnlocked;
        state = structuredClone(defaultState);
        state.account = keepAcc;
        state.firebase = keepFb;
        state.shop = keepShop;
        state.sessionUnlocked = keepUnlocked;
        cartUndoStack = [];
        saveState();
        renderAll();
        toast("Shop records reset");
      });

      // Data is saved automatically to this authenticated shop's isolated cloud workspace.
      const pushButton = document.getElementById("btnPushFirebase");
      const pullButton = document.getElementById("btnPullFirebase");
      if (pushButton) pushButton.addEventListener("click", async () => { await saveQueue; toast("Cloud data is up to date"); });
      if (pullButton) pullButton.addEventListener("click", async () => { await loadCloudState(); renderAll(); toast("Cloud data refreshed"); });

      function renderFirebaseView() {
        document.getElementById("fbProjectId").value = state.firebase.projectId || "zivo-shophelper";
        document.getElementById("fbDocKey").value = state.firebase.docKey || "";
        document.getElementById("fbLastSyncText").textContent = state.firebase.lastSync
          ? `Last Cloud Sync: ${state.firebase.lastSync}`
          : "No cloud sync performed yet.";
      }

      document.querySelectorAll(".calc-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          const k = btn.getAttribute("data-k");
          const disp = document.getElementById("calcDisplay");
          if (k === "C") {
            calcBuf = "";
            disp.textContent = "0";
          } else if (k === "DEL") {
            calcBuf = calcBuf.slice(0, -1);
            disp.textContent = calcBuf || "0";
          } else if (k === "=") {
            try {
              const safe = calcBuf.replace(/[^0-9+\-*/.%]/g, "");
              calcBuf = String(Function(`"use strict"; return (${safe || 0})`)());
              disp.textContent = calcBuf;
            } catch {
              disp.textContent = "Error";
              calcBuf = "";
            }
          } else {
            calcBuf += k;
            disp.textContent = calcBuf;
          }
        });
      });

      function renderEodModal() {
        const today = getTodayDateStr();
        const todayBills = state.bills.filter((b) => (b.date || "").slice(0, 10) === today);
        let sales = 0;
        let profit = 0;
        const modes = { Cash: 0, UPI: 0, Udhaar: 0, Card: 0 };
        todayBills.forEach((b) => {
          const amt = Number(b.grandTotal) || 0;
          sales += amt;
          profit += Number(b.profit) || 0;
          if (modes[b.mode] !== undefined) modes[b.mode] += amt;
        });
        document.getElementById("eodSummaryContent").innerHTML = `
          <div><strong>Date:</strong> ${today}</div>
          <div><strong>Total Bills:</strong> ${todayBills.length}</div>
          <div><strong>Today's Total Sales:</strong> <span style="color:#22c55e;font-weight:800;">${formatINR(sales)}</span></div>
          <div><strong>Today's Total Profit:</strong> <span style="color:#06b6d4;font-weight:800;">${formatINR(profit)}</span></div>
          <hr style="border:none;border-top:1px solid var(--border-color);margin:6px 0;" />
          <div><strong>Cash:</strong> ${formatINR(modes.Cash)}</div>
          <div><strong>UPI:</strong> ${formatINR(modes.UPI)}</div>
          <div><strong>Udhaar:</strong> ${formatINR(modes.Udhaar)}</div>
          <div><strong>Card:</strong> ${formatINR(modes.Card)}</div>
        `;
      }

      function renderProfileFields() {
        const shopName = state.account?.shopName || "Zivo Retail Store";
        const modeLabel = state.shop.uiMode === "android" ? "Android UI" : "Windows UI";
        document.getElementById("setShopName").value = shopName;
        document.getElementById("setUserName").value = state.account?.userName || "";
        document.getElementById("setEmail").value = state.account?.email || "";
        document.getElementById("setUpi").value = state.shop.upiId || "";
        document.getElementById("setCity").value = state.shop.city || "";
        document.getElementById("setGstin").value = state.shop.gstin || "";
        document.getElementById("tagOutShop").textContent = shopName.toUpperCase();
        document.getElementById("prefAccountSummary").textContent = state.account
          ? `Profile: ${state.account.userName} (${state.account.email}) • Shop: ${state.account.shopName} • Age: ${state.account.age}+ • Mode: ${modeLabel} • 100% Free Utility`
          : `No shop profile created yet • Mode: ${modeLabel} • 100% Free Utility`;
      }

      function renderAll() {
        applyThemeAndPlatform();
        syncBottomNav();
        renderHome();
        renderCatalog();
        renderInventory();
        renderServices();
        renderBilling();
        renderReturns();
        renderCustomers();
        renderHistory();
        renderSuppliers();
        renderFirebaseView();
        renderProfileFields();
      }

      syncStage();
      renderAll();
      if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(console.warn);
    })();
  