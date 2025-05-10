import React, { useState } from "react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Phân tích hình ảnh phổi" },
  { name: "description", content: "Upload X-ray để kiểm tra phổi" },
];

type AnalyzeResponse = {
  success: boolean;
  message: string;
  data: {
    probabilities: number[];
    predictedClass: number;
    classLabels: string[];
  };
};

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = `https://xray-diagnosis-ai.onrender.com/api/analyze`;
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("API request failed");
      const data: AnalyzeResponse = await res.json();
      setResult(data);
    } catch {
      setError("Có lỗi xảy ra khi gửi file hoặc gọi API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-6 bg-slate-50">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <img
          src="/Logo_ND2.png"
          alt="Logo Bệnh viện Nhi Đồng 2"
          className="w-24 h-auto"
        />
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Phân tích hình ảnh phổi
        </h1>
        <p className="text-gray-600 text-center max-w-md">
          Tải lên ảnh X-quang của bé để được phân tích tự động bằng AI
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center justify-center gap-4 w-full max-w-md mt-6"
      >
        <div className="flex justify-center">
          <input
            type="file"
            accept=".dcm,image/png,image/jpeg"
            onChange={handleFileChange}
            className="block mx-auto text-sm text-gray-500"
            style={{ textAlign: "center" }}
          />
        </div>
        <button
          type="submit"
          disabled={!file || loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Đang phân tích..." : "Phân tích"}
        </button>
      </form>

      {/* Error */}
      {error && <div className="text-red-500 mt-4">{error}</div>}

      {/* Result */}
      {result && result.success && (
        <div className="mt-6 p-4 border rounded bg-gray-50 w-full max-w-md">
          <h2 className="font-semibold mb-2 text-orange-400">
            Kết quả phân tích:
          </h2>
          <div className="mb-2">
            <span className="font-medium text-gray-800">Chẩn đoán:&nbsp;</span>
            <span
              className={
                result.data.classLabels[result.data.predictedClass] ===
                "Pneumonia"
                  ? "text-red-600 font-bold"
                  : "text-green-600 font-bold"
              }
            >
              {result.data.classLabels[result.data.predictedClass] ===
              "Pneumonia"
                ? "Bệnh nhân có dấu hiệu viêm phổi."
                : "Phổi bình thường."}
            </span>
          </div>
          <div className="mb-2">
            <span className="font-medium text-blue-400">Xác suất:</span>
            <ul className="list-disc list-inside">
              {result.data.classLabels.map((label, idx) => (
                <li key={label} className="text-gray-400">
                  {label}: {(result.data.probabilities[idx] * 100).toFixed(2)}%
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-sm text-gray-500 text-center mt-8">
        Built by <b>Quang Le</b> with{" "}
        <span className="animate-pulse inline-block">🧡</span>
      </footer>
    </div>
  );
}
