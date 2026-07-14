with open('styles.css', 'r') as f:
    content = f.read()

OLD = """/* ── Sidebar ────────────────────────────────────────────────────────── */
.sidebar {
  width: var(--sidebar-w);
  background: var(--text);          /* black sidebar */
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
  flex-shrink: 0;
}

.sidebar-brand {
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.sidebar-brand-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(255,255,255,.4);
  margin-bottom: 4px;
}
.sidebar-brand-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -.2px;
}
.sidebar-brand-sub {
  font-size: 11.5px;
  color: rgba(255,255,255,.4);
  margin-top: 3px;
  line-height: 1.4;
}

.sidebar-status {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* Status pills on dark sidebar */
.s-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,.5);
  padding: 2px 0;
}
.s-pill::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(255,255,255,.2);
}
.s-pill.online  { color: #6ee7b7; }
.s-pill.online::before  { background: #6ee7b7; box-shadow: 0 0 0 2px rgba(110,231,183,.25); animation: blink 2s infinite; }
.s-pill.offline { color: #fca5a5; }
.s-pill.offline::before { background: #fca5a5; }
.s-pill.ready   { color: rgba(255,255,255,.8); }
.s-pill.ready::before   { background: rgba(255,255,255,.8); }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.5} }

/* Nav */
.sidebar-nav {
  flex: 1;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sidebar-nav-section {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: rgba(255,255,255,.25);
  padding: 10px 8px 4px;
}
.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--r);
  color: rgba(255,255,255,.5);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: background .1s, color .1s;
}
.sidebar-nav a:hover { background: rgba(255,255,255,.07); color: rgba(255,255,255,.85); }
.sidebar-nav a.active { background: rgba(255,255,255,.12); color: #fff; font-weight: 600; }
.sidebar-nav a svg { width: 16px; height: 16px; flex-shrink: 0; opacity: .6; }
.sidebar-nav a.active svg { opacity: 1; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,.08);
  font-size: 11px;
  color: rgba(255,255,255,.25);
  font-family: var(--mono);
}"""

NEW = """/* ── Sidebar ────────────────────────────────────────────────────────── */
.sidebar {
  width: var(--sidebar-w);
  background: #111;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  z-index: 100;
  flex-shrink: 0;
  transition: width .22s cubic-bezier(.4,0,.2,1);
}
.sidebar.collapsed { width: 56px; }

/* top row: brand + collapse button */
.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 10px 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
  min-height: 56px;
  overflow: hidden;
}

/* brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}
.sidebar-brand-logo {
  width: 28px;
  height: 28px;
  border-radius: var(--r);
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.15);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: -.5px;
}
.sidebar-brand-text { overflow: hidden; }
.sidebar-brand-eyebrow {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(255,255,255,.35);
  white-space: nowrap;
}
.sidebar-brand-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -.2px;
  white-space: nowrap;
}

/* collapse button */
.sidebar-collapse-btn {
  width: 26px;
  height: 26px;
  border-radius: var(--r-sm);
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background .12s, color .12s, transform .22s cubic-bezier(.4,0,.2,1);
  padding: 0;
}
.sidebar-collapse-btn:hover { background: rgba(255,255,255,.12); color: #fff; }
.sidebar-collapse-btn svg { width: 14px; height: 14px; }
.sidebar.collapsed .sidebar-collapse-btn { transform: rotate(180deg); }

/* hide text when collapsed */
.sidebar.collapsed .sidebar-brand-text,
.sidebar.collapsed .sidebar-status,
.sidebar.collapsed .nav-label,
.sidebar.collapsed .sidebar-footer .nav-label { display: none; }
.sidebar.collapsed .sidebar-footer-dot { display: flex; }

/* status pills */
.sidebar-status {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  overflow: hidden;
}
.s-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,.45);
  padding: 2px 0;
  white-space: nowrap;
}
.s-pill::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(255,255,255,.2);
}
.s-pill.online  { color: #6ee7b7; }
.s-pill.online::before  { background: #6ee7b7; box-shadow: 0 0 0 2px rgba(110,231,183,.2); animation: blink 2s infinite; }
.s-pill.offline { color: #fca5a5; }
.s-pill.offline::before { background: #fca5a5; }
.s-pill.ready   { color: rgba(255,255,255,.85); }
.s-pill.ready::before   { background: rgba(255,255,255,.85); }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }

/* nav */
.sidebar-nav {
  flex: 1;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar-nav::-webkit-scrollbar { width: 3px; }
.sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--r);
  color: rgba(255,255,255,.45);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  transition: background .12s, color .12s;
}
.sidebar-nav a svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  opacity: .55;
  transition: opacity .12s;
}
.sidebar-nav a:hover { background: rgba(255,255,255,.07); color: rgba(255,255,255,.9); }
.sidebar-nav a:hover svg { opacity: .9; }
.sidebar-nav a.active { background: rgba(255,255,255,.11); color: #fff; font-weight: 600; }
.sidebar-nav a.active svg { opacity: 1; }
.sidebar-nav a.active::before {
  content: "";
  position: absolute;
  left: 0; top: 6px; bottom: 6px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: #fff;
}

/* icon-only mode when collapsed */
.sidebar.collapsed .sidebar-nav a {
  justify-content: center;
  padding: 9px 0;
  overflow: visible;
}
.sidebar.collapsed .sidebar-nav a::after {
  content: attr(data-label);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: #222;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--r);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity .12s;
  box-shadow: var(--shadow-md);
  z-index: 200;
  border: 1px solid rgba(255,255,255,.1);
}
.sidebar.collapsed .sidebar-nav a:hover::after { opacity: 1; }

/* footer */
.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,.07);
  font-size: 11px;
  color: rgba(255,255,255,.22);
  font-family: var(--mono);
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sidebar-footer-dot {
  display: none;
  width: 22px;
  height: 22px;
  border-radius: var(--r-sm);
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.3);
  font-size: 11px;
  font-weight: 800;
  align-items: center;
  justify-content: center;
}"""

if OLD in content:
    content = content.replace(OLD, NEW)
    with open('styles.css', 'w') as f:
        f.write(content)
    print("OK")
else:
    print("NOT FOUND")
