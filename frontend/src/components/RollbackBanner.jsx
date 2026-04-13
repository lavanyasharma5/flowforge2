import { AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { useState } from "react";

export default function RollbackBanner({ onRollback, status }) {
  const [confirming, setConfirming] = useState(false);
  const [rolling, setRolling] = useState(false);
  const isRollingBack = status === "rolling_back";
  const isRolledBack = status === "rolled_back";

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setRolling(true);
    await onRollback();
    setRolling(false);
    setConfirming(false);
  };

  if (isRolledBack) {
    return (
      <div className="mx-4 mt-4 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw size={18} className="text-purple-500" />
          <span className="text-sm font-medium text-purple-800">Rollback complete — all completed tasks have been reversed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} className="text-red-500" />
        <div className="text-sm text-red-800">
          <strong>Workflow failed</strong>
          <span className="text-red-600 ml-1">— completed tasks can be rolled back to restore the previous state</span>
        </div>
      </div>
      <button
        id="rollback-btn"
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
          confirming
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-white text-red-600 border border-red-300 hover:bg-red-50"
        } disabled:opacity-50`}
        onClick={handleClick}
        disabled={isRollingBack || rolling}
      >
        {isRollingBack || rolling ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Rolling back...
          </>
        ) : confirming ? (
          "Confirm Rollback"
        ) : (
          <>
            <RotateCcw size={14} />
            Rollback
          </>
        )}
      </button>
    </div>
  );
}
