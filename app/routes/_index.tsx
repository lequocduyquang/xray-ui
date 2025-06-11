import React, { useState } from "react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Phân tích hình ảnh phổi" },
  {
    name: "description",
    content: "Upload X-ray và chẩn đoán lâm sàng để kiểm tra phổi",
  },
];

type MultiLabel = {
  label: string;
  score: number;
};

type AnalyzeResponse = {
  success: boolean;
  stage: string;
  message: string;
  data: {
    clinical_info?: {
      initial_diagnosis?: string;
      symptoms?: string[];
    };
    binaryProbabilities: Record<string, number>;
    predictedClass: string;
    classLabels: string[];
    multiLabelTop: Record<string, MultiLabel>;
    allMultiLabelScores: MultiLabel[];
    warnings?: string[];
    cloudinaryId?: string;
    modelName?: string;
  };
};

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh]">
      <h2 className="text-xl font-bold text-red-600 mb-2">Đã xảy ra lỗi!</h2>
      <p className="text-gray-500 mt-2">
        Vui lòng thử lại hoặc liên hệ quản trị viên nếu lỗi tiếp tục xảy ra.
      </p>
    </div>
  );
}

export default function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [clinicalInfo, setClinicalInfo] = useState<{
    initial_diagnosis: string;
    symptoms: string[];
  }>({ initial_diagnosis: "", symptoms: [] });
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eigencamUrl, setEigencamUrl] = useState<string | null>(null);
  const [loadingEigencam, setLoadingEigencam] = useState(false);
  const [eigencamError, setEigencamError] = useState<string | null>(null);

  const validLabels = ["Normal", "Pneumonia"];
  const symptomOptions = ["fever", "dyspnea", "cough", "wheezing"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
      setEigencamUrl(null);
      setEigencamError(null);
    }
  };

  const handleDiagnosisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setClinicalInfo({ ...clinicalInfo, initial_diagnosis: e.target.value });
  };

  const handleSymptomChange = (symptom: string) => {
    setClinicalInfo((prev) => {
      const symptoms = prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom];
      return { ...prev, symptoms };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn file ảnh X-quang!");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("clinical_info", JSON.stringify(clinicalInfo));

    setLoading(true);
    setError(null);
    setResult(null);
    setEigencamUrl(null);
    setEigencamError(null);

    try {
      const apiUrl = `https://xray-diagnosis-ai.onrender.com/api/analyze`;
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("API request failed");
      const data: AnalyzeResponse = await res.json();
      if (!data.success)
        throw new Error(data.message || "Phân tích không thành công");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi gửi file hoặc gọi API.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEigencam = async () => {
    if (!result || !result.data.cloudinaryId || !result.data.modelName) {
      setEigencamError(
        "Không có ID Cloudinary hoặc tên model từ kết quả phân tích để tạo Eigencam."
      );
      return;
    }

    setLoadingEigencam(true);
    setEigencamError(null);
    setEigencamUrl(null);

    try {
      const eigencamApiUrl = `https://xray-diagnosis-cam.onrender.com/eigencam`;
      const res = await fetch(eigencamApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cloudinary_id: result.data.cloudinaryId,
          model_name: result.data.modelName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "API Eigencam request failed");
      }

      const data = await res.json();
      if (data.success && data.eigencam_url) {
        setEigencamUrl(data.eigencam_url);
      } else {
        throw new Error(data.error || "Tạo Eigencam không thành công");
      }
    } catch (err: any) {
      setEigencamError(err.message || "Có lỗi xảy ra khi tạo Eigencam.");
    } finally {
      setLoadingEigencam(false);
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
          Tải lên ảnh X-quang và nhập thông tin lâm sàng để phân tích tự động
          bằng AI
        </p>
      </div>
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center justify-center gap-4 w-full max-w-md mt-6"
      >
        <div className="flex flex-col items-center w-full">
          <label className="text-pretty text-green-500 mb-2 text-center">
            Chọn ảnh X-quang
          </label>
          <div className="flex justify-center w-full">
            <input
              type="file"
              accept=".dcm,.dicom,image/png,image/jpeg"
              onChange={handleFileChange}
              className="text-sm text-gray-500"
              style={{ textAlign: "center" }}
            />
          </div>
          {file && (
            <span className="mt-2 text-sm text-blue-400">{file.name}</span>
          )}
        </div>
        <div className="flex flex-col items-center w-full">
          <label className="text-pretty text-green-500 mb-2 text-center">
            Chẩn đoán ban đầu
          </label>
          <select
            value={clinicalInfo.initial_diagnosis}
            onChange={handleDiagnosisChange}
            className="w-3/4 p-2 border border-blue-300 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          >
            <option value="">Chọn chẩn đoán</option>
            {validLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-center w-full">
          <label className="text-pretty text-green-500 mb-2 text-center">
            Triệu chứng
          </label>
          <div className="flex flex-wrap justify-center gap-4">
            {symptomOptions.map((symptom) => (
              <label
                key={symptom}
                className="flex items-center bg-white dark:bg-white gap-2 text-sm px-3 py-1 rounded shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={clinicalInfo.symptoms.includes(symptom)}
                  onChange={() => handleSymptomChange(symptom)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="font-medium text-gray-700 dark:text-black">
                  {symptom === "fever"
                    ? "Sốt"
                    : symptom === "dyspnea"
                    ? "Khó thở"
                    : symptom === "cough"
                    ? "Ho"
                    : symptom === "wheezing"
                    ? "Thở khò khè"
                    : symptom}
                </span>
              </label>
            ))}
          </div>
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
          {result.data.clinical_info && (
            <div className="mb-2">
              <span className="font-medium text-gray-800">
                Thông tin lâm sàng:
              </span>
              <ul className="list-disc list-inside ml-4 text-gray-700">
                <li>
                  Chẩn đoán ban đầu:{" "}
                  {result.data.clinical_info.initial_diagnosis || "Không có"}
                </li>
                <li>
                  Triệu chứng:{" "}
                  {result.data.clinical_info.symptoms?.length
                    ? result.data.clinical_info.symptoms
                        .map((s) =>
                          s === "fever"
                            ? "Sốt"
                            : s === "dyspnea"
                            ? "Khó breathing"
                            : s === "cough"
                            ? "Ho"
                            : s === "wheezing"
                            ? "Thở khò khè"
                            : s
                        )
                        .join(", ")
                    : "Không có"}
                </li>
              </ul>
            </div>
          )}
          <div className="mb-2">
            <span className="font-medium text-gray-800">Chẩn đoán chính: </span>
            <span
              className={
                result.data.predictedClass === "Pneumonia"
                  ? "text-red-600 font-bold"
                  : "text-green-600 font-bold"
              }
            >
              {result.data.predictedClass === "Pneumonia"
                ? "Bệnh nhân có dấu hiệu viêm phổi."
                : "Phổi bình thường."}
            </span>
          </div>
          <div className="mb-2">
            <span className="font-medium text-blue-600">
              Xác suất nhị phân:
            </span>
            <ul className="list-disc list-inside ml-4">
              {Object.entries(result.data.binaryProbabilities).map(
                ([label, prob]) => (
                  <li key={label} className="text-gray-700">
                    {label}: {(prob * 100).toFixed(2)}%
                  </li>
                )
              )}
            </ul>
          </div>
          {result.data.multiLabelTop &&
            Object.values(result.data.multiLabelTop).length > 0 && (
              <div className="mb-2">
                <span className="font-medium text-purple-600">
                  Top chẩn đoán phụ:
                </span>
                <ul className="list-disc list-side ml-4">
                  {Object.values(result.data.multiLabelTop).map((item, idx) => (
                    <li key={idx} className="text-gray-700">
                      {item.label}: {(item.score * 100).toFixed(2)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
          <div className="mb-2">
            <span className="font-medium text-indigo-600">
              Tất cả chẩn đoán phụ:
            </span>
            <table className="min-w-full text-xs mt-2 bg-white rounded shadow">
              <thead>
                <tr className="bg-blue-100">
                  <th className="text-left pr-4 py-1 text-gray-700">Tên</th>
                  <th className="text-left py-1 text-gray-700">Xác suất</th>
                </tr>
              </thead>
              <tbody>
                {result.data.allMultiLabelScores.map((item, idx) => (
                  <tr
                    key={item.label}
                    className={idx % 2 === 0 ? "bg-gray-50" : "bg-gray-100"}
                  >
                    <td className="pr-4 py-1 text-gray-800">{item.label}</td>
                    <td className="py-1 text-gray-800">
                      {(item.score * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* {result.data.warnings && result.data.warnings.length > 0 && (
            <div className="mb-2">
              <span className="font-medium text-red-600">Cảnh báo:</span>
              <ul className="list-disc list-inside ml-4 text-red-700">
                {result.data.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )} */}

          {/* Eigencam Button */}
          {result.data.cloudinaryId && result.data.modelName && (
            <div className="mt-4">
              <button
                onClick={handleGenerateEigencam}
                disabled={loadingEigencam}
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
              >
                {loadingEigencam ? "Đang tạo Eigencam..." : "Tạo Eigencam"}
              </button>
              {eigencamError && (
                <div className="text-red-500 mt-2">{eigencamError}</div>
              )}
              {eigencamUrl && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Eigencam Result:
                  </h3>
                  <img
                    src={eigencamUrl}
                    alt="Eigencam Explanation"
                    className="max-w-full h-auto border border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          )}
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
