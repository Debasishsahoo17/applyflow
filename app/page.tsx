"use client";

import { useEffect, useMemo, useState } from "react";

type Status =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Saved";

type Application = {
  id: string;
  company: string;
  role: string;
  location: string;
  date: string;
  status: Status;
  color: string;
};

const statusToDb: Record<Status, string> = {
  Saved: "WISHLIST", Applied: "APPLIED", Screening: "ASSESSMENT",
  Interview: "INTERVIEW", Offer: "OFFER", Rejected: "REJECTED",
};
const statusFromDb: Record<string, Status> = {
  WISHLIST: "Saved", APPLIED: "Applied", ASSESSMENT: "Screening",
  INTERVIEW: "Interview", OFFER: "Offer", REJECTED: "Rejected",
  WITHDRAWN: "Rejected",
};
type DbApplication = {
  id: string;
  jobTitle: string;
  status: string;
  location: string | null;
  createdAt: string;
  company: { name: string };
};
function fromDb(item: DbApplication): Application {
  return {
    id: item.id,
    company: item.company.name,
    role: item.jobTitle,
    location: item.location || "Location not specified",
    date: new Date(item.createdAt).toLocaleDateString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
    }),
    status: statusFromDb[item.status] ?? "Saved",
    color: "#64748b",
  };
}

