import TeamAdmin from "@/components/admin/TeamAdmin";
import EnterCustomer from "@/components/admin/EnterCustomer";

export default function AdminTeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team & access</h1>
        <p className="mt-1 text-sm text-ink-2">
          Manage your internal platform team. Only the Platform Owner and Admins can add or
          remove staff.
        </p>
      </div>
      <TeamAdmin />
      <EnterCustomer />
    </div>
  );
}
