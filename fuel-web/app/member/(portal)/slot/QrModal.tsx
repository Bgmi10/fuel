"use client";

import QRCode from "react-qr-code";
import {
  X,
  CalendarDays,
  Clock3,
  Building2,
  Package,
  QrCode,
} from "lucide-react";

interface QrModalProps {
  selectedBooking: any;
  setSelectedBooking: (booking: any | null) => void;
}

const QrModal = ({
  selectedBooking,
  setSelectedBooking,
}: QrModalProps) => {
  if (!selectedBooking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
      {/* Backdrop */}
      <div
        onClick={() => setSelectedBooking(null)}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 backdrop-blur p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Session Pass
            </h2>

            <p className="text-xs text-gray-400">
              Present this QR during check-in
            </p>
          </div>

          <button
            onClick={() => setSelectedBooking(null)}
            className="p-2 rounded-xl hover:bg-white/5 transition"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* QR */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-3xl shadow-lg">
              <QRCode
                value={selectedBooking.id}
                size={220}
              />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default QrModal;