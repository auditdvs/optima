import React, { useState } from "react";

function calculateRating(minor: number, moderate: number, major: number, fraud: boolean): "LOW" | "MEDIUM" | "HIGH" {
  if (fraud) return "HIGH";
  if (
    ((major >= 1 && major <= 2) && moderate >= 12) ||
    (major >= 3)
  ) return "HIGH";
  if (
    (moderate >= 8) ||
    (major === 0 && moderate >= 8 && moderate <= 15) ||
    (major === 1 && moderate >= 8 && moderate <= 12) ||
    (major === 2 && moderate >= 8 && moderate <= 10) ||
    (major === 2 && moderate < 8) ||
    (major === 1 && moderate < 8)
  ) return "MEDIUM";
  if (major === 0 && moderate <= 7) return "LOW";
  return "LOW";
}

const badgeColor = (rating: string) => {
  if (rating === "HIGH") return "bg-red-100 text-red-700 border-red-300";
  if (rating === "MEDIUM") return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-green-100 text-green-700 border-green-300";
};

const AuditRatingCalculator: React.FC = () => {
  const [minor, setMinor] = useState(0);
  const [moderate, setModerate] = useState(0);
  const [major, setMajor] = useState(0);
  const [fraud, setFraud] = useState(false);

  const rating = calculateRating(minor, moderate, major, fraud);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center">Audit Rating Calculator</h2>
      <p className="text-gray-500 text-center mb-6 text-sm">
        Masukkan jumlah temuan dan checklist fraud jika ada. Hasil rating akan muncul otomatis.
      </p>
      <form className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Minor</label>
          <input
            type="number"
            min={0}
            value={minor}
            onChange={e => setMinor(Math.max(0, Number(e.target.value)))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Moderate</label>
          <input
            type="number"
            min={0}
            value={moderate}
            onChange={e => setModerate(Math.max(0, Number(e.target.value)))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Major</label>
          <input
            type="number"
            min={0}
            value={major}
            onChange={e => setMajor(Math.max(0, Number(e.target.value)))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none"
            placeholder="0"
          />
        </div>
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={fraud}
            onChange={e => setFraud(e.target.checked)}
            id="fraud"
            className="mr-2 accent-indigo-600"
          />
          <label htmlFor="fraud" className="text-gray-700 font-medium">Terdapat Fraud</label>
        </div>
      </form>
      <div className="mt-6 flex flex-col items-center">
        <span className="text-gray-600 mb-1">Rating Audit Issue Anda:</span>
        <span className={`px-4 py-2 rounded-full border text-lg font-bold ${badgeColor(rating)}`}>
          {rating}
        </span>
      </div>
    </div>
  );
};

export default AuditRatingCalculator;