const statusStyles: Record<Status, string> = {
  Applied: "bg-blue-50 text-blue-700 ring-blue-200",
  Screening: "bg-violet-50 text-violet-700 ring-violet-200",
  Interview: "bg-amber-50 text-amber-800 ring-amber-200",
  Offer: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  Saved: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

const navigation = [
  { label: "Overview", icon: "▦" },
  { label: "Applications", icon: "▤" },
  { label: "Interview prep", icon: "◷" },
  { label: "Companies", icon: "▣" },
  { label: "Calendar", icon: "▦" },
];

export default function Home() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeNav, setActiveNav] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Status>("Applied");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/applications", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load applications");
        const data: { success: boolean; applications: DbApplication[] } = await response.json();
        if (!data.success || !Array.isArray(data.applications)) throw new Error("Invalid API response");
        if (active) setApplications(data.applications.map(fromDb));
      } catch (error) {
        console.error(error);
        if (active) setNotice("Could not load applications from PostgreSQL.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function updateStatus(id: string, nextStatus: Status) {
    try {
      const response = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: statusToDb[nextStatus] }),
      });
      if (!response.ok) throw new Error("Status update failed");
      const data: { success: boolean; application: DbApplication } = await response.json();
      if (!data.success) throw new Error("Status update failed");
      setApplications(current => current.map(app => app.id === id ? fromDb(data.application) : app));
      setNotice("Status saved to database.");
    } catch (error) {
      console.error(error);
      setNotice("Status update failed. Please try again.");
    }
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        `${app.company} ${app.role} ${app.location}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesFilter = filter === "All" || app.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [applications, search, filter]);

  const count = (status: Status) =>
    applications.filter((app) => app.status === status).length;

  async function addApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.trim(),
          jobTitle: role.trim(),
          location: location.trim() || null,
          status: statusToDb[status],
        }),
      });
      const data: { success: boolean; application?: DbApplication; error?: string } = await response.json();
      if (!response.ok || !data.success || !data.application) {
        throw new Error(data.error || "Could not save application");
      }
      setApplications(current => [fromDb(data.application!), ...current]);
      setCompany("");
      setRole("");
      setLocation("");
      setStatus("Applied");
      setShowModal(false);
      setNotice("Application saved to PostgreSQL.");
    } catch (error) {
      console.error(error);
      setNotice(error instanceof Error ? error.message : "Could not save application.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="flex min-h-screen">
        {mobileMenu && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-950/30 md:hidden"
            onClick={() => setMobileMenu(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-[78px] items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-200">
              A
            </div>
            <div>
              <p className="text-[19px] font-bold tracking-tight">ApplyFlow</p>
              <p className="text-[11px] text-slate-500">YOUR CAREER, ORGANIZED</p>
            </div>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
              Workspace
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveNav(item.label);
                    setMobileMenu(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${
                    activeNav === item.label
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="w-5 text-center text-lg">{item.icon}</span>
                  {item.label}
                  {item.label === "Applications" && (
                    <span className="ml-auto rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-500">
                      {applications.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8 px-4">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
              Preferences
            </p>
            <button
              onClick={() => setNotice("Settings will be available when accounts are implemented.")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] text-slate-600 hover:bg-slate-50"
            >
              <span className="w-5 text-center text-lg">⚙</span> Settings
            </button>
            <button
              onClick={() => setNotice("Help documentation will be added soon.")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] text-slate-600 hover:bg-slate-50"
            >
              <span className="w-5 text-center text-lg">?</span> Help & support
            </button>
          </div>

          <div className="mt-auto border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                JD
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Job Seeker</p>
                <p className="text-xs text-slate-500">Personal workspace</p>
              </div>
              <span className="ml-auto text-slate-400">···</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                onClick={() => setMobileMenu(true)}
                className="rounded-lg border border-slate-200 px-3 py-2 md:hidden"
              >
                ☰
              </button>
              <div>
                <p className="text-[11px] text-slate-500">Workspace / {activeNav}</p>
                <h1 className="text-lg font-bold tracking-tight">{activeNav}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:block">
                Your career dashboard
              </span>
              <button
                onClick={() => setShowModal(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 sm:text-sm"
              >
                <span className="mr-1">+</span> Add application
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] p-4 md:p-8">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm text-slate-500">Sunday, October 18, 2026</p>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Keep your career moving.
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Every application is a step toward your next opportunity.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 sm:block"
              >
                + Track a new role
              </button>
            </div>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total applications", value: applications.length, icon: "↗", tone: "bg-indigo-50 text-indigo-700", detail: "Roles in your pipeline" },
                { label: "Interviews", value: count("Interview"), icon: "◷", tone: "bg-amber-50 text-amber-700", detail: "In interview stage" },
                { label: "Offers received", value: count("Offer"), icon: "✦", tone: "bg-emerald-50 text-emerald-700", detail: "Offers in your pipeline" },
                { label: "Awaiting response", value: count("Applied") + count("Screening"), icon: "◌", tone: "bg-sky-50 text-sky-700", detail: "Applied or screening" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-[13px] font-medium text-slate-500">{metric.label}</p>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${metric.tone}`}>
                      {metric.icon}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight">{metric.value}</p>
                  <p className="mt-2 text-xs text-slate-400">{metric.detail}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">Application activity</h3>
                    <p className="mt-1 text-xs text-slate-500">Your current application pipeline</p>
                  </div>
                  <button
                    onClick={() => setActiveNav("Applications")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View all →
                  </button>
                </div>

                <div className="mt-7 space-y-5">
                  {[
                    { label: "Applied", total: count("Applied"), color: "bg-blue-500" },
                    { label: "Screening", total: count("Screening"), color: "bg-violet-500" },
                    { label: "Interview", total: count("Interview"), color: "bg-amber-400" },
                    { label: "Offer", total: count("Offer"), color: "bg-emerald-500" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="font-medium text-slate-600">{item.label}</span>
                        <span className="font-semibold text-slate-800">{item.total}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${item.color}`}
                          style={{
                            width: `${applications.length ? (item.total / applications.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <p className="text-sm font-semibold text-indigo-950">Small steps add up.</p>
                  <p className="mt-1 text-xs leading-5 text-indigo-800">
                    Keep your application statuses updated to understand where your job search stands.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Upcoming priorities</h3>
                    <p className="mt-1 text-xs text-slate-500">Things to keep an eye on</p>
                  </div>
                  <span className="text-xl text-slate-400">◷</span>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">↗</div>
                    <div>
                      <p className="text-sm font-semibold">Prepare for interviews</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {count("Interview")} application(s) in the interview stage.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">✉</div>
                    <div>
                      <p className="text-sm font-semibold">Follow up with recruiters</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Review applications awaiting a response.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
                  >
                    + Add another opportunity
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:p-6">
                <div>
                  <h3 className="font-bold">Recent applications</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Manage and review your tracked opportunities.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search companies or roles..."
                    aria-label="Search applications"
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 sm:w-60"
                  />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Filter by status"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="All">All statuses</option>
                    {(["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected"] as Status[]).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Company / Role</th>
                      <th className="px-4 py-4">Date added</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Update status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="transition hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                              style={{ backgroundColor: app.color }}
                            >
                              {app.company.slice(0, 1)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{app.company}</p>
                              <p className="mt-1 text-xs text-slate-500">{app.role}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{app.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">{app.date}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[app.status]}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <select
                            aria-label={`Update ${app.company} status`}
                            value={app.status}
                            onChange={(e) => {
                              const nextStatus = e.target.value as Status;
                              void updateStatus(app.id, nextStatus);
                            }}
                            className="max-w-[125px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400"
                          >
                            {(["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected"] as Status[]).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {filteredApplications.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                          {loading ? "Loading applications..." : "No applications match your search. Try another filter or add a new application."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
                <span>Showing {filteredApplications.length} of {applications.length} applications</span>
                <button onClick={() => { setSearch(""); setFilter("All"); }} className="font-semibold text-indigo-600 hover:text-indigo-800">
                  Clear filters
                </button>
              </div>
            </section>

            <footer className="flex flex-col justify-between gap-2 py-7 text-xs text-slate-400 sm:flex-row">
              <p>© 2026 ApplyFlow · Your job search, in one place.</p>
              <p>Local development preview · PostgreSQL data</p>
            </footer>
          </div>
        </main>
      </div>

      {notice && (
        <div role="status" className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-xl bg-slate-900 px-5 py-3 text-sm text-white shadow-xl">
          {notice}
          <button onClick={() => setNotice("")} className="ml-4 text-slate-300" aria-label="Dismiss notification">✕</button>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 id="modal-title" className="text-xl font-bold">Track an application</h2>
                <p className="mt-1 text-sm text-slate-500">Add a role to your application pipeline.</p>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowModal(false)} className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={addApplication} className="space-y-4">
              <div>
                <label htmlFor="company" className="mb-1.5 block text-sm font-medium">Company name *</label>
                <input id="company" required maxLength={100} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Stripe" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label htmlFor="role" className="mb-1.5 block text-sm font-medium">Job title *</label>
                <input id="role" required maxLength={150} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Engineer" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label htmlFor="location" className="mb-1.5 block text-sm font-medium">Location / work mode</label>
                <input id="location" maxLength={150} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote · India" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Current status</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
                  {(["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected"] as Status[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving..." : "Save application"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}