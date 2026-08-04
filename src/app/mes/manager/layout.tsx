import MesManagerShell from "@/components/mes/MesManagerShell";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MesManagerShell>{children}</MesManagerShell>;
}
