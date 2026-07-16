"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Alert, Tabs, SectionTitle, Badge } from "@/components/ui";
import { Plus, Trash2, Copy, User, Search, Download, Upload } from "lucide-react";
import { shortAddr } from "@/lib/format";
import Link from "next/link";

interface Contact { address: string; label: string; addedAt: string; }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");
  const [tab, setTab] = useState("book");

  const load = async () => {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.addresses || []);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, label: label || address.slice(0, 8) }),
    });
    const data = await res.json();
    setMsgType(data.ok ? "success" : "error");
    setMsg(data.ok ? "Contact added" : data.error || "Failed");
    if (data.ok) { setAddress(""); setLabel(""); load(); }
  };

  const remove = async (addr: string) => {
    await fetch(`/api/contacts?address=${encodeURIComponent(addr)}`, { method: "DELETE" });
    load();
  };

  const filtered = contacts.filter((c) =>
    !search || c.label.toLowerCase().includes(search.toLowerCase()) || c.address.includes(search)
  );

  const exportBook = () => {
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dna-contacts.json"; a.click();
  };

  return (
    <div>
      <Header title="Contacts" subtitle="Address book for quick transfers & references" />

      <Tabs tabs={[
        { id: "book", label: "Address Book" },
        { id: "add", label: "Add Contact" },
        { id: "import", label: "Import / Export" },
      ]} active={tab} onChange={setTab} />

      {msg && <div className="mt-4"><Alert type={msgType} message={msg} /></div>}

      <div className="mt-6">
        {tab === "book" && (
          <>
            <div className="mb-4 relative max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dna-muted" />
              <input className="dna-input pl-11" placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <div key={c.address} className="dna-card group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-dna-accent/10">
                        <User className="h-5 w-5 text-dna-accent" />
                      </div>
                      <div>
                        <p className="font-bold">{c.label}</p>
                        <p className="font-mono text-xs text-dna-muted">{shortAddr(c.address)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => navigator.clipboard.writeText(c.address)} className="p-2 text-dna-muted hover:text-dna-accent"><Copy className="h-4 w-4" /></button>
                      <button onClick={() => remove(c.address)} className="p-2 text-dna-muted hover:text-dna-red"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="mt-3 break-all font-mono text-[10px] text-dna-muted">{c.address}</p>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/transactions?to=${c.address}`} className="dna-btn-secondary text-xs py-1.5 px-3">Send GAS</Link>
                    <Badge variant="neutral">{new Date(c.addedAt).toLocaleDateString()}</Badge>
                  </div>
                </div>
              ))}
              {!filtered.length && <p className="col-span-full py-12 text-center text-dna-muted">No contacts found</p>}
            </div>
          </>
        )}

        {tab === "add" && (
          <div className="dna-card max-w-lg space-y-4">
            <SectionTitle title="Add New Contact" />
            <div><label className="text-xs text-dna-muted">Address</label><input className="dna-input mt-1 font-mono text-sm" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ARDRC7826okF5FqoADoh433upmnhoahSTq" /></div>
            <div><label className="text-xs text-dna-muted">Label</label><input className="dna-input mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Alice" /></div>
            <button onClick={add} className="dna-btn-primary w-full"><Plus className="h-4 w-4" /> Add Contact</button>
          </div>
        )}

        {tab === "import" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-2xl">
            <div className="dna-card space-y-4">
              <SectionTitle title="Export" />
              <p className="text-sm text-dna-muted">Download your address book as JSON.</p>
              <button onClick={exportBook} className="dna-btn-secondary w-full"><Download className="h-4 w-4" /> Export JSON</button>
            </div>
            <div className="dna-card space-y-4">
              <SectionTitle title="Import" />
              <p className="text-sm text-dna-muted">Import contacts via API or add manually.</p>
              <button onClick={() => setTab("add")} className="dna-btn-secondary w-full"><Upload className="h-4 w-4" /> Add Manually</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
