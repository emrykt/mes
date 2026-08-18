"use client";

import { Mail, Trash2 } from "lucide-react";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import { Card, Table, Td, Th } from "@/components/ui";

function Panel() {
  const { snap, dispatch } = useDemo();
  if (!snap) return <p className="text-sm text-muted">Loading…</p>;
  const leads = snap.leads ?? [];

  return (
    <Card
      title="Demo requests"
      subtitle={leads.length ? `${leads.length} submitted from the homepage form` : "Submissions from the homepage demo-request form appear here."}
      padded={false}
    >
      {leads.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">No requests yet.</p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Company</Th>
                <Th>Message</Th>
                <Th align="right" />
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap text-ink-2">
                    {new Date(l.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Td>
                  <Td className="font-medium">{l.name}</Td>
                  <Td>
                    <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-accent-strong hover:underline">
                      <Mail className="size-3.5" />
                      {l.email}
                    </a>
                  </Td>
                  <Td className="text-ink-2">{l.company || "—"}</Td>
                  <Td className="text-ink-2">
                    <span className="block max-w-xs truncate" title={l.message}>{l.message || "—"}</span>
                  </Td>
                  <Td align="right">
                    <button
                      onClick={() => dispatch({ type: "deleteLead", id: l.id })}
                      className="rounded-lg p-1.5 text-muted hover:bg-neutral-soft hover:text-critical-text"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}

export default function LeadsPanel() {
  return (
    <DemoProvider>
      <Panel />
    </DemoProvider>
  );
}
