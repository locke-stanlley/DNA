(function () {
  "use strict";

  /* ================================================================
     API Layer
     ================================================================ */
  const API = {
    async get(url) {
      const res = await fetch(url);
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error("Server returned invalid JSON: " + text.slice(0, 160)); }
      if (!res.ok) throw new Error(data.error || data.message || "Request failed");
      return data;
    },
    async post(url, body) {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error("Server returned invalid JSON: " + text.slice(0, 160)); }
      if (!res.ok) throw new Error(data.error || data.message || "Request failed");
      return data;
    },
    health:       ()          => API.get("/api/health"),
    walletCreate: (body)      => API.post("/api/wallet/create", body),
    walletList:   (body)      => API.post("/api/wallet/list", body),
    walletImport: (body)      => API.post("/api/wallet/import", body),
    walletExport: (body)      => API.post("/api/wallet/export", body),
    balance:      (body)      => API.post("/api/account/balance", body),
    assetTransfer:(body)      => API.post("/api/asset/transfer", body),
    assetApprove: (body)      => API.post("/api/asset/approve", body),
    assetTransferFrom:(body)  => API.post("/api/asset/transferfrom", body),
    assetAllowance:(body)     => API.post("/api/asset/allowance", body),
    multisigAddr: (body)      => API.post("/api/multisig/address", body),
    nodeStart:    ()          => API.post("/api/node/start", {}),
    nodeStop:     ()          => API.post("/api/node/stop", {}),
    txTransfer:   (body)      => API.post("/api/transaction/transfer", body),
    txBuild:      (body)      => API.post("/api/transaction/build", body),
    txSign:       (body)      => API.post("/api/transaction/sign", body),
    txSend:       (body)      => API.post("/api/transaction/send", body),
    txShow:       (body)      => API.post("/api/transaction/show", body),
    txHistory:    ()          => API.get("/api/transaction/history"),
    contractDeploy:(body)     => API.post("/api/contract/deploy", body),
    contractInvoke:(body)     => API.post("/api/contract/invoke", body),
    contractList: ()          => API.get("/api/contract/list"),
    chainStatus:  ()          => API.get("/api/blockchain/status"),
    blockInfo:    (q)         => API.get("/api/block/" + encodeURIComponent(q)),
    txInfo:       (h)         => API.get("/api/tx/" + encodeURIComponent(h)),
    txStatus:     (h)         => API.get("/api/status/" + encodeURIComponent(h)),
    nodeLog:      (name)      => API.get("/api/node/" + name + "/log"),
    chainImport:  (body)      => API.post("/api/blockchain/import", body),
    chainExport:  (body)      => API.post("/api/blockchain/export", body),
  };

  /* ================================================================
     State
     ================================================================ */
  const State = {
    nodes: [],
    latestBlock: 0,
    networkOnline: false,
    walletReady: false,
    defaultAddress: "",
    refreshToken: 0,
  };

  /* ================================================================
     Helpers
     ================================================================ */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }
  function html(str) { const d = document.createElement("div"); d.innerHTML = str; return d.firstElementChild || d; }
  function esc(str) { const d = document.createElement("div"); d.textContent = str; return d.innerHTML; }
  function truncateAddr(addr, n) { n = n || 8; return addr ? addr.slice(0, n) + "…" + addr.slice(-n) : "—"; }
  function fmtTime() { return new Date().toLocaleTimeString(); }

  function showToast(msg, type) {
    type = type || "info";
    var stack = $(".toast-stack") || document.body.appendChild(html('<div class="toast-stack"></div>'));
    var t = html('<div class="toast ' + type + '"><span class="toast-dot"></span><span class="toast-msg">' + esc(msg) + '</span></div>');
    stack.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  /* ================================================================
     Render shell
     ================================================================ */
  function renderShell() {
    $("#app").innerHTML =
      '<div class="shell">' +
        '<aside class="sidebar">' +
          '<div class="brand">' +
            '<p class="brand-eyebrow">DNA Network</p>' +
            '<div class="brand-title">Control Center</div>' +
            '<p class="brand-sub">Operate the local DNA network from a clean, professional workspace.</p>' +
          '</div>' +
          '<div class="sidebar-status">' +
            '<span class="pill pill-online" id="sb-network">Network: online</span>' +
            '<span class="pill pill-idle" id="sb-nodes">Nodes: —</span>' +
            '<span class="pill pill-idle" id="sb-wallet">Wallet: idle</span>' +
          '</div>' +
          '<nav class="nav" id="sidebar-nav">' +
            '<a href="#/" data-route="/"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> Dashboard</a>' +
            '<a href="#/wallet" data-route="/wallet"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg> Wallet</a>' +
            '<a href="#/nodes" data-route="/nodes"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="12" r="2"/><line x1="7" y1="10.5" x2="10.5" y2="7"/><line x1="13.5" y1="7" x2="17" y2="10.5"/><line x1="7" y1="13.5" x2="10.5" y2="17"/><line x1="13.5" y1="17" x2="17" y2="13.5"/></svg> Nodes</a>' +
            '<a href="#/transactions" data-route="/transactions"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> Transactions</a>' +
            '<a href="#/contracts" data-route="/contracts"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> Contracts</a>' +
            '<a href="#/explorer" data-route="/explorer"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> Explorer</a>' +
          '</nav>' +
          '<div class="sidebar-footer">DNA v0.7.3-dev</div>' +
        '</aside>' +
        '<main class="main">' +
          '<div class="topbar">' +
            '<div class="topbar-left"><button class="menu-toggle" id="menu-toggle">&#9776;</button><span class="topbar-title" id="page-title">Dashboard</span></div>' +
            '<div class="topbar-right"><button class="btn btn-secondary btn-sm" id="global-refresh">Refresh</button></div>' +
          '</div>' +
          '<div class="content" id="view-container"></div>' +
        '</main>' +
      '</div>';

    $("#global-refresh").addEventListener("click", router);
    $("#menu-toggle").addEventListener("click", function () {
      $(".sidebar").classList.toggle("open");
    });
    $$(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        $(".sidebar").classList.remove("open");
      });
    });
  }

  /* ================================================================
     Router
     ================================================================ */
  function resolveRoute() {
    var hash = location.hash.replace("#", "") || "/";
    return hash;
  }

  function setActive(route) {
    $$(".nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === route);
    });
    var titles = {
      "/": "Dashboard",
      "/wallet": "Wallet",
      "/nodes": "Nodes",
      "/transactions": "Transactions",
      "/contracts": "Contracts",
      "/explorer": "Explorer",
    };
    $("#page-title").textContent = titles[route] || "Dashboard";
  }

  async function router() {
    var route = resolveRoute();
    setActive(route);
    var container = $("#view-container");
    if (!container) return;

    // refresh sidebar stats
    refreshSidebarStats();

    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading…</div>';

    try {
      switch (route) {
        case "/":              container.innerHTML = viewDashboard(); break;
        case "/wallet":        container.innerHTML = viewWallet(); break;
        case "/nodes":         container.innerHTML = viewNodes(); await loadNodes(); break;
        case "/transactions":  container.innerHTML = viewTransactions(); await loadHistoryInto("#history-list"); break;
        case "/contracts":     container.innerHTML = viewContracts(); await loadContractsInto("#contract-list"); break;
        case "/explorer":      container.innerHTML = viewExplorer(); break;
        default:               container.innerHTML = viewDashboard();
      }
    } catch (e) {
      container.innerHTML = '<div class="panel"><div class="empty-state"><div class="item-card-body"><div class="item-card-title">Navigation Error</div><div class="item-card-sub">' + esc(e.message) + '</p></div></div>';
    }
    // bind events after DOM is in place
    bindViewEvents();
  }

  async function refreshSidebarStats() {
    try {
      var data = await API.health();
      State.nodes = data.nodes || [];
      State.latestBlock = data.latestBlock || 0;
      State.networkOnline = data.networkOnline;
      State.walletReady = data.walletReady;
      updateSidebarStatus();
    } catch (e) { /* silent */ }
  }

  function updateSidebarStatus() {
    var net = $("#sb-network");
    var n = $("#sb-nodes");
    var w = $("#sb-wallet");
    if (!net) return;
    var online = State.nodes.filter(function (x) { return x.online; }).length;
    net.textContent = "Network: " + (State.networkOnline ? "online" : "offline");
    net.className = "pill " + (State.networkOnline ? "pill-online" : "pill-offline");
    n.textContent = "Nodes: " + online + "/" + State.nodes.length;
    n.className = "pill " + (online > 0 ? "pill-online" : "pill-offline");
    w.textContent = State.walletReady ? "Wallet: ready" : "Wallet: idle";
    w.className = "pill " + (State.walletReady ? "pill-ready" : "pill-idle");
  }

  window.addEventListener("hashchange", router);

  /* ================================================================
     View: Dashboard  (#/)
     ================================================================ */
  function viewDashboard() {
    (async function load() {
      try {
        var data = await API.health();
        State.nodes = data.nodes || [];
        State.latestBlock = data.latestBlock || 0;
        State.networkOnline = data.networkOnline;
        State.walletReady = data.walletReady;
        updateSidebarStatus();
        updateDashStats(data);
        updateDashNodes(data.nodes);
        updateDashHistory(data.history);
        updateDashContracts(data.contracts);
      } catch (e) {
        $("#view-container").innerHTML =
          '<div class="panel"><div class="empty-state"><div class="item-card-body"><div class="item-card-title">Connection Error</div><div class="item-card-sub">' + esc(e.message) + '</p><br/><button class="btn btn-primary" onclick="location.reload()">Retry</button></div></div>';
      }
    })();
    return '<div class="hero panel">' +
      '<div><p class="eyebrow" style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--primary)">Live network view</p><h2>Monitor and operate your DNA test network</h2><p style="color:var(--text-secondary);font-size:14px;margin:0">This workspace connects to the local DNA node processes and exposes real wallet, node, transaction, and contract actions.</p></div>' +
      '<button class="btn btn-primary" onclick="location.reload()">Refresh</button></div>' +
      '<div class="stats-grid" id="dash-stats">' +
        '<div class="stat-card"><span class="stat-label">Connected nodes</span><strong class="stat-value" id="stat-nodes">—</strong></div>' +
        '<div class="stat-card"><span class="stat-label">Latest block</span><strong class="stat-value" id="stat-block">—</strong></div>' +
        '<div class="stat-card"><span class="stat-label">Last updated</span><strong class="stat-value sm" id="stat-time">—</strong></div>' +
        '<div class="stat-card"><span class="stat-label">Wallet status</span><strong class="stat-value sm" id="stat-wallet">—</strong></div>' +
      '</div>' +
      '<div class="panel"><div class="panel-header"><div class="panel-header-text"><h3>Node Overview</h3></div><div class="node-grid" id="dash-nodes"></div></div>' +
      '<div class="panel"><div class="panel-header"><div class="panel-header-text"><h3>Recent Transactions</h3></div><div class="list" id="dash-history"></div></div>' +
      '<div class="panel"><div class="panel-header"><div class="panel-header-text"><h3>Deployed Contracts</h3></div><div class="list" id="dash-contracts"></div></div>';
  }

  function updateDashStats(data) {
    var ns = $("#stat-nodes"), nb = $("#stat-block"), nt = $("#stat-time"), nw = $("#stat-wallet");
    if (ns) ns.textContent = (data.nodes || []).length;
    if (nb) nb.textContent = data.latestBlock || "—";
    if (nt) nt.textContent = fmtTime();
    if (nw) { nw.textContent = data.walletReady ? "Ready" : "Idle"; nw.style.color = data.walletReady ? "var(--success)" : "var(--text-secondary)"; }
  }

  function updateDashNodes(nodes) {
    var el = $("#dash-nodes");
    if (!el) return;
    if (!nodes || !nodes.length) { el.innerHTML = '<div class="empty-state"><div class="item-card-body"><div class="item-card-title">No nodes available</div><div class="item-card-sub">Start the network from the Nodes page.</p></div>'; return; }
    el.innerHTML = nodes.map(function (n) {
      return '<div class="node-card ' + (n.online ? 'online' : 'offline') + '"><div class="node-card-name">' + esc(n.label) + '</div><div class="node-card-row"><span>RPC</span><span>' + esc(n.host) + ':' + n.rpcPort + '</span></div><div class="node-card-row"><span>REST</span><span>' + esc(n.host) + ':' + n.restPort + '</span></div><div class="node-card-height">' + (n.height || 0) + '</div><span class="pill ' + (n.online ? 'pill-online' : 'pill-offline') + '">' + (n.online ? 'Online' : 'Offline') + '</span></div>';
    }).join("");
  }

  function updateDashHistory(history) {
    var el = $("#dash-history");
    if (!el) return;
    if (!history || !history.length) { el.innerHTML = '<div class="empty-state"><p>No transactions recorded yet.</p></div>'; return; }
    el.innerHTML = history.map(function (h) { return '<div class="item-card"><div class="item-card-body"><div class="item-card-title">' + esc(h.type || "Transfer") + '</div><div class="item-card-sub">' + esc(h.summary || "") + '</div><div class="item-card-meta">' + esc(h.createdAt || "") + '</div></div>'; }).join("");
  }

  function updateDashContracts(contracts) {
    var el = $("#dash-contracts");
    if (!el) return;
    if (!contracts || !contracts.length) { el.innerHTML = '<div class="empty-state"><p>No contracts deployed yet.</p></div>'; return; }
    el.innerHTML = contracts.map(function (c) { return '<div class="item-card"><div class="item-card-body"><div class="item-card-title">' + esc(c.name || "Contract") + '</div><div class="item-card-sub">' + esc(c.address || "pending") + '</div><div class="item-card-meta">' + esc(c.createdAt || "") + '</div></div>'; }).join("");
  }

  /* ================================================================
     View: Wallet  (#/wallet)
     ================================================================ */
  function viewWallet() {
    return '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Wallet Access</h3><p>Create, unlock, import, or export a wallet file with real node-backed actions.</p></div>' +
      '<div class="tabs" id="wallet-tabs">' +
        '<button class="tab active" data-tab="w-create">Create</button>' +
        '<button class="tab" data-tab="w-unlock">Unlock</button>' +
        '<button class="tab" data-tab="w-import">Import</button>' +
        '<button class="tab" data-tab="w-export">Export</button>' +
      '</div>' +

      '<div class="tab-panel active" id="w-create">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="wc-path" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="wc-password" type="password" value="123456" /></div>' +
          '<div class="form-group"><label>Label</label><input id="wc-label" value="main" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-wc">Create wallet</button></div>' +
      '</div>' +

      '<div class="tab-panel" id="w-unlock">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="wu-path" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="wu-password" type="password" value="123456" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-wu">Unlock wallet</button></div>' +
      '</div>' +

      '<div class="tab-panel" id="w-import">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="wi-path" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="wi-password" type="password" value="123456" /></div>' +
          '<div class="form-group"><label>Source path</label><input id="wi-source" value="/workspaces/DNA/wallets/source_wallet.dat" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-wi">Import wallet</button></div>' +
      '</div>' +

      '<div class="tab-panel" id="w-export">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="we-path" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="we-password" type="password" value="123456" /></div>' +
          '<div class="form-group"><label>Export destination</label><input id="we-dest" value="/workspaces/DNA/wallets/exported_wallet.dat" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-we">Export wallet</button></div>' +
      '</div>' +

      '<div class="result-box" id="wallet-result">Wallet output will appear here.</div>' +
    '</div>';
  }

  /* ================================================================
     View: Nodes  (#/nodes)
     ================================================================ */
  function viewNodes() {
    return '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Node Management</h3><p>Inspect live node health and manage the test network.</p></div>' +
      '<div class="btn-group" style="margin-bottom:20px">' +
        '<button class="btn btn-primary" id="btn-start-nodes">Start network</button>' +
        '<button class="btn btn-danger" id="btn-stop-nodes">Stop network</button>' +
      '</div>' +
      '<div class="node-grid" id="node-cards"></div>' +
    '</div>' +
    '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Node Logs</h3><p>View the latest log output from a running node.</p></div>' +
      '<div class="btn-group" style="margin-bottom:12px">' +
        '<button class="btn btn-secondary node-log-btn" data-node="node1">Node 1</button>' +
        '<button class="btn btn-secondary node-log-btn" data-node="node2">Node 2</button>' +
        '<button class="btn btn-secondary node-log-btn" data-node="node3">Node 3</button>' +
        '<button class="btn btn-secondary node-log-btn" data-node="node4">Node 4</button>' +
      '</div>' +
      '<div class="log-viewer" id="node-log-viewer">Select a node to view its log.</div>' +
    '</div>';
  }

  async function loadNodes() {
    try {
      var data = await API.health();
      State.nodes = data.nodes || [];
      updateSidebarStatus();
      renderNodeCards(data.nodes);
    } catch (e) {
      $("#node-cards").innerHTML = '<div class="empty-state"><div class="item-card-body"><div class="item-card-title">Cannot load nodes</div><div class="item-card-sub">' + esc(e.message) + '</p></div>';
    }
  }

  function renderNodeCards(nodes) {
    var el = $("#node-cards");
    if (!el) return;
    if (!nodes || !nodes.length) { el.innerHTML = '<div class="empty-state"><div class="item-card-body"><div class="item-card-title">No nodes available</div><div class="item-card-sub">Click "Start network" to launch nodes.</p></div>'; return; }
    el.innerHTML = nodes.map(function (n) {
      return '<div class="node-card ' + (n.online ? 'online' : 'offline') + '"><div class="node-card-name">' + esc(n.label) + '</div><div class="node-card-row"><span>RPC</span><span>' + esc(n.host) + ':' + n.rpcPort + '</span></div><div class="node-card-row"><span>REST</span><span>' + esc(n.host) + ':' + n.restPort + '</span></div><div class="node-card-height">' + (n.height || 0) + '</div><span class="pill ' + (n.online ? 'pill-online' : 'pill-offline') + '">' + (n.online ? 'Online' : 'Offline') + '</span></div>';
    }).join("");
  }

  /* ================================================================
     View: Transactions  (#/transactions)
     ================================================================ */
  function viewTransactions() {
    return '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Send Transfer</h3><p>Build and send real transfers, and review recent transaction activity.</p></div>' +
      '<div class="tabs" id="tx-tabs">' +
        '<button class="tab active" data-tab="tx-simple">Quick Transfer</button>' +
        '<button class="tab" data-tab="tx-advanced">Advanced Build</button>' +
      '</div>' +

      '<div class="tab-panel active" id="tx-simple">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="tx-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="tx-password" type="password" value="123456" /></div>' +
          '<div class="form-group"><label>From address</label><input id="tx-from" placeholder="Address" /></div>' +
          '<div class="form-group"><label>To address</label><input id="tx-to" placeholder="Address" /></div>' +
          '<div class="form-group"><label>Amount</label><input id="tx-amount" value="1" /></div>' +
          '<div class="form-group"><label>Asset</label><select id="tx-asset"><option value="gas">GAS</option><option value="ont">ONT</option></select></div>' +
          '<div class="form-group"><label>RPC port</label><input id="tx-rpc" value="20336" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-tx-send">Send transfer</button></div>' +
      '</div>' +

      '<div class="tab-panel" id="tx-advanced">' +
        '<div class="tabs" style="border:none;margin-bottom:10px;">' +
          '<button class="tab active" data-subtab="atx-build">Build</button>' +
          '<button class="tab" data-subtab="atx-sign">Sign</button>' +
          '<button class="tab" data-subtab="atx-send">Send</button>' +
          '<button class="tab" data-subtab="atx-show">Inspect</button>' +
        '</div>' +
        '<div class="tab-panel active" id="atx-build">' +
          '<div class="form-grid">' +
            '<div class="form-group"><label>Wallet file</label><input id="atx-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
            '<div class="form-group"><label>Password</label><input id="atx-password" type="password" value="123456" /></div>' +
            '<div class="form-group"><label>From</label><input id="atx-from" placeholder="Address" /></div>' +
            '<div class="form-group"><label>To</label><input id="atx-to" placeholder="Address" /></div>' +
            '<div class="form-group"><label>Amount</label><input id="atx-amount" value="1" /></div>' +
            '<div class="form-group"><label>Asset</label><select id="atx-asset"><option value="gas">GAS</option><option value="ont">ONT</option></select></div>' +
            '<div class="form-group"><label>RPC port</label><input id="atx-rpc" value="20336" /></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-atx-build">Build transaction</button></div>' +
        '</div>' +
        '<div class="tab-panel" id="atx-sign">' +
          '<div class="form-grid cols-1">' +
            '<div class="form-group"><label>Wallet file</label><input id="stx-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
            '<div class="form-group"><label>Password</label><input id="stx-password" type="password" value="123456" /></div>' +
            '<div class="form-group"><label>Raw transaction (hex)</label><textarea id="stx-raw"></textarea></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-stx-sign">Sign transaction</button></div>' +
        '</div>' +
        '<div class="tab-panel" id="atx-send">' +
          '<div class="form-grid cols-1">' +
            '<div class="form-group"><label>Raw transaction (hex)</label><textarea id="sdtx-raw"></textarea></div>' +
            '<div class="form-group"><label>RPC port</label><input id="sdtx-rpc" value="20336" /></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-sdtx-send">Send raw transaction</button></div>' +
        '</div>' +
        '<div class="tab-panel" id="atx-show">' +
          '<div class="form-grid cols-1">' +
            '<div class="form-group"><label>Raw transaction (hex)</label><textarea id="shwtx-raw"></textarea></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-shwtx-show">Inspect transaction</button></div>' +
        '</div>' +
      '</div>' +

      '<div class="result-box" id="tx-result">Transfer output will appear here.</div>' +
    '</div>' +
    '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Transaction History</h3></div>' +
      '<button class="btn btn-secondary" id="btn-refresh-history" style="margin-bottom:12px">Refresh history</button>' +
      '<div class="list" id="history-list"></div>' +
    '</div>';
  }

  async function loadHistoryInto(selector) {
    try {
      var data = await API.txHistory();
      var items = data.history || [];
      var el = $(selector);
      if (!el) return;
      if (!items.length) { el.innerHTML = '<div class="empty-state"><p>No transactions recorded yet.</p></div>'; return; }
      el.innerHTML = items.map(function (h) { return '<div class="item-card"><div class="item-card-body"><div class="item-card-title">' + esc(h.type || "Transfer") + '</div><div class="item-card-sub">' + esc(h.summary || "") + '</div><div class="item-card-meta">' + esc(h.createdAt || "") + '</div></div>'; }).join("");
    } catch (e) {
      var el = $(selector);
      if (el) el.innerHTML = '<div class="item-card">' + esc(e.message) + '</div>';
    }
  }

  /* ================================================================
     View: Contracts  (#/contracts)
     ================================================================ */
  function viewContracts() {
    return '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Smart Contracts</h3><p>Deploy and invoke smart contracts from the live network.</p></div>' +
      '<div class="tabs" id="contract-tabs">' +
        '<button class="tab active" data-tab="c-deploy">Deploy</button>' +
        '<button class="tab" data-tab="c-invoke">Invoke</button>' +
      '</div>' +
      '<div class="tab-panel active" id="c-deploy">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="cd-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="cd-password" type="password" value="123456" /></div>' +
          '<div class="form-group"><label>Code path</label><input id="cd-code" value="/workspaces/DNA/wasmtest/contracts-rust/hello.wasm" /></div>' +
          '<div class="form-group"><label>RPC port</label><input id="cd-rpc" value="20336" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-cd">Deploy contract</button></div>' +
      '</div>' +
      '<div class="tab-panel" id="c-invoke">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="ci-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="ci-password" type="password" value="123456" /></div>' +
          '<div class="form-group"><label>Contract address</label><input id="ci-addr" placeholder="Address" /></div>' +
          '<div class="form-group"><label>Parameters</label><input id="ci-params" value="string:hello" /></div>' +
          '<div class="form-group"><label>RPC port</label><input id="ci-rpc" value="20336" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-ci">Invoke contract</button></div>' +
      '</div>' +
      '<div class="result-box" id="contract-result">Contract output will appear here.</div>' +
    '</div>' +
    '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Contract Explorer</h3></div>' +
      '<button class="btn btn-secondary" id="btn-refresh-contracts" style="margin-bottom:12px">Refresh explorer</button>' +
      '<div class="list" id="contract-list"></div>' +
    '</div>';
  }

  async function loadContractsInto(selector) {
    try {
      var data = await API.contractList();
      var contracts = data.contracts || [];
      var el = $(selector);
      if (!el) return;
      if (!contracts.length) { el.innerHTML = '<div class="empty-state"><p>No deployed contracts yet.</p></div>'; return; }
      el.innerHTML = contracts.map(function (c) { return '<div class="item-card"><div class="item-card-body"><div class="item-card-title">' + esc(c.name || "Contract") + '</div><div class="item-card-sub">' + (c.address ? truncateAddr(c.address, 12) : "pending") + '</div><div class="item-card-meta">' + esc(c.codePath || "") + '</div></div>'; }).join("");
    } catch (e) {
      var el = $(selector);
      if (el) el.innerHTML = '<div class="item-card">' + esc(e.message) + '</div>';
    }
  }

  /* ================================================================
     View: Explorer  (#/explorer)
     ================================================================ */
  function viewExplorer() {
    return '<div class="panel">' +
      '<div class="panel-header"><div class="panel-header-text"><h3>Blockchain Explorer</h3><p>Look up blocks, transactions, chain status, and account balances.</p></div>' +
      '<div class="tabs" id="explorer-tabs">' +
        '<button class="tab active" data-tab="ex-overview">Overview</button>' +
        '<button class="tab" data-tab="ex-block">Block</button>' +
        '<button class="tab" data-tab="ex-tx">Transaction</button>' +
        '<button class="tab" data-tab="ex-balance">Balance</button>' +
        '<button class="tab" data-tab="ex-assets">Assets</button>' +
        '<button class="tab" data-tab="ex-multisig">Multisig</button>' +
      '</div>' +

      '<div class="tab-panel active" id="ex-overview">' +
        '<div class="form-actions">' +
          '<button class="btn btn-primary" id="btn-ex-status">Refresh chain status</button>' +
        '</div>' +
        '<div class="result-box" id="ex-status-result" style="margin-top:18px">Click to load chain overview.</div>' +
      '</div>' +

      '<div class="tab-panel" id="ex-block">' +
        '<div class="form-grid cols-1">' +
          '<div class="form-group"><label>Block height or hash</label><input id="ex-block-query" placeholder="e.g. 1 or hash" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-ex-block">Look up block</button></div>' +
        '<div class="result-box" id="ex-block-result" style="margin-top:18px">Output will appear here.</div>' +
      '</div>' +

      '<div class="tab-panel" id="ex-tx">' +
        '<div class="tabs" style="border:none;margin-bottom:10px">' +
          '<button class="tab active" data-subtab="etx-info">Transaction info</button>' +
          '<button class="tab" data-subtab="etx-status">Transaction status</button>' +
        '</div>' +
        '<div class="tab-panel active" id="etx-info">' +
          '<div class="form-grid cols-1"><div class="form-group"><label>Transaction hash</label><input id="ex-tx-hash" placeholder="Tx hash" /></div></div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-ex-tx">Look up transaction</button></div>' +
          '<div class="result-box" id="ex-tx-result" style="margin-top:18px">Output will appear here.</div>' +
        '</div>' +
        '<div class="tab-panel" id="etx-status">' +
          '<div class="form-grid cols-1"><div class="form-group"><label>Transaction hash</label><input id="ex-status-hash" placeholder="Tx hash" /></div></div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-ex-status-tx">Check status</button></div>' +
          '<div class="result-box" id="ex-status-tx-result" style="margin-top:18px">Output will appear here.</div>' +
        '</div>' +
      '</div>' +

      '<div class="tab-panel" id="ex-balance">' +
        '<div class="form-grid">' +
          '<div class="form-group"><label>Wallet file</label><input id="bal-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
          '<div class="form-group"><label>Password</label><input id="bal-password" type="password" value="123456" /></div>' +
          '<div class="form-group"><label>Address</label><input id="bal-addr" placeholder="Address" /></div>' +
          '<div class="form-group"><label>RPC port</label><input id="bal-rpc" value="20336" /></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-bal">Lookup balance</button></div>' +
        '<div class="result-box" id="bal-result" style="margin-top:18px">Output will appear here.</div>' +
      '</div>' +

      '<div class="tab-panel" id="ex-assets">' +
        '<div class="tabs" style="border:none;margin-bottom:10px">' +
          '<button class="tab active" data-subtab="ast-transfer">Transfer</button>' +
          '<button class="tab" data-subtab="ast-approve">Approve</button>' +
          '<button class="tab" data-subtab="ast-transferfrom">TransferFrom</button>' +
          '<button class="tab" data-subtab="ast-allowance">Allowance</button>' +
        '</div>' +
        '<div class="tab-panel active" id="ast-transfer">' +
          '<div class="form-grid">' +
            '<div class="form-group"><label>Wallet file</label><input id="ast-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
            '<div class="form-group"><label>Password</label><input id="ast-password" type="password" value="123456" /></div>' +
            '<div class="form-group"><label>From</label><input id="ast-from" placeholder="Address" /></div>' +
            '<div class="form-group"><label>To</label><input id="ast-to" placeholder="Address" /></div>' +
            '<div class="form-group"><label>Amount</label><input id="ast-amount" value="1" /></div>' +
            '<div class="form-group"><label>Asset</label><select id="ast-asset"><option value="gas">GAS</option><option value="ont">ONT</option></select></div>' +
            '<div class="form-group"><label>RPC port</label><input id="ast-rpc" value="20336" /></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-ast-transfer">Transfer asset</button></div>' +
          '<div class="result-box" id="ast-transfer-result" style="margin-top:18px">Output will appear here.</div>' +
        '</div>' +
        '<div class="tab-panel" id="ast-approve">' +
          '<div class="form-grid">' +
            '<div class="form-group"><label>Wallet file</label><input id="apr-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
            '<div class="form-group"><label>Password</label><input id="apr-password" type="password" value="123456" /></div>' +
            '<div class="form-group"><label>From</label><input id="apr-from" placeholder="Address" /></div>' +
            '<div class="form-group"><label>To</label><input id="apr-to" placeholder="Address" /></div>' +
            '<div class="form-group"><label>Amount</label><input id="apr-amount" value="1" /></div>' +
            '<div class="form-group"><label>Asset</label><select id="apr-asset"><option value="ont">ONT</option><option value="gas">GAS</option></select></div>' +
            '<div class="form-group"><label>RPC port</label><input id="apr-rpc" value="20336" /></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-apr">Approve asset</button></div>' +
          '<div class="result-box" id="apr-result" style="margin-top:18px">Output will appear here.</div>' +
        '</div>' +
        '<div class="tab-panel" id="ast-transferfrom">' +
          '<div class="form-grid">' +
            '<div class="form-group"><label>Wallet file</label><input id="atf-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
            '<div class="form-group"><label>Password</label><input id="atf-password" type="password" value="123456" /></div>' +
            '<div class="form-group"><label>Sender</label><input id="atf-sender" placeholder="Address" /></div>' +
            '<div class="form-group"><label>From</label><input id="atf-from" placeholder="Address" /></div>' +
            '<div class="form-group"><label>To</label><input id="atf-to" placeholder="Address" /></div>' +
            '<div class="form-group"><label>Amount</label><input id="atf-amount" value="1" /></div>' +
            '<div class="form-group"><label>Asset</label><select id="atf-asset"><option value="ont">ONT</option><option value="gas">GAS</option></select></div>' +
            '<div class="form-group"><label>RPC port</label><input id="atf-rpc" value="20336" /></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-atf">Transfer from</button></div>' +
          '<div class="result-box" id="atf-result" style="margin-top:18px">Output will appear here.</div>' +
        '</div>' +
        '<div class="tab-panel" id="ast-allowance">' +
          '<div class="form-grid">' +
            '<div class="form-group"><label>Wallet file</label><input id="alw-wallet" value="/workspaces/DNA/wallets/local_wallet.dat" /></div>' +
            '<div class="form-group"><label>Password</label><input id="alw-password" type="password" value="123456" /></div>' +
            '<div class="form-group"><label>From</label><input id="alw-from" placeholder="Address" /></div>' +
            '<div class="form-group"><label>To</label><input id="alw-to" placeholder="Address" /></div>' +
            '<div class="form-group"><label>Asset</label><select id="alw-asset"><option value="ont">ONT</option><option value="gas">GAS</option></select></div>' +
            '<div class="form-group"><label>RPC port</label><input id="alw-rpc" value="20336" /></div>' +
          '</div>' +
          '<div class="form-actions"><button class="btn btn-primary" id="btn-alw">Check allowance</button></div>' +
          '<div class="result-box" id="alw-result" style="margin-top:18px">Output will appear here.</div>' +
        '</div>' +
      '</div>' +

      '<div class="tab-panel" id="ex-multisig">' +
        '<div class="form-grid cols-1">' +
          '<div class="form-group"><label>M (minimum signatures)</label><input id="ms-m" value="1" /></div>' +
          '<div class="form-group"><label>Public keys (comma-separated)</label><textarea id="ms-pubkeys" placeholder="pubkey1,pubkey2,..."></textarea></div>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" id="btn-ms">Generate multisig address</button></div>' +
        '<div class="result-box" id="ms-result" style="margin-top:18px">Output will appear here.</div>' +
      '</div>' +
    '</div>';
  }

  /* ================================================================
     Event binding  (called after every route render)
     ================================================================ */
  function bindViewEvents() {
    // Tabs
    $$(".tabs .tab[data-tab]").forEach(function (t) {
      t.removeEventListener("click", tabHandler);
      t.addEventListener("click", tabHandler);
    });
    // Subtabs (nested tabs with data-subtab)
    $$(".tabs .tab[data-subtab]").forEach(function (t) {
      t.removeEventListener("click", subtabHandler);
      t.addEventListener("click", subtabHandler);
    });

    // Wallet
    bind("btn-wc", walCreate);
    bind("btn-wu", walUnlock);
    bind("btn-wi", walImport);
    bind("btn-we", walExport);

    // Nodes
    bind("btn-start-nodes", nodeStart);
    bind("btn-stop-nodes", nodeStop);
    bind("btn-refresh-history", function () { loadHistoryInto("#history-list"); });
    bind("btn-refresh-contracts", function () { loadContractsInto("#contract-list"); });
    $$(".node-log-btn").forEach(function (b) {
      b.removeEventListener("click", nodeLogHandler);
      b.addEventListener("click", nodeLogHandler);
    });

    // Transactions simple
    bind("btn-tx-send", txSend);
    // Transactions advanced
    bind("btn-atx-build", txBuild);
    bind("btn-stx-sign", txSign);
    bind("btn-sdtx-send", txSendRaw);
    bind("btn-shwtx-show", txShow);

    // Contracts
    bind("btn-cd", cDeploy);
    bind("btn-ci", cInvoke);

    // Explorer
    bind("btn-ex-status", exChainStatus);
    bind("btn-ex-block", exBlock);
    bind("btn-ex-tx", exTx);
    bind("btn-ex-status-tx", exTxStatus);
    bind("btn-bal", exBalance);
    bind("btn-ast-transfer", exAssetTransfer);
    bind("btn-apr", exAssetApprove);
    bind("btn-atf", exAssetTransferFrom);
    bind("btn-alw", exAssetAllowance);
    bind("btn-ms", exMultisig);
  }

  function bind(id, fn) {
    var el = $("#" + id);
    if (el) { el.removeEventListener("click", fn); el.addEventListener("click", fn); }
  }

  function tabHandler(e) {
    var tab = e.currentTarget;
    var targetId = tab.getAttribute("data-tab");
    var parent = tab.parentElement;
    var container = parent.parentElement;
    parent.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
    tab.classList.add("active");
    container.querySelectorAll(":scope > .tab-panel").forEach(function (tc) { tc.classList.remove("active"); });
    var target = $("#" + targetId);
    if (target) target.classList.add("active");
  }

  function subtabHandler(e) {
    var tab = e.currentTarget;
    var targetId = tab.getAttribute("data-subtab");
    var parent = tab.parentElement;
    var container = parent.parentElement;
    parent.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
    tab.classList.add("active");
    container.querySelectorAll(":scope > .tab-panel").forEach(function (tc) { tc.classList.remove("active"); });
    var target = $("#" + targetId);
    if (target) target.classList.add("active");
  }

  function nodeLogHandler(e) {
    var name = e.currentTarget.getAttribute("data-node");
    var viewer = $("#node-log-viewer");
    if (viewer) viewer.textContent = "Loading " + name + " log …";
    API.nodeLog(name).then(function (data) {
      if (viewer) viewer.textContent = data.lines ? data.lines.join("\n") : "(empty)";
    }).catch(function (err) {
      if (viewer) viewer.textContent = "Error: " + err.message;
    });
  }

  /* ================================================================
     Action handlers
     ================================================================ */
  function setResult(id, ok, text) {
    var el = $("#" + id);
    if (!el) return;
    el.textContent = text;
    el.className = "result-box " + (ok ? "ok" : "err");
  }

  async function walCreate() {
    var r = $("#wallet-result");
    r.textContent = "Creating wallet…";
    try {
      var data = await API.walletCreate({ walletPath: val("wc-path"), password: val("wc-password"), label: val("wc-label") });
      r.textContent = JSON.stringify(data, null, 2);
      r.className = "result-box " + (data.ok ? "ok" : "err");
      await refreshSidebarStats();
    } catch (e) { r.textContent = e.message; r.className = "result-box err"; }
  }
  async function walUnlock() {
    var r = $("#wallet-result");
    r.textContent = "Unlocking wallet…";
    try {
      var data = await API.walletList({ walletPath: val("wu-path"), password: val("wu-password") });
      r.textContent = JSON.stringify(data, null, 2);
      r.className = "result-box " + (data.ok ? "ok" : "err");
      if (data.accounts && data.accounts.length) {
        State.defaultAddress = data.accounts[0].address;
        r.textContent += "\n\nPrimary address: " + State.defaultAddress;
      }
      await refreshSidebarStats();
    } catch (e) { r.textContent = e.message; r.className = "result-box err"; }
  }
  async function walImport() {
    var r = $("#wallet-result");
    r.textContent = "Importing wallet…";
    try {
      var data = await API.walletImport({ walletPath: val("wi-path"), password: val("wi-password"), sourcePath: val("wi-source") });
      r.textContent = JSON.stringify(data, null, 2);
      r.className = "result-box " + (data.ok ? "ok" : "err");
      await refreshSidebarStats();
    } catch (e) { r.textContent = e.message; r.className = "result-box err"; }
  }
  async function walExport() {
    var r = $("#wallet-result");
    r.textContent = "Exporting wallet…";
    try {
      var data = await API.walletExport({ walletPath: val("we-path"), password: val("we-password"), exportPath: val("we-dest") });
      r.textContent = JSON.stringify(data, null, 2);
      r.className = "result-box " + (data.ok ? "ok" : "err");
    } catch (e) { r.textContent = e.message; r.className = "result-box err"; }
  }

  async function nodeStart() {
    try { var data = await API.nodeStart(); showToast(data.message || "Nodes launching", "success"); } catch (e) { showToast(e.message, "error"); }
  }
  async function nodeStop() {
    try { var data = await API.nodeStop(); showToast(data.message || "Nodes stopping", "success"); } catch (e) { showToast(e.message, "error"); }
  }

  async function txSend() {
    setResult("tx-result", false, "Sending transfer…");
    try {
      var data = await API.txTransfer({ walletPath: val("tx-wallet"), password: val("tx-password"), from: val("tx-from"), to: val("tx-to"), amount: val("tx-amount"), asset: val("tx-asset"), rpcPort: valNum("tx-rpc") });
      setResult("tx-result", data.ok, JSON.stringify(data, null, 2));
      loadHistoryInto("#history-list");
      await refreshSidebarStats();
    } catch (e) { setResult("tx-result", false, e.message); }
  }
  async function txBuild() {
    setResult("tx-result", false, "Building transaction…");
    try {
      var data = await API.txBuild({ walletPath: val("atx-wallet"), password: val("atx-password"), from: val("atx-from"), to: val("atx-to"), amount: val("atx-amount"), asset: val("atx-asset"), rpcPort: valNum("atx-rpc") });
      setResult("tx-result", data.ok, JSON.stringify(data, null, 2));
    } catch (e) { setResult("tx-result", false, e.message); }
  }
  async function txSign() {
    setResult("tx-result", false, "Signing transaction…");
    try {
      var data = await API.txSign({ walletPath: val("stx-wallet"), password: val("stx-password"), rawTx: val("stx-raw") });
      setResult("tx-result", data.ok, JSON.stringify(data, null, 2));
    } catch (e) { setResult("tx-result", false, e.message); }
  }
  async function txSendRaw() {
    setResult("tx-result", false, "Sending raw transaction…");
    try {
      var data = await API.txSend({ rawTx: val("sdtx-raw"), rpcPort: valNum("sdtx-rpc") });
      setResult("tx-result", data.ok, JSON.stringify(data, null, 2));
      loadHistoryInto("#history-list");
    } catch (e) { setResult("tx-result", false, e.message); }
  }
  async function txShow() {
    setResult("tx-result", false, "Inspecting transaction…");
    try {
      var data = await API.txShow({ rawTx: val("shwtx-raw") });
      setResult("tx-result", data.ok, JSON.stringify(data, null, 2));
    } catch (e) { setResult("tx-result", false, e.message); }
  }

  async function cDeploy() {
    setResult("contract-result", false, "Deploying contract…");
    try {
      var data = await API.contractDeploy({ walletPath: val("cd-wallet"), password: val("cd-password"), codePath: val("cd-code"), rpcPort: valNum("cd-rpc") });
      setResult("contract-result", data.ok, JSON.stringify(data, null, 2));
      loadContractsInto("#contract-list");
      await refreshSidebarStats();
    } catch (e) { setResult("contract-result", false, e.message); }
  }
  async function cInvoke() {
    setResult("contract-result", false, "Invoking contract…");
    try {
      var data = await API.contractInvoke({ walletPath: val("ci-wallet"), password: val("ci-password"), contractAddress: val("ci-addr"), params: val("ci-params"), rpcPort: valNum("ci-rpc") });
      setResult("contract-result", data.ok, JSON.stringify(data, null, 2));
      loadHistoryInto("#history-list");
    } catch (e) { setResult("contract-result", false, e.message); }
  }

  async function exChainStatus() {
    setResult("ex-status-result", false, "Loading…");
    try { var data = await API.chainStatus(); setResult("ex-status-result", data.ok, JSON.stringify(data, null, 2)); } catch (e) { setResult("ex-status-result", false, e.message); }
  }
  async function exBlock() {
    setResult("ex-block-result", false, "Looking up block…");
    try { var data = await API.blockInfo(val("ex-block-query")); setResult("ex-block-result", data.ok, JSON.stringify(data, null, 2)); } catch (e) { setResult("ex-block-result", false, e.message); }
  }
  async function exTx() {
    setResult("ex-tx-result", false, "Looking up transaction…");
    try { var data = await API.txInfo(val("ex-tx-hash")); setResult("ex-tx-result", data.ok, JSON.stringify(data, null, 2)); } catch (e) { setResult("ex-tx-result", false, e.message); }
  }
  async function exTxStatus() {
    setResult("ex-status-tx-result", false, "Checking status…");
    try { var data = await API.txStatus(val("ex-status-hash")); setResult("ex-status-tx-result", data.ok, JSON.stringify(data, null, 2)); } catch (e) { setResult("ex-status-tx-result", false, e.message); }
  }
  async function exBalance() {
    setResult("bal-result", false, "Querying balance…");
    try { var data = await API.balance({ address: val("bal-addr"), walletPath: val("bal-wallet"), password: val("bal-password"), rpcPort: valNum("bal-rpc") }); setResult("bal-result", data.ok, JSON.stringify(data, null, 2)); } catch (e) { setResult("bal-result", false, e.message); }
  }
  async function exAssetTransfer() {
    setResult("ast-transfer-result", false, "Transferring asset…");
    try { var data = await API.assetTransfer({ walletPath: val("ast-wallet"), password: val("ast-password"), from: val("ast-from"), to: val("ast-to"), amount: val("ast-amount"), asset: val("ast-asset"), rpcPort: valNum("ast-rpc") }); setResult("ast-transfer-result", data.ok, JSON.stringify(data, null, 2)); loadHistoryInto("#history-list"); } catch (e) { setResult("ast-transfer-result", false, e.message); }
  }
  async function exAssetApprove() {
    setResult("apr-result", false, "Approving asset…");
    try { var data = await API.assetApprove({ walletPath: val("apr-wallet"), password: val("apr-password"), from: val("apr-from"), to: val("apr-to"), amount: val("apr-amount"), asset: val("apr-asset"), rpcPort: valNum("apr-rpc") }); setResult("apr-result", data.ok, JSON.stringify(data, null, 2)); loadHistoryInto("#history-list"); } catch (e) { setResult("apr-result", false, e.message); }
  }
  async function exAssetTransferFrom() {
    setResult("atf-result", false, "Transferring from…");
    try { var data = await API.assetTransferFrom({ walletPath: val("atf-wallet"), password: val("atf-password"), sender: val("atf-sender"), from: val("atf-from"), to: val("atf-to"), amount: val("atf-amount"), asset: val("atf-asset"), rpcPort: valNum("atf-rpc") }); setResult("atf-result", data.ok, JSON.stringify(data, null, 2)); loadHistoryInto("#history-list"); } catch (e) { setResult("atf-result", false, e.message); }
  }
  async function exAssetAllowance() {
    setResult("alw-result", false, "Checking allowance…");
    try { var data = await API.assetAllowance({ walletPath: val("alw-wallet"), password: val("alw-password"), from: val("alw-from"), to: val("alw-to"), asset: val("alw-asset"), rpcPort: valNum("alw-rpc") }); setResult("alw-result", data.ok, JSON.stringify(data, null, 2)); } catch (e) { setResult("alw-result", false, e.message); }
  }
  async function exMultisig() {
    setResult("ms-result", false, "Generating multisig address…");
    try { var data = await API.multisigAddr({ m: val("ms-m"), pubkeys: val("ms-pubkeys") }); setResult("ms-result", data.ok, JSON.stringify(data, null, 2)); } catch (e) { setResult("ms-result", false, e.message); }
  }

  /* ================================================================
     Helpers
     ================================================================ */
  function val(id) { var el = $("#" + id); return el ? el.value : ""; }
  function valNum(id) { return parseInt(val(id), 10) || 0; }

  /* ================================================================
     Init
     ================================================================ */
  renderShell();
  router();

})();
