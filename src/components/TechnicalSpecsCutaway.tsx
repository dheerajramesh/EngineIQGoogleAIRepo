import React from "react";
import { EngineeringSpecsSheet } from "./EngineeringSpecsSheet";
import { TechnicalCutaway } from "./TechnicalCutaway";
import { PartId } from "../types";

interface TechnicalSpecsCutawayProps {
  selectedPartId: PartId | null;
  onSelectPart: (partId: PartId) => void;
  onOpenCitation: (docId: string) => void;
  onSwitchTo3D: () => void;
}

export function TechnicalSpecsCutaway({
  selectedPartId,
  onSelectPart,
  onOpenCitation,
  onSwitchTo3D,
}: TechnicalSpecsCutawayProps) {
  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto">
      <div className="flex-none min-h-[300px] border border-slate-700 rounded-xl overflow-hidden bg-[#090d16]">
        <EngineeringSpecsSheet
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
          onOpenCitation={onOpenCitation}
          onSwitchTo3D={onSwitchTo3D}
        />
      </div>
    </div>
  );
}
