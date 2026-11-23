// =========================================================
// ZIVO SHOP HELPER - MAIN APPLICATION ENGINE (app.js)
// =========================================================

const firebaseConfig = {
    apiKey: "AIzaSyBC24g6jviipUviY9xSh_K0aXyJotHhiVw",
    authDomain: "zivo-shophelper.firebaseapp.com",
    projectId: "zivo-shophelper",
    storageBucket: "zivo-shophelper.firebasestorage.app",
    messagingSenderId: "247526924763",
    appId: "1:247526924763:web:78dd4a26ad01761a4bc7fe",
    measurementId: "G-H83N3MZ8F0"
};

let firestoreDb = null;
let firebaseAuth = null;
try {
    if (typeof firebase !== "undefined" && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase !== "undefined") {
        firestoreDb = firebase.firestore();
        firebaseAuth = firebase.auth();
    }
} catch (e) {
    console.warn("Firebase init notice:", e.message);
}

function getShopCloudDocId() {
    const raw = (activeAccount?.email || activeAccount?.username || "default_shop").toLowerCase();
    return raw.replace(/[^a-z0-9_-]/g, "_");
}

async function syncShopDataToCloud() {
    const btn = document.getElementById("btnCloudSync");
    if (!firestoreDb || !activeAccount) {
        alert("Sign in first to sync your shop data to Firebase Firestore.");
        return;
    }
    if (btn) { btn.disabled = true; btn.innerText = "Syncing..."; }
    try {
        await firestoreDb.collection("shops").doc(getShopCloudDocId()).set({
            account: activeAccount,
            isProUser,
            stockMaster,
            servicesMaster,
            salesHistory,
            creditMaster,
            expenseMaster,
            suppliersMaster,
            returnsMaster,
            staffMaster,
            heldBills,
            shopConfig,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        if (btn) btn.innerText = "Synced";
        setTimeout(() => { if (btn) { btn.disabled = false; btn.innerText = "Sync"; } }, 2000);
    } catch (err) {
        alert("Cloud sync note: " + err.message);
        if (btn) { btn.disabled = false; btn.innerText = "Sync"; }
    }
}

async function pullShopDataFromCloud() {
    if (!firestoreDb || !activeAccount) return;
    try {
        const doc = await firestoreDb.collection("shops").doc(getShopCloudDocId()).get();
        if (!doc.exists) return;
        const d = doc.data();
        if (d.stockMaster?.length && !stockMaster.length) { stockMaster = d.stockMaster; db.setItem("stock", stockMaster); }
        if (d.servicesMaster?.length && !servicesMaster.length) { servicesMaster = d.servicesMaster; db.setItem("services", servicesMaster); }
        if (d.salesHistory?.length && !salesHistory.length) { salesHistory = d.salesHistory; db.setItem("sales_history", salesHistory); }
        if (d.creditMaster?.length && !creditMaster.length) { creditMaster = d.creditMaster; db.setItem("credit", creditMaster); }
        if (d.expenseMaster?.length && !expenseMaster.length) { expenseMaster = d.expenseMaster; db.setItem("expenses", expenseMaster); }
        if (d.suppliersMaster?.length && !suppliersMaster.length) { suppliersMaster = d.suppliersMaster; db.setItem("suppliers", suppliersMaster); }
        if (typeof d.isProUser === "boolean") { isProUser = d.isProUser; db.setItem("is_pro", isProUser); updatePlanUI(); }
        updateDashStats();
    } catch (err) {
        console.warn("Cloud pull skipped:", err.message);
    }
}

const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिंदी (Hindi)" },
    { code: "bho", name: "भोजपुरी (Bhojpuri)" },
    { code: "mai", name: "मैथिली (Maithili)" },
    { code: "bn", name: "বাংলা (Bengali)" },
    { code: "te", name: "తెలుగు (Telugu)" },
    { code: "mr", name: "मराठी (Marathi)" },
    { code: "ta", name: "தமிழ் (Tamil)" },
    { code: "ur", name: "اردو (Urdu)" },
    { code: "gu", name: "ગુજરાતી (Gujarati)" },
    { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
    { code: "ml", name: "മലയാളം (Malayalam)" },
    { code: "or", name: "ଓଡ଼ିଆ (Odia)" },
    { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)" },
    { code: "as", name: "অসমীয়া (Assamese)" },
    { code: "sa", name: "संस्कृतम् (Sanskrit)" },
    { code: "ne", name: "नेपाली (Nepali)" },
    { code: "sd", name: "سنڌي (Sindhi)" },
    { code: "ks", name: "کٲشُر (Kashmiri)" },
    { code: "kok", name: "कोंकणी (Konkani)" },
    { code: "doi", name: "डोगरी (Dogri)" },
    { code: "mni", name: "ꯃꯩꯇꯩꯂꯣꯟ (Manipuri)" },
    { code: "sat", name: "ᱥᱟᱱᱛᱟᱲᱤ (Santali)" },
    { code: "si", name: "සිංහල (Sinhala)" },
    { code: "ar", name: "العربية (Arabic)" },
    { code: "fa", name: "فارسی (Persian)" },
    { code: "tr", name: "Türkçe (Turkish)" },
    { code: "es", name: "Español (Spanish)" },
    { code: "fr", name: "Français (French)" },
    { code: "de", name: "Deutsch (German)" },
    { code: "pt", name: "Português (Portuguese)" },
    { code: "ru", name: "Русский (Russian)" },
    { code: "it", name: "Italiano (Italian)" },
    { code: "nl", name: "Nederlands (Dutch)" },
    { code: "pl", name: "Polski (Polish)" },
    { code: "uk", name: "Українська (Ukrainian)" },
    { code: "id", name: "Bahasa Indonesia" },
    { code: "ms", name: "Bahasa Melayu (Malay)" },
    { code: "th", name: "ไทย (Thai)" },
    { code: "vi", name: "Tiếng Việt (Vietnamese)" },
    { code: "fil", name: "Filipino (Tagalog)" },
    { code: "ja", name: "日本語 (Japanese)" },
    { code: "ko", name: "한국어 (Korean)" },
    { code: "zh", name: "中文 (Chinese)" },
    { code: "sw", name: "Kiswahili (Swahili)" },
    { code: "ha", name: "Hausa" }
];

const UI_TRANSLATIONS = {
    en: {
        tab_dashboard: "Main Dashboard",
        lbl_today_sales: "TODAY'S SALES",
        lbl_today_profit: "NET PROFIT",
        sec_billing: "1. Daily Billing & Stock",
        sec_customers: "2. Customers, Credit & Growth",
        sec_ops: "3. Operations, Staff & Settings",
        mod_bill: "Bill Creator",
        mod_stock: "Stock Inventory",
        mod_history: "Sales History",
        mod_returns: "Returns",
        mod_services: "Services",
        mod_calc: "Calculator",
        mod_credit: "Udhaar Ledger",
        mod_catalog: "Catalog",
        mod_status: "Status Studio",
        mod_ai: "AI Assistant",
        mod_expenses: "Expenses",
        mod_suppliers: "Suppliers",
        mod_labels: "QR & Barcode",
        mod_staff: "Staff & Salary",
        mod_business: "Shop Profile",
        mod_setting: "Settings"
    },
    hi: {
        tab_dashboard: "मुख्य डैशबोर्ड",
        lbl_today_sales: "आज की बिक्री",
        lbl_today_profit: "शुद्ध लाभ",
        mod_bill: "बिल बनाएं",
        mod_stock: "स्टॉक इन्वेंटरी",
        mod_history: "बिक्री इतिहास",
        mod_credit: "उधार खाता",
        mod_expenses: "खर्च ट्रैकर",
        mod_setting: "सेटिंग्स"
    }
};

function populateLanguageSelector() {
    const sel = document.getElementById("cfgLang");
    if (!sel) return;
    sel.innerHTML = SUPPORTED_LANGUAGES.map(l => `<option value="${l.code}">${l.name}</option>`).join("");
    sel.value = shopConfig.lang || "en";
}

function changeLanguageSetting(langCode) {
    shopConfig.lang = langCode;
    db.setItem("config", shopConfig);
    applyLanguageTranslations(langCode);
}

function applyLanguageTranslations(langCode) {
    const dict = { ...UI_TRANSLATIONS.en, ...(UI_TRANSLATIONS[langCode] || {}) };
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.innerText = dict[key];
    });
    document.documentElement.dir = (langCode === "ur" || langCode === "ar" || langCode === "fa" || langCode === "sd") ? "rtl" : "ltr";
}

