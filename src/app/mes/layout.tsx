import { DemoProvider } from "@/components/demo/DemoProvider";

export default function MesLayout({ children }: { children: React.ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
