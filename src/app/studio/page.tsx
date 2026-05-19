import { Metadata } from "next";
import CanvasEditor from "@/components/studio/CanvasEditor";

export const metadata: Metadata = {
  title: "Design Studio | CSC Billing",
  description: "Create posters, layouts, and graphics locally.",
};

export default function StudioPage() {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Design Studio</h1>
        <p className="text-muted-foreground text-sm">
          Create layouts, posters, and social graphics inspired by Avnac.
        </p>
      </div>
      
      <div className="flex-1 min-h-[600px] border border-border rounded-xl overflow-hidden bg-surface">
        <CanvasEditor />
      </div>
    </div>
  );
}