function esc(str) {
    return String(str ?? "")
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, """)
        .replace(/'/g, "'");
}

class StorageEngine {
    constructor() { this.prefix = "zivo_v2_"; }
    getItem(key, defaultVal) {
        try {
            const data = localStorage.getItem(this.prefix + key);
            if (data !== null) return JSON.parse(data);
        } catch (e) {}
        return defaultVal;
    }
    setItem(key, val) {
        try { localStorage.setItem(this.prefix + key, JSON.stringify(val)); } catch (e) {}
    }
    clearAll() {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(this.prefix)) localStorage.removeItem(k);
        });
    }
}

const db = new StorageEngine();
let activeAccount = db.getItem("account", null);
let isProUser = db.getItem("is_pro", false);
let stockMaster = db.getItem("stock", []);
let servicesMaster = db.getItem("services", []);
let salesHistory = db.getItem("sales_history", []);
let creditMaster = db.getItem("credit", []);
let expenseMaster = db.getItem("expenses", []);
let suppliersMaster = db.getItem("suppliers", []);
let returnsMaster = db.getItem("returns", []);
let staffMaster = db.getItem("staff", []);
let heldBills = db.getItem("held_bills", []);
let shopConfig = db.getItem("config", {
    footerMsg: "Thank you for shopping with us!",
    currency: "₹",
    upiId: "",
    lang: "en"
});

let currentManualBillItems = [];
let navigationHistory = ["dashboard"];
let html5QrScanner = null;
let continuousScanMode = true;
const FREE_STOCK_LIMIT = 25;

function curr() { return shopConfig.currency || "₹"; }

function updatePlanUI() {
    const pill = document.getElementById("planStatusPill");
    const upgradeBtn = document.getElementById("btnUpgradeHeader");
    if (isProUser) {
        if (pill) { pill.innerText = "ZIVO PRO"; pill.style.background = "#d97706"; }
        if (upgradeBtn) upgradeBtn.style.display = "none";
    } else {
        if (pill) { pill.innerText = "FREE PLAN"; pill.style.background = "rgba(0,0,0,0.3)"; }
        if (upgradeBtn) upgradeBtn.style.display = "inline-flex";
    }
}

function openUpgradeModal() { document.getElementById("modalUpgradePro").style.display = "flex"; }
function closeUpgradeModal() { document.getElementById("modalUpgradePro").style.display = "none"; }

function openProTab(tabId) {
    if (!isProUser) { openUpgradeModal(); return; }
    openTab(tabId);
}

function startRazorpayCheckout() {
    if (confirm("Activate Zivo Pro in Test Mode right now?")) {
        isProUser = true;
        db.setItem("is_pro", true);
        updatePlanUI();
        closeUpgradeModal();
        alert("Zivo Pro unlocked!");
    }
}

function openTab(tabId) {
    if (!tabId) return;
    if (navigationHistory[navigationHistory.length - 1] !== tabId) {
        navigationHistory.push(tabId);
        try { window.history.pushState({ tab: tabId }, "", "#" + tabId); } catch (e) {}
    }
    renderTabUI(tabId);
}

function navigateBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        renderTabUI(navigationHistory[navigationHistory.length - 1]);
    } else {
        renderTabUI("dashboard");
    }
}

window.addEventListener("popstate", () => navigateBack());

function renderTabUI(tabId) {
    document.querySelectorAll(".tab-view").forEach(el => el.style.display = "none");
    const target = document.getElementById("view-" + tabId) || document.getElementById("view-dashboard");
    target.style.display = "block";

    if (tabId === "dashboard") updateDashStats();
    if (tabId === "stock") renderStockTable();
    if (tabId === "history") renderHistoryTable();
    if (tabId === "credit") renderCreditTable();
    if (tabId === "expenses") renderExpensesTable();
    if (tabId === "services") renderServicesTable();
    if (tabId === "suppliers") renderSuppliersTable();
    if (tabId === "returns") renderReturnsTable();
    if (tabId === "staff") renderStaffTable();
    if (tabId === "catalog") renderCatalogGrid();
    if (tabId === "labels") populateStudioProducts();
    if (tabId === "billcreator") {
        updateHeldBillsButton();
        renderBillReceiptPreview();
    }
}

function quickLaunchFilter(query) {
    if (!query) return;
    const q = query.toLowerCase().trim();
    if (q === "eod" || q === "report") { openEodSummaryModal(); return; }
    const map = {
        bill: "billcreator", stock: "stock", inventory: "stock", history: "history",
        return: "returns", service: "services", credit: "credit", udhaar: "credit",
        expense: "expenses", supplier: "suppliers", label: "labels", qr: "labels",
        business: "business", setting: "setting"
    };
    const key = Object.keys(map).find(k => k.includes(q) || q.includes(k));
    if (key) openTab(map[key]);
}

function initApp() {
    try { window.history.replaceState({ tab: "dashboard" }, "", "#dashboard"); } catch (e) {}
    if (window.innerWidth <= 768) document.body.classList.add("mobile-mode");

    populateLanguageSelector();
    applyLanguageTranslations(shopConfig.lang || "en");
    loadSettingsFields();
    updatePlanUI();
    loadBusinessFields();
    updateHeldBillsButton();

    if (activeAccount) {
        document.getElementById("authGatekeeper").style.display = "none";
        document.getElementById("dashWelcome").innerText = "Welcome to Zivo Shop Helper - " + (activeAccount.shopName || "Shopkeeper");
        updateDashStats();
        pullShopDataFromCloud();
    } else {
        document.getElementById("authGatekeeper").style.display = "flex";
    }
    renderBillReceiptPreview();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

function showAuthView(view) {
    document.getElementById("formLogin").style.display = view === "login" ? "block" : "none";
    document.getElementById("formSignup").style.display = view === "signup" ? "block" : "none";
    document.getElementById("formForgot").style.display = view === "forgot" ? "block" : "none";
}

function execLogin() {
    const user = document.getElementById("loginUserNick").value.trim();
    const pass = document.getElementById("loginPass").value.trim();
    if (!user || !pass) {
        alert("Please enter both email/username and password.");
        return;
    }

    if (firebaseAuth && user.includes("@")) {
        firebaseAuth.signInWithEmailAndPassword(user, pass)
            .then(cred => {
                completeLoginSession(user, cred.user?.displayName || activeAccount?.shopName || "My Shop");
                pullShopDataFromCloud();
            })
            .catch(err => {
                if (err.code === "auth/operation-not-allowed" || err.code === "auth/unauthorized-domain" || err.code === "auth/network-request-failed") {
                    completeLoginSession(user, activeAccount?.shopName || "Zivo Retail Store");
                } else {
                    alert("Sign in failed: " + err.message);
                }
            });
    } else {
        completeLoginSession(user, activeAccount?.shopName || "Zivo Retail Store");
    }
}

function execRegister() {
    const owner = document.getElementById("signOwner").value.trim();
    const shop = document.getElementById("signShop").value.trim();
    const email = document.getElementById("signEmail").value.trim();
    const pass = document.getElementById("signPass").value.trim();

    if (!owner || !shop || !email || pass.length < 6) {
        alert("Please fill all fields and use a password of at least 6 characters.");
        return;
    }

    if (firebaseAuth) {
        firebaseAuth.createUserWithEmailAndPassword(email, pass)
            .then(() => completeLoginSession(email, shop, owner))
            .catch(err => {
                if (err.code === "auth/operation-not-allowed" || err.code === "auth/unauthorized-domain" || err.code === "auth/network-request-failed") {
                    completeLoginSession(email, shop, owner);
                } else {
                    alert("Registration failed: " + err.message);
                }
            });
    } else {
        completeLoginSession(email, shop, owner);
    }
}

function completeLoginSession(emailOrUser, shopName, ownerName = "Owner") {
    activeAccount = {
        username: emailOrUser,
        email: emailOrUser.includes("@") ? emailOrUser : emailOrUser + "@zivo.shop",
        shopName,
        ownerName
    };
    db.setItem("account", activeAccount);
    document.getElementById("authGatekeeper").style.display = "none";
    document.getElementById("dashWelcome").innerText = "Welcome to Zivo Shop Helper - " + shopName;
    loadBusinessFields();
    updateDashStats();
}

function execRecovery() {
    const email = document.getElementById("forgotTargetEmail").value.trim();
    if (!email) { alert("Enter your registered email address."); return; }
    if (firebaseAuth) {
        firebaseAuth.sendPasswordResetEmail(email)
            .then(() => { alert("Password reset link sent to " + email); showAuthView("login"); })
            .catch(err => alert(err.message));
    } else {
        alert("Password reset requires Firebase Auth enabled.");
    }
}

function logoutAccount() {
    if (firebaseAuth) firebaseAuth.signOut().catch(() => {});
    db.setItem("account", null);
    location.reload();
}

function getTodayFinancials() {
    let todaySales = 0, grossProfit = 0, todayExpenses = 0;
    let modes = { Cash: 0, UPI: 0, Card: 0, "Credit / Udhaar": 0 };
    let billCount = 0;
    const todayStr = new Date().toISOString().split("T")[0];

    salesHistory.forEach(sale => {
        if (sale.date && sale.date.startsWith(todayStr)) {
            billCount++;
            const amt = Number(sale.total) || 0;
            todaySales += amt;
            grossProfit += Number(sale.profit) || 0;
            const m = sale.payMode || "Cash";
            modes[m] = (modes[m] || 0) + amt;
        }
    });

    expenseMaster.forEach(exp => {
        if (exp.date === todayStr) todayExpenses += Number(exp.amount) || 0;
    });

    const netProfit = grossProfit - todayExpenses;
    const totalPendingCredit = creditMaster.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    return { todaySales, grossProfit, todayExpenses, netProfit, modes, billCount, totalPendingCredit };
}

function updateDashStats() {
    const c = curr();
    const { todaySales, netProfit, modes, totalPendingCredit } = getTodayFinancials();

    document.getElementById("dashSales").innerText = c + todaySales.toFixed(2);
    document.getElementById("dashProfit").innerText = c + netProfit.toFixed(2);
    document.getElementById("dashPendingCredit").innerText = c + totalPendingCredit.toFixed(2);
    document.getElementById("dashPaymentBreakdown").innerText =
        "Cash: " + c + modes.Cash.toFixed(0) + " | UPI: " + c + modes.UPI.toFixed(0) +
        " | Card: " + c + modes.Card.toFixed(0) + " | Credit: " + c + modes["Credit / Udhaar"].toFixed(0);

    const lowItems = stockMaster.filter(i => i.qty <= (i.min || 5));
    const banner = document.getElementById("lowStockBanner");
    if (lowItems.length > 0) {
        banner.style.display = "flex";
        document.getElementById("lowStockBannerText").innerText =
            "Low Stock Alert: " + lowItems.length + " item(s) running low (" + lowItems.slice(0, 3).map(i => i.name).join(", ") + ")";
    } else {
        banner.style.display = "none";
    }
}

function openEodSummaryModal() {
    const c = curr();
    const d = getTodayFinancials();
    document.getElementById("eodReportBody").innerHTML = `
        <div><b>Date:</b> ${new Date().toLocaleDateString()}</div>
        <div><b>Total Bills:</b> ${d.billCount}</div>
        <hr style="border-color: var(--border-color);">
        <div><b>Cash:</b> ${c}${d.modes.Cash.toFixed(2)}</div>
        <div><b>UPI:</b> ${c}${d.modes.UPI.toFixed(2)}</div>
        <div><b>Card:</b> ${c}${d.modes.Card.toFixed(2)}</div>
        <div><b>Credit / Udhaar:</b> ${c}${d.modes["Credit / Udhaar"].toFixed(2)}</div>
        <hr style="border-color: var(--border-color);">
        <div><b>Total Sales:</b> ${c}${d.todaySales.toFixed(2)}</div>
        <div><b>Expenses:</b> -${c}${d.todayExpenses.toFixed(2)}</div>
        <div><b>Net Profit:</b> ${c}${d.netProfit.toFixed(2)}</div>
    `;
    document.getElementById("modalEodReport").style.display = "flex";
}

function closeEodSummaryModal() { document.getElementById("modalEodReport").style.display = "none"; }

function shareEodWhatsApp() {
    const c = curr();
    const d = getTodayFinancials();
    const shop = activeAccount?.shopName || "Zivo Shop Helper";
    const msg = "*" + shop + " - Daily Closing Report (" + new Date().toLocaleDateString() + ")*\n\n" +
        "Bills: " + d.billCount + "\nTotal Sales: " + c + d.todaySales.toFixed(2) +
        "\nCash: " + c + d.modes.Cash.toFixed(2) +
        "\nUPI: " + c + d.modes.UPI.toFixed(2) +
        "\nCard: " + c + d.modes.Card.toFixed(2) +
        "\nCredit: " + c + d.modes["Credit / Udhaar"].toFixed(2) +
        "\nExpenses: " + c + d.todayExpenses.toFixed(2) +
        "\n*Net Profit: " + c + d.netProfit.toFixed(2) + "*";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
}

function saveProduct() {
    const name = document.getElementById("stkName").value.trim();
    const price = parseFloat(document.getElementById("stkPrice").value);
    const cost = parseFloat(document.getElementById("stkCost").value) || 0;
    const qty = parseInt(document.getElementById("stkQty").value);
    const min = parseInt(document.getElementById("stkMin").value) || 5;
    const code = document.getElementById("stkCustomCode").value.trim();
    const editId = document.getElementById("stkEditingId").value;

    if (!name || isNaN(price) || price < 0 || isNaN(qty) || qty < 0) {
        alert("Enter a valid product name, price, and quantity.");
        return;
    }
    if (!editId && !isProUser && stockMaster.length >= FREE_STOCK_LIMIT) {
        alert("Free Plan allows up to " + FREE_STOCK_LIMIT + " products.");
        openUpgradeModal();
        return;
    }
    if (editId) {
        const idx = stockMaster.findIndex(i => i.id == editId);
        if (idx !== -1) stockMaster[idx] = { ...stockMaster[idx], name, price, cost, qty, min, code };
    } else {
        stockMaster.push({ id: Date.now(), name, price, cost, qty, min, code });
    }
    db.setItem("stock", stockMaster);
    resetStockForm();
    renderStockTable();
    updateDashStats();
}

function resetStockForm() {
    ["stkEditingId", "stkName", "stkPrice", "stkCost", "stkQty", "stkCustomCode"].forEach(id => {
        document.getElementById(id).value = "";
    });
    document.getElementById("stkMin").value = "5";
}

function renderStockTable() {
    const c = curr();
    const tbody = document.getElementById("stkTableBody");
    const limitLbl = document.getElementById("stockLimitLabel");
    if (limitLbl) {
        limitLbl.innerText = isProUser
            ? "Zivo Pro: " + stockMaster.length + " items (Unlimited)"
            : "Free Plan: " + stockMaster.length + " / " + FREE_STOCK_LIMIT + " items";
    }
    if (!tbody) return;
    tbody.innerHTML = "";
    stockMaster.forEach(item => {
        const isLow = item.qty <= (item.min || 5);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${esc(item.name)}</b></td>
            <td><code>${esc(item.code || "-")}</code></td>
            <td>${c}${item.price.toFixed(2)}</td>
            <td><span style="color:${isLow ? "var(--accent-red)" : "var(--accent-green)"}; font-weight:bold;">${item.qty}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editProduct(${item.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${item.id})">Del</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editProduct(id) {
    const item = stockMaster.find(i => i.id == id);
    if (!item) return;
    document.getElementById("stkEditingId").value = item.id;
    document.getElementById("stkName").value = item.name;
    document.getElementById("stkPrice").value = item.price;
    document.getElementById("stkCost").value = item.cost || 0;
    document.getElementById("stkQty").value = item.qty;
    document.getElementById("stkMin").value = item.min || 5;
    document.getElementById("stkCustomCode").value = item.code || "";
}

function deleteProduct(id) {
    stockMaster = stockMaster.filter(i => i.id != id);
    db.setItem("stock", stockMaster);
    renderStockTable();
    updateDashStats();
}

function exportLowStockList() {
    const low = stockMaster.filter(i => i.qty <= (i.min || 5));
    if (!low.length) { alert("No low-stock items right now."); return; }
    const csv = "Product,Price,Remaining Qty\n" + low.map(i => '"' + i.name.replace(/"/g, '""') + '",' + i.price + "," + i.qty).join("\n");
    downloadCSVFile(csv, "zivo-low-stock.csv");
}

function exportAllStockCSV() {
    if (!stockMaster.length) { alert("Stock list is empty."); return; }
    const csv = "Product,Price,Cost,Qty,MinAlert,Barcode\n" + stockMaster.map(i => '"' + i.name.replace(/"/g, '""') + '",' + i.price + "," + (i.cost || 0) + "," + i.qty + "," + (i.min || 5) + ',"' + (i.code || "") + '"').join("\n");
    downloadCSVFile(csv, "zivo-full-stock.csv");
}

function downloadCSVFile(csvText, filename) {
    const blob = new Blob([csvText], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function importStockCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const lines = e.target.result.split(/\r?\n/).slice(1);
        let added = 0;
        lines.forEach(line => {
            if (!line.trim()) return;
            if (!isProUser && stockMaster.length >= FREE_STOCK_LIMIT) return;
            const cols = line.split(",");
            const name = (cols[0] || "").replace(/^"|"$/g, "").trim();
            const price = parseFloat(cols[1]) || 0;
            const cost = parseFloat(cols[2]) || 0;
            const qty = parseInt(cols[3]) || 0;
            const min = parseInt(cols[4]) || 5;
            const code = (cols[5] || "").replace(/^"|"$/g, "").trim();
            if (name && price >= 0) {
                stockMaster.push({ id: Date.now() + added, name, price, cost, qty, min, code });
                added++;
            }
        });
        db.setItem("stock", stockMaster);
        renderStockTable();
        updateDashStats();
        alert("Imported " + added + " product(s).");
    };
    reader.readAsText(file);
}

function holdCurrentBill() {
    if (!currentManualBillItems.length) { alert("Add at least one item before holding a bill."); return; }
    heldBills.push({
        id: Date.now(),
        customer: document.getElementById("billCustName").value.trim() || "Walk-in Customer",
        phone: document.getElementById("billCustPhone").value.trim(),
        items: [...currentManualBillItems],
        time: new Date().toLocaleTimeString()
    });
    db.setItem("held_bills", heldBills);
    currentManualBillItems = [];
    document.getElementById("billCustName").value = "";
    document.getElementById("billCustPhone").value = "";
    renderManualBillItemsList();
    renderBillReceiptPreview();
    updateHeldBillsButton();
    alert("Bill parked.");
}

function updateHeldBillsButton() {
    const btn = document.getElementById("btnHeldBillsCount");
    if (btn) btn.innerText = "Held (" + heldBills.length + ")";
}

function openHeldBillsModal() {
    const list = document.getElementById("heldBillsList");
    list.innerHTML = heldBills.length
        ? heldBills.map((b, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--input-bg); padding:10px; border-radius:10px; margin-bottom:8px;">
                <div><b>${esc(b.customer)}</b> (${b.items.length} items)<br><small style="color:var(--text-muted)">${esc(b.time)}</small></div>
                <button class="btn btn-success btn-sm" onclick="resumeHeldBill(${idx})">Resume</button>
            </div>
        `).join("")
        : "<p style='color:var(--text-muted);'>No parked bills right now.</p>";
    document.getElementById("modalHeldBills").style.display = "flex";
}

function closeHeldBillsModal() { document.getElementById("modalHeldBills").style.display = "none"; }

function resumeHeldBill(idx) {
    const bill = heldBills[idx];
    if (!bill) return;
    currentManualBillItems = [...bill.items];
    document.getElementById("billCustName").value = bill.customer;
    document.getElementById("billCustPhone").value = bill.phone || "";
    heldBills.splice(idx, 1);
    db.setItem("held_bills", heldBills);
    updateHeldBillsButton();
    closeHeldBillsModal();
    renderManualBillItemsList();
    renderBillReceiptPreview();
}

function handlePaperStyleChange() {
    const sel = document.getElementById("cfgPaperStyle");
    if (!isProUser && (sel.value === "paper-a4" || sel.value === "paper-a5")) {
        sel.value = "paper-thermal-80";
        openUpgradeModal();
        return;
    }
    renderBillReceiptPreview();
}

function handleFestivalThemeChange() {
    const sel = document.getElementById("cfgFestivalTheme");
    if (!isProUser && sel.value !== "standard") {
        sel.value = "standard";
        openUpgradeModal();
        return;
    }
    renderBillReceiptPreview();
}

function handleStockAutocomplete(val) {
    const box = document.getElementById("autocompleteBox");
    const q = val.trim().toLowerCase();
    if (!q) { box.style.display = "none"; return; }
    const matches = [
        ...stockMaster.map(s => ({ name: s.name, price: s.price, code: s.code, type: "Product" })),
        ...servicesMaster.map(s => ({ name: s.name, price: s.price, code: "", type: "Service" }))
    ].filter(x => x.name.toLowerCase().includes(q) || (x.code && x.code.toLowerCase() === q));
    if (!matches.length) { box.style.display = "none"; return; }
    const c = curr();
    box.innerHTML = "";
    matches.slice(0, 6).forEach(m => {
        const div = document.createElement("div");
        div.className = "autocomplete-suggestion";
        div.innerHTML = `<span>${esc(m.name)} <small style="color:var(--text-muted)">(${m.type})</small></span><b>${c}${m.price.toFixed(2)}</b>`;
        div.onclick = () => {
            document.getElementById("itemAddName").value = m.name;
            document.getElementById("itemAddPrice").value = m.price;
            calculateAutoLineTotal();
            box.style.display = "none";
        };
        box.appendChild(div);
    });
    box.style.display = "block";
}

function calculateAutoLineTotal() {
    const qty = parseInt(document.getElementById("itemAddQty").value) || 0;
    const price = parseFloat(document.getElementById("itemAddPrice").value) || 0;
    document.getElementById("itemAddTotal").value = (qty * price).toFixed(2);
}

function addItemToManualBill() {
    const name = document.getElementById("itemAddName").value.trim();
    const qty = parseInt(document.getElementById("itemAddQty").value) || 1;
    const price = parseFloat(document.getElementById("itemAddPrice").value) || 0;
    if (!name || price <= 0 || qty <= 0) { alert("Enter a valid item name, quantity, and price."); return; }
    currentManualBillItems.push({ name, qty, price, total: qty * price });
    document.getElementById("itemAddName").value = "";
    document.getElementById("itemAddQty").value = "1";
    document.getElementById("itemAddPrice").value = "";
    document.getElementById("itemAddTotal").value = "";
    renderManualBillItemsList();
    renderBillReceiptPreview();
}

function removeBillItem(index) {
    currentManualBillItems.splice(index, 1);
    renderManualBillItemsList();
    renderBillReceiptPreview();
}

function renderManualBillItemsList() {
    const c = curr();
    const container = document.getElementById("manualBillItemsList");
    if (!container) return;
    container.innerHTML = currentManualBillItems.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--input-bg); padding:6px 10px; border-radius:8px; margin-bottom:6px; font-size:12px;">
            <span>${esc(item.name)} x ${item.qty} = <b>${c}${item.total.toFixed(2)}</b></span>
            <button class="btn btn-danger btn-sm" onclick="removeBillItem(${idx})">X</button>
        </div>
    `).join("");
}

function computeBillTotals() {
    const subtotal = currentManualBillItems.reduce((sum, i) => sum + i.total, 0);
    const discount = Math.max(0, parseFloat(document.getElementById("billDiscountInput")?.value) || 0);
    const taxPct = Math.max(0, parseFloat(document.getElementById("billTaxRateInput")?.value) || 0);
    const taxable = Math.max(0, subtotal - discount);
    const taxAmt = (taxable * taxPct) / 100;
    const grandTotal = taxable + taxAmt;
    return { subtotal, discount, taxPct, taxAmt, grandTotal };
}

function buildReceiptHTML({ invId, dateStr, custName, payMode, items, subtotal, discount, taxPct, taxAmt, grandTotal, theme }) {
    const c = curr();
    const shopName = activeAccount?.shopName || "Zivo Shop Helper";
    const bannerMap = {
        "theme-diwali": '<div class="receipt-banner">SHUBH DIWALI - FESTIVE GREETINGS</div>',
        "theme-holi": '<div class="receipt-banner">HAPPY HOLI - FESTIVAL OF COLORS</div>',
        "theme-festive": '<div class="receipt-banner">SPECIAL FESTIVE CELEBRATION OFFER</div>'
    };
    const itemsHtml = items.map(item => `
        <div style="display:flex; justify-content:space-between; margin:4px 0;">
            <span>${esc(item.name)} x${item.qty}</span>
            <span>${c}${item.total.toFixed(2)}</span>
        </div>
    `).join("");
    const showQr = document.getElementById("chkIncludeUpiQr")?.checked && shopConfig.upiId && grandTotal > 0;
    return `
        <div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:8px; margin-bottom:8px;">
            ${bannerMap[theme] || ""}
            <h3 style="margin:0;">${esc(shopName)}</h3>
            ${activeAccount?.address ? `<div style="font-size:10px;">${esc(activeAccount.address)}</div>` : ""}
            ${activeAccount?.phone ? `<div style="font-size:10px;">Ph: ${esc(activeAccount.phone)}</div>` : ""}
            ${activeAccount?.gst ? `<div style="font-size:10px;">GSTIN: ${esc(activeAccount.gst)}</div>` : ""}
        </div>
        <div style="font-size:11px; margin-bottom:8px;">
            ${invId ? `<div>Invoice: <b>${esc(invId)}</b></div>` : ""}
            <div>Customer: <b>${esc(custName)}</b></div>
            <div>Payment: ${esc(payMode)} | Date: ${esc(dateStr)}</div>
        </div>
        <div style="border-bottom:1px dashed #000; padding-bottom:8px; margin-bottom:8px;">
            ${itemsHtml || '<div style="text-align:center; color:#666;">Add items to preview receipt</div>'}
        </div>
        <div style="font-size:11px;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>${c}${subtotal.toFixed(2)}</span></div>
            ${discount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Discount:</span><span>-${c}${discount.toFixed(2)}</span></div>` : ""}
            ${taxPct > 0 ? `<div style="display:flex; justify-content:space-between;"><span>GST (${taxPct}%):</span><span>+${c}${taxAmt.toFixed(2)}</span></div>` : ""}
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; border-top:1px solid #000; padding-top:6px; margin-top:6px;">
            <span>GRAND TOTAL:</span>
            <span>${c}${grandTotal.toFixed(2)}</span>
        </div>
        ${showQr ? `<div style="text-align:center; margin-top:10px;"><div id="receiptUpiQrTarget" style="display:inline-block;"></div><div style="font-size:9px;">UPI: ${esc(shopConfig.upiId)}</div></div>` : ""}
        <div style="text-align:center; margin-top:12px; font-size:10px;">
            ${esc(shopConfig.footerMsg || "Thank you for shopping with us!")}
        </div>
    `;
}

function renderBillReceiptPreview() {
    const area = document.getElementById("printableReceiptArea");
    if (!area) return;
    const paper = document.getElementById("cfgPaperStyle")?.value || "paper-thermal-80";
    const theme = document.getElementById("cfgFestivalTheme")?.value || "standard";
    area.className = "bill-paper " + paper + (theme !== "standard" ? " " + theme : "");
    const custName = document.getElementById("billCustName")?.value.trim() || "Walk-in Customer";
    const payMode = document.getElementById("billPayModeInput")?.value || "Cash";
    const totals = computeBillTotals();
    area.innerHTML = buildReceiptHTML({
        invId: "",
        dateStr: new Date().toLocaleDateString(),
        custName,
        payMode,
        items: currentManualBillItems,
        ...totals,
        theme
    });
    const qrTarget = document.getElementById("receiptUpiQrTarget");
    if (qrTarget && typeof QRCode !== "undefined" && shopConfig.upiId && totals.grandTotal > 0) {
        const upiUrl = "upi://pay?pa=" + encodeURIComponent(shopConfig.upiId) + "&pn=" + encodeURIComponent(activeAccount?.shopName || "Shop") + "&am=" + totals.grandTotal.toFixed(2) + "&cu=INR";
        new QRCode(qrTarget, { text: upiUrl, width: 84, height: 84 });
    }
}

function markBillAsSoldAndPrint() {
    if (!currentManualBillItems.length) { alert("Please add at least one item before completing the bill."); return; }
    const totals = computeBillTotals();
    const custName = document.getElementById("billCustName").value.trim() || "Walk-in Customer";
    const custPhone = document.getElementById("billCustPhone").value.trim();
    const payMode = document.getElementById("billPayModeInput").value;
    const theme = document.getElementById("cfgFestivalTheme")?.value || "standard";

    let billProfit = 0;
    currentManualBillItems.forEach(soldItem => {
        const stockMatch = stockMaster.find(s => s.name.toLowerCase() === soldItem.name.toLowerCase());
        if (stockMatch) {
            stockMatch.qty = Math.max(0, stockMatch.qty - soldItem.qty);
            const unitCost = stockMatch.cost > 0 ? stockMatch.cost : soldItem.price * 0.8;
            billProfit += (soldItem.price - unitCost) * soldItem.qty;
        } else {
            billProfit += soldItem.total * 0.2;
        }
    });
    db.setItem("stock", stockMaster);

    if (payMode === "Credit / Udhaar") {
        creditMaster.push({
            id: Date.now(),
            name: custName,
            phone: custPhone,
            amount: totals.grandTotal,
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            note: "Auto-logged from POS Bill"
        });
        db.setItem("credit", creditMaster);
    }

    const invId = "INV-" + Date.now().toString().slice(-6);
    salesHistory.unshift({
        id: invId,
        date: new Date().toISOString(),
        customer: custName,
        payMode,
        ...totals,
        total: totals.grandTotal,
        profit: billProfit,
        theme,
        items: [...currentManualBillItems]
    });
    db.setItem("sales_history", salesHistory);

    updateDashStats();
    window.print();
    currentManualBillItems = [];
    renderManualBillItemsList();
    renderBillReceiptPreview();
}

function shareCurrentBillWhatsApp() {
    if (!currentManualBillItems.length) { alert("Add items to the bill first before sharing on WhatsApp."); return; }
    const c = curr();
    const shopName = activeAccount?.shopName || "Zivo Shop Helper";
    const custName = document.getElementById("billCustName").value.trim() || "Customer";
    const rawPhone = document.getElementById("billCustPhone").value.replace(/\D/g, "");
    const { grandTotal } = computeBillTotals();
    const lines = currentManualBillItems.map(i => "- " + i.name + " x" + i.qty + " = " + c + i.total.toFixed(2)).join("\n");
    const msg = "*" + shopName + "*\nCustomer: " + custName + "\n\n" + lines + "\n\n*Grand Total: " + c + grandTotal.toFixed(2) + "*";
    const phonePrefix = rawPhone.length === 10 ? "91" + rawPhone : rawPhone;
    const url = phonePrefix
        ? "https://wa.me/" + phonePrefix + "?text=" + encodeURIComponent(msg)
        : "https://wa.me/?text=" + encodeURIComponent(msg);
    window.open(url, "_blank");
}

function renderHistoryTable(filter = "") {
    const c = curr();
    const tbody = document.getElementById("historyTableBody");
    if (!tbody) return;
    const q = filter.toLowerCase();
    tbody.innerHTML = "";
    salesHistory
        .filter(s => !q || s.id.toLowerCase().includes(q) || s.customer.toLowerCase().includes(q) || (s.payMode || "").toLowerCase().includes(q))
        .forEach((sale, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><code>${esc(sale.id)}</code></td>
                <td>${new Date(sale.date).toLocaleString()}</td>
                <td>${esc(sale.customer)}</td>
                <td>${sale.items ? sale.items.map(i => `${esc(i.name)} (${i.qty})`).join(", ") : "-"}</td>
                <td>${esc(sale.payMode || "Cash")}</td>
                <td style="font-weight:bold; color:var(--accent-green);">${c}${sale.total.toFixed(2)}</td>
                <td><button class="btn btn-primary btn-sm" onclick="reprintHistoricalInvoice(${idx})">Print</button></td>
            `;
            tbody.appendChild(tr);
        });
}

function reprintHistoricalInvoice(idx) {
    const sale = salesHistory[idx];
    if (!sale) return;
    const area = document.getElementById("printableReceiptArea");
    if (!area) return;
    area.innerHTML = buildReceiptHTML({
        invId: sale.id,
        dateStr: new Date(sale.date).toLocaleDateString(),
        custName: sale.customer,
        payMode: sale.payMode || "Cash",
        items: sale.items || [],
        subtotal: sale.subtotal ?? sale.total,
        discount: sale.discount ?? 0,
        taxPct: sale.taxPct ?? 0,
        taxAmt: sale.taxAmt ?? 0,
        grandTotal: sale.total,
        theme: sale.theme || "standard"
    });
    window.print();
    renderBillReceiptPreview();
}

function processCustomerReturn() {
    const invId = document.getElementById("retInvId").value.trim() || "N/A";
    const itemName = document.getElementById("retItemName").value.trim();
    const qty = parseInt(document.getElementById("retQty").value) || 0;
    const refund = parseFloat(document.getElementById("retRefund").value) || 0;
    const reason = document.getElementById("retReason").value.trim() || "Customer Return";
    if (!itemName || qty <= 0 || refund < 0) { alert("Enter valid product name, quantity, and refund amount."); return; }
    const stockMatch = stockMaster.find(s => s.name.toLowerCase() === itemName.toLowerCase());
    if (stockMatch) { stockMatch.qty += qty; db.setItem("stock", stockMaster); }
    returnsMaster.unshift({ date: new Date().toLocaleDateString(), invId, itemName, qty, refund, reason });
    db.setItem("returns", returnsMaster);
    ["retInvId", "retItemName", "retRefund", "retReason"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("retQty").value = "1";
    renderReturnsTable();
    updateDashStats();
}

function renderReturnsTable() {
    const c = curr();
    const tbody = document.getElementById("returnsTableBody");
    if (!tbody) return;
    tbody.innerHTML = returnsMaster.map(r => `
        <tr><td>${esc(r.date)}</td><td>${esc(r.invId)}</td><td>${esc(r.itemName)}</td><td>${r.qty}</td><td>${c}${r.refund.toFixed(2)}</td><td>${esc(r.reason)}</td></tr>
    `).join("");
}

function saveServiceItem() {
    const name = document.getElementById("srvName").value.trim();
    const desc = document.getElementById("srvDesc").value.trim();
    const price = parseFloat(document.getElementById("srvPrice").value) || 0;
    if (!name || price < 0) { alert("Enter valid service title and fee."); return; }
    servicesMaster.push({ id: Date.now(), name, desc, price });
    db.setItem("services", servicesMaster);
    ["srvName", "srvDesc", "srvPrice"].forEach(id => document.getElementById(id).value = "");
    renderServicesTable();
}

function renderServicesTable() {
    const c = curr();
    const tbody = document.getElementById("servicesTableBody");
    if (!tbody) return;
    tbody.innerHTML = servicesMaster.map(s => `
        <tr>
            <td><b>${esc(s.name)}</b></td><td>${esc(s.desc || "-")}</td><td>${c}${s.price.toFixed(2)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})">Del</button></td>
        </tr>
    `).join("");
}

function deleteService(id) {
    servicesMaster = servicesMaster.filter(s => s.id !== id);
    db.setItem("services", servicesMaster);
    renderServicesTable();
}

function addCreditEntry() {
    const name = document.getElementById("credCustName").value.trim();
    const phone = document.getElementById("credCustPhone").value.trim();
    const amount = parseFloat(document.getElementById("credAmount").value) || 0;
    const dueDate = document.getElementById("credDueDate").value || "Not set";
    const note = document.getElementById("credNote").value.trim();
    if (!name || amount <= 0) { alert("Enter customer name and due amount."); return; }
    creditMaster.push({ id: Date.now(), name, phone, amount, dueDate, note });
    db.setItem("credit", creditMaster);
    ["credCustName", "credCustPhone", "credAmount", "credDueDate", "credNote"].forEach(id => document.getElementById(id).value = "");
    renderCreditTable();
    updateDashStats();
}

function renderCreditTable() {
    const c = curr();
    const tbody = document.getElementById("creditTableBody");
    if (!tbody) return;
    tbody.innerHTML = creditMaster.map(item => `
        <tr>
            <td><b>${esc(item.name)}</b><br><small style="color:var(--text-muted)">${esc(item.phone || "")}</small></td>
            <td>${esc(item.dueDate)}</td>
            <td style="color:var(--accent-orange); font-weight:bold;">${c}${item.amount.toFixed(2)}</td>
            <td>${esc(item.note || "-")}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="sendUdhaarWhatsApp(${item.id})">Remind</button>
                <button class="btn btn-success btn-sm" onclick="settleCredit(${item.id})">Paid</button>
            </td>
        </tr>
    `).join("");
}

function sendUdhaarWhatsApp(id) {
    const item = creditMaster.find(x => x.id === id);
    if (!item) return;
    const shop = activeAccount?.shopName || "our shop";
    const msg = "Reminder from *" + shop + "*: pending balance of *" + curr() + item.amount.toFixed(2) + "* is due (" + item.dueDate + ").";
    const digits = (item.phone || "").replace(/\D/g, "");
    const target = digits.length === 10 ? "91" + digits : digits;
    window.open(target ? "https://wa.me/" + target + "?text=" + encodeURIComponent(msg) : "https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
}

function settleCredit(id) {
    creditMaster = creditMaster.filter(c => c.id !== id);
    db.setItem("credit", creditMaster);
    renderCreditTable();
    updateDashStats();
}

function addExpenseEntry() {
    const title = document.getElementById("expTitle").value.trim();
    const amount = parseFloat(document.getElementById("expAmount").value) || 0;
    const date = document.getElementById("expDate").value || new Date().toISOString().split("T")[0];
    if (!title || amount <= 0) { alert("Enter valid expense title and amount."); return; }
    expenseMaster.unshift({ id: Date.now(), title, amount, date });
    db.setItem("expenses", expenseMaster);
    ["expTitle", "expAmount", "expDate"].forEach(id => document.getElementById(id).value = "");
    renderExpensesTable();
    updateDashStats();
}

function renderExpensesTable() {
    const c = curr();
    const tbody = document.getElementById("expenseTableBody");
    if (!tbody) return;
    tbody.innerHTML = expenseMaster.map(e => `
        <tr>
            <td>${esc(e.title)}</td><td>${esc(e.date)}</td><td style="color:var(--accent-red); font-weight:bold;">${c}${e.amount.toFixed(2)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">Del</button></td>
        </tr>
    `).join("");
}

function deleteExpense(id) {
    expenseMaster = expenseMaster.filter(e => e.id !== id);
    db.setItem("expenses", expenseMaster);
    renderExpensesTable();
    updateDashStats();
}

function addSupplier() {
    const name = document.getElementById("suppName").value.trim();
    const phone = document.getElementById("suppPhone").value.trim();
    const category = document.getElementById("suppCategory").value.trim();
    if (!name) { alert("Enter supplier name."); return; }
    suppliersMaster.push({ id: Date.now(), name, phone, category });
    db.setItem("suppliers", suppliersMaster);
    ["suppName", "suppPhone", "suppCategory"].forEach(id => document.getElementById(id).value = "");
    renderSuppliersTable();
}

function renderSuppliersTable() {
    const tbody = document.getElementById("supplierTableBody");
    if (!tbody) return;
    tbody.innerHTML = suppliersMaster.map(s => `
        <tr>
            <td><b>${esc(s.name)}</b></td><td>${esc(s.phone || "-")}</td><td>${esc(s.category || "-")}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})">Del</button></td>
        </tr>
    `).join("");
}

function deleteSupplier(id) {
    suppliersMaster = suppliersMaster.filter(s => s.id !== id);
    db.setItem("suppliers", suppliersMaster);
    renderSuppliersTable();
}

function registerStaffMember() {
    const name = document.getElementById("staffRegName").value.trim();
    const phone = document.getElementById("staffRegPhone").value.trim();
    const salary = parseFloat(document.getElementById("staffRegSalary").value) || 0;
    const role = document.getElementById("staffRegRole").value.trim() || "Staff";
    if (!name) { alert("Enter staff name."); return; }
    staffMaster.push({ id: Date.now(), name, phone, salary, role, presentDays: 0 });
    db.setItem("staff", staffMaster);
    ["staffRegName", "staffRegPhone", "staffRegSalary", "staffRegRole"].forEach(id => document.getElementById(id).value = "");
    renderStaffTable();
}

function saveStaffAttendance() {
    const id = document.getElementById("staffSelectDropdown").value;
    const status = document.getElementById("staffStatus").value;
    const staff = staffMaster.find(s => s.id == id);
    if (!staff) { alert("Register a staff member first."); return; }
    if (status === "Present") staff.presentDays = (staff.presentDays || 0) + 1;
    if (status === "Half-Day") staff.presentDays = (staff.presentDays || 0) + 0.5;
    db.setItem("staff", staffMaster);
    renderStaffTable();
}

function renderStaffTable() {
    const c = curr();
    const tbody = document.getElementById("staffTableBody");
    const dd = document.getElementById("staffSelectDropdown");
    if (dd) dd.innerHTML = staffMaster.map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.role)})</option>`).join("");
    if (!tbody) return;
    tbody.innerHTML = staffMaster.map(s => `
        <tr>
            <td><b>${esc(s.name)}</b></td><td>${esc(s.role)}</td><td>${c}${s.salary}</td><td>${s.presentDays || 0}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteStaff(${s.id})">Del</button></td>
        </tr>
    `).join("");
}

function deleteStaff(id) {
    staffMaster = staffMaster.filter(s => s.id !== id);
    db.setItem("staff", staffMaster);
    renderStaffTable();
}

function openStaffSalaryModal() {
    const c = curr();
    const box = document.getElementById("staffSalaryResultContainer");
    box.innerHTML = staffMaster.length
        ? `<table class="table-custom"><thead><tr><th>Staff</th><th>Base Salary</th><th>Present Days</th><th>Payable</th></tr></thead><tbody>${
            staffMaster.map(s => {
                const payable = ((s.salary || 0) / 30) * (s.presentDays || 0);
                return `<tr><td><b>${esc(s.name)}</b></td><td>${c}${s.salary}</td><td>${s.presentDays || 0}</td><td style="color:var(--accent-green); font-weight:bold;">${c}${payable.toFixed(2)}</td></tr>`;
            }).join("")
        }</tbody></table>`
        : "<p style='color:var(--text-muted);'>No staff registered yet.</p>";
    document.getElementById("modalStaffSalary").style.display = "flex";
}

function closeStaffSalaryModal() { document.getElementById("modalStaffSalary").style.display = "none"; }

function executeAiQuery() {
    const input = document.getElementById("aiUserPrompt");
    const box = document.getElementById("aiChatBox");
    const q = input.value.trim();
    if (!q) return;
    const c = curr();
    box.innerHTML += `<div style="align-self:flex-end; background:var(--primary-teal); color:#fff; padding:8px 12px; border-radius:10px; max-width:80%;">${esc(q)}</div>`;
    input.value = "";
    const lower = q.toLowerCase();
    const d = getTodayFinancials();
    let reply = "";
    if (lower.includes("udhaar") || lower.includes("credit")) {
        reply = "You have " + creditMaster.length + " credit account(s) totaling " + c + d.totalPendingCredit.toFixed(2) + ".";
    } else if (lower.includes("stock") || lower.includes("low")) {
        const low = stockMaster.filter(i => i.qty <= (i.min || 5));
        reply = low.length ? "Low stock: " + low.map(i => i.name + " (" + i.qty + " left)").join(", ") : "All stock items are healthy.";
    } else if (lower.includes("profit") || lower.includes("expense")) {
        reply = "Today's sales: " + c + d.todaySales.toFixed(2) + ", Expenses: " + c + d.todayExpenses.toFixed(2) + ", Net Profit: " + c + d.netProfit.toFixed(2) + ".";
    } else {
        const totalSales = salesHistory.reduce((a, s) => a + s.total, 0);
        reply = "Total products: " + stockMaster.length + ", Lifetime sales: " + c + totalSales.toFixed(2) + ".";
    }
    box.innerHTML += `<div class="ai-bot-bubble">${esc(reply)}</div>`;
    box.scrollTop = box.scrollHeight;
}

function renderCatalogGrid() {
    const c = curr();
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;
    grid.innerHTML = stockMaster.length
        ? stockMaster.map(item => `
            <div style="background:var(--input-bg); padding:14px; border-radius:12px; border:1px solid var(--border-color); text-align:center;">
                <h4 style="margin:0 0 4px 0;">${esc(item.name)}</h4>
                <div style="color:var(--accent-green); font-weight:bold;">${c}${item.price.toFixed(2)}</div>
                <small style="color:var(--text-muted);">${item.qty > 0 ? "In Stock (" + item.qty + ")" : "Out of Stock"}</small>
            </div>
        `).join("")
        : "<p style='color:var(--text-muted);'>No items in stock inventory yet.</p>";
}

function renderStatusPreview() {
    document.getElementById("prevStatusTag").innerText = document.getElementById("statusTag").value;
    document.getElementById("prevStatusTitle").innerText = document.getElementById("statusTitle").value;
    document.getElementById("prevStatusDisc").innerText = document.getElementById("statusDisc").value;
    document.getElementById("prevStatusBody").innerText = document.getElementById("statusBody").value;
}

function downloadStatusBanner() {
    const card = document.getElementById("statusCardContainer");
    if (typeof html2canvas === "undefined") { alert("Image exporter still loading."); return; }
    html2canvas(card).then(canvas => {
        const a = document.createElement("a");
        a.download = "zivo-promo-status.png";
        a.href = canvas.toDataURL();
        a.click();
    });
}

function sharePromoWhatsApp() {
    const shop = activeAccount?.shopName || "Zivo Shop Helper";
    const title = document.getElementById("statusTitle").value;
    const disc = document.getElementById("statusDisc").value;
    const body = document.getElementById("statusBody").value;
    const msg = "*" + shop + "*\n" + title + "\n*" + disc + "*\n" + body;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
}

function populateStudioProducts() {
    const c = curr();
    const sel = document.getElementById("studioItemSelect");
    if (!sel) return;
    sel.innerHTML = stockMaster.map(s => `<option value="${s.id}">${esc(s.name)} - ${c}${s.price}</option>`).join("");
    generateStudioCodePreview();
}

function generateStudioCodePreview() {
    const c = curr();
    const sel = document.getElementById("studioItemSelect");
    const type = document.getElementById("studioCodeType").value;
    const item = stockMaster.find(s => s.id == sel?.value);
    if (!item) return;
    document.getElementById("studioShopName").innerText = (activeAccount?.shopName || "ZIVO SHOP HELPER").toUpperCase();
    document.getElementById("studioItemTitle").innerText = item.name;
    document.getElementById("studioItemPrice").innerText = c + item.price.toFixed(2);
    const codeVal = item.code || "ZIVO-" + item.id;
    const svgEl = document.getElementById("studioSvgBarcode");
    const qrEl = document.getElementById("studioQrBox");
    if (type === "barcode") {
        svgEl.style.display = "block";
        qrEl.style.display = "none";
        if (typeof JsBarcode !== "undefined") JsBarcode("#studioSvgBarcode", codeVal, { height: 50, fontSize: 12 });
    } else {
        svgEl.style.display = "none";
        qrEl.style.display = "block";
        qrEl.innerHTML = "";
        if (typeof QRCode !== "undefined") new QRCode(qrEl, { text: codeVal, width: 110, height: 110 });
    }
}

function downloadStudioLabelPng() {
    const card = document.getElementById("studioPrintCard");
    if (typeof html2canvas === "undefined") { alert("Image exporter still loading."); return; }
    html2canvas(card).then(canvas => {
        const a = document.createElement("a");
        a.download = "zivo-product-label.png";
        a.href = canvas.toDataURL();
        a.click();
    });
}

function toggleAutoScanMode() {
    continuousScanMode = !continuousScanMode;
    const btn = document.getElementById("btnAutoScanToggle");
    if (btn) {
        btn.innerText = continuousScanMode ? "Continuous Scan: ON" : "Single Scan: ON";
        btn.className = continuousScanMode ? "btn btn-success btn-full" : "btn btn-warning btn-full";
    }
}

function openScannerModal() {
    document.getElementById("modalScanner").style.display = "flex";
    if (typeof Html5Qrcode !== "undefined") {
        html5QrScanner = new Html5Qrcode("reader");
        let lastCode = "";
        let lastTime = 0;
        html5QrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 220 },
            decodedText => {
                const now = Date.now();
                if (decodedText === lastCode && now - lastTime < 1500) return;
                lastCode = decodedText;
                lastTime = now;
                const found = stockMaster.find(s => s.code === decodedText || "ZIVO-" + s.id === decodedText);
                if (found) {
                    const existing = currentManualBillItems.find(i => i.name === found.name);
                    if (existing) { existing.qty += 1; existing.total = existing.qty * existing.price; }
                    else { currentManualBillItems.push({ name: found.name, qty: 1, price: found.price, total: found.price }); }
                    renderManualBillItemsList();
                    renderBillReceiptPreview();
                    if (!continuousScanMode) closeScannerModal();
                } else {
                    document.getElementById("itemAddName").value = decodedText;
                    closeScannerModal();
                }
            }
        ).catch(() => {});
    }
}

function closeScannerModal() {
    document.getElementById("modalScanner").style.display = "none";
    if (html5QrScanner) { html5QrScanner.stop().catch(() => {}); html5QrScanner = null; }
}

function openCalculatorModal() { document.getElementById("modalCalculator").style.display = "flex"; }
function closeCalculatorModal() { document.getElementById("modalCalculator").style.display = "none"; }
function calcAppend(val) { const s = document.getElementById("calcScreen"); s.value = s.value === "0" ? val : s.value + val; }
function calcClear() { document.getElementById("calcScreen").value = "0"; }
function calcCompute() {
    const expr = document.getElementById("calcScreen").value;
    if (!/^[0-9+\-*/.() ]+$/.test(expr)) { document.getElementById("calcScreen").value = "Error"; return; }
    try {
        const res = Function('"use strict"; return (' + expr + ')')();
        document.getElementById("calcScreen").value = Number.isFinite(res) ? res : "Error";
    } catch (e) {
        document.getElementById("calcScreen").value = "Error";
    }
}

function loadBusinessFields() {
    if (!activeAccount) return;
    if (document.getElementById("bizShopName")) document.getElementById("bizShopName").value = activeAccount.shopName || "";
    if (document.getElementById("bizOwnerName")) document.getElementById("bizOwnerName").value = activeAccount.ownerName || "";
    if (document.getElementById("bizGst")) document.getElementById("bizGst").value = activeAccount.gst || "";
    if (document.getElementById("bizPhone")) document.getElementById("bizPhone").value = activeAccount.phone || "";
    if (document.getElementById("bizAddress")) document.getElementById("bizAddress").value = activeAccount.address || "";
}

function saveBusinessProfile() {
    activeAccount = {
        ...activeAccount,
        shopName: document.getElementById("bizShopName").value.trim() || "Zivo Retail Store",
        ownerName: document.getElementById("bizOwnerName").value.trim(),
        gst: document.getElementById("bizGst").value.trim(),
        phone: document.getElementById("bizPhone").value.trim(),
        address: document.getElementById("bizAddress").value.trim()
    };
    db.setItem("account", activeAccount);
    document.getElementById("dashWelcome").innerText = "Welcome to Zivo Shop Helper - " + activeAccount.shopName;
    renderBillReceiptPreview();
    alert("Business details saved.");
}

function loadSettingsFields() {
    if (document.getElementById("cfgCurr")) document.getElementById("cfgCurr").value = shopConfig.currency || "₹";
    if (document.getElementById("cfgDefaultUpi")) document.getElementById("cfgDefaultUpi").value = shopConfig.upiId || "";
    if (document.getElementById("cfgFooterMsg")) document.getElementById("cfgFooterMsg").value = shopConfig.footerMsg || "Thank you for shopping with us!";
}

function saveConfig() {
    shopConfig.currency = document.getElementById("cfgCurr")?.value || "₹";
    shopConfig.upiId = document.getElementById("cfgDefaultUpi")?.value.trim() || "";
    shopConfig.footerMsg = document.getElementById("cfgFooterMsg")?.value || "Thank you for shopping with us!";
    db.setItem("config", shopConfig);
    updateDashStats();
    renderBillReceiptPreview();
}

function toggleThemeModeSetting(mode) {
    document.body.classList.toggle("light-mode", mode === "light");
    document.body.classList.toggle("dark-mode", mode !== "light");
}

function toggleDisplayModeSetting(mode) {
    if (mode === "mobile") document.body.classList.add("mobile-mode");
    else if (mode === "desktop") document.body.classList.remove("mobile-mode");
    else document.body.classList.toggle("mobile-mode", window.innerWidth <= 768);
}

function openAboutDevModal() { document.getElementById("modalAboutDev").style.display = "flex"; }
function closeAboutDevModal() { document.getElementById("modalAboutDev").style.display = "none"; }
function openMasterResetModal() { document.getElementById("modalResetConfirm").style.display = "flex"; }
function closeMasterResetModal() { document.getElementById("modalResetConfirm").style.display = "none"; }
function executeMasterReset() {
    if (document.getElementById("resetConfirmText").value.trim() !== "DELETE") {
        alert("Please type DELETE in capital letters to confirm.");
        return;
    }
    db.clearAll();
    location.reload();
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
}
