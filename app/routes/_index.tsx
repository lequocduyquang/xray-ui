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
    confidence?: number;
    classLabels: string[];
    multiLabelTop: Record<string, MultiLabel>;
    allMultiLabelScores: MultiLabel[];
    warnings?: string[];
    cloudinaryId?: string;
    modelName?: string;
    // 🚀 Enhanced Analysis from Optimized API
    enhanced_analysis?: {
      system_type: string;
      optimization_features?: string[];
      models_used: string[];
      onnx_analysis?: {
        diagnosis: string;
        confidence: number;
        stage?: string;
      };
      gpt4o_analysis?: {
        diagnosis: string;
        confidence: number;
        findings?: string[];
        reasoning?: string;
        recommendations?: string[];
      };
      ai_agreement?: {
        disagreement_detected: boolean;
        agreement_level?: string;
      };
      professor_analysis?: {
        triggered: boolean;
        success?: boolean;
        expert_diagnosis?: string;
        confidence?: number;
        risk_assessment?: string;
      };
      final_decision?: {
        diagnosis: string;
        confidence: number;
        decision_maker: string;
        reasoning?: string;
      };
      performance_metrics?: {
        total_processing_time: number;
        optimization_applied: boolean;
        parallel_execution?: boolean;
        fallback_mode?: string | boolean;
        gpt4o_cost_usd?: number;
        professor_cost_usd?: number;
        total_cost_usd?: number;
        estimated_speedup?: string;
      };
    };
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
  const [useOptimizedAPI, setUseOptimizedAPI] = useState(true); // 🚀 Use optimized API by default
  const [showEnhancedDetails, setShowEnhancedDetails] = useState(false);

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
      // 🚀 Use optimized API endpoint
      const endpoint = useOptimizedAPI ? "analyze-optimized" : "analyze";
      const apiUrl = `https://xray-diagnosis-ai.onrender.com/api/${endpoint}`;
      console.log(`🚀 Using ${useOptimizedAPI ? 'OPTIMIZED' : 'STANDARD'} API: ${apiUrl}`);
      
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
      const eigencamApiUrl = `https://xray-diagnosis-gradcam.onrender.com/v2/eigencam`;
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
        
        {/* 🚀 API Mode Toggle */}
        <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="text-center mb-3">
            <h3 className="text-sm font-semibold text-blue-700 mb-1">🚀 Chế độ phân tích</h3>
            <p className="text-xs text-gray-600">Chọn phương thức xử lý phù hợp</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              useOptimizedAPI 
                ? 'border-blue-500 bg-blue-100 shadow-md' 
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="apiMode"
                checked={useOptimizedAPI}
                onChange={() => setUseOptimizedAPI(true)}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  useOptimizedAPI ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {useOptimizedAPI && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm">⚡ Optimized</div>
                  <div className="text-xs text-gray-500">Nhanh hơn 30-50%</div>
                </div>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              !useOptimizedAPI 
                ? 'border-gray-500 bg-gray-100 shadow-md' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="apiMode"
                checked={!useOptimizedAPI}
                onChange={() => setUseOptimizedAPI(false)}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  !useOptimizedAPI ? 'border-gray-500 bg-gray-500' : 'border-gray-300'
                }`}>
                  {!useOptimizedAPI && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm">🔄 Standard</div>
                  <div className="text-xs text-gray-500">Truyền thống</div>
                </div>
              </div>
            </label>
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
            {result.data.confidence && (
              <span className="ml-2 text-sm text-blue-600">
                ({(result.data.confidence * 100).toFixed(1)}% tin cậy)
              </span>
            )}
          </div>
          
          {/* 🚀 Enhanced Analysis Display */}
          {result.data.enhanced_analysis && (
            <div className="mb-4 p-3 bg-blue-50 rounded border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-blue-700">
                  🚀 Thông tin hệ thống AI
                </span>
                <button
                  onClick={() => setShowEnhancedDetails(!showEnhancedDetails)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showEnhancedDetails ? "Ẩn" : "Hiện"} chi tiết
                </button>
              </div>
              
              <div className="text-sm text-gray-700">
                <div className="mb-1">
                  <span className="font-medium">Hệ thống: </span>
                  <span className="text-blue-600">{result.data.enhanced_analysis.system_type}</span>
                </div>
                
                {result.data.enhanced_analysis.models_used && (
                  <div className="mb-1">
                    <span className="font-medium">AI Models: </span>
                    <span className="text-green-600">
                      {result.data.enhanced_analysis.models_used.join(", ")}
                    </span>
                  </div>
                )}
                
                {result.data.enhanced_analysis.performance_metrics && (
                  <div className="mb-1">
                    <span className="font-medium">Thời gian xử lý: </span>
                    <span className="text-orange-600">
                      {(result.data.enhanced_analysis.performance_metrics.total_processing_time / 1000).toFixed(1)}s
                    </span>
                    {result.data.enhanced_analysis.performance_metrics.estimated_speedup && (
                      <span className="ml-2 text-green-600 text-xs">
                        ({result.data.enhanced_analysis.performance_metrics.estimated_speedup})
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {showEnhancedDetails && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  {/* AI Agreement Status */}
                  {result.data.enhanced_analysis.ai_agreement && (
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">AI Agreement: </span>
                      <span className={
                        result.data.enhanced_analysis.ai_agreement.disagreement_detected 
                          ? "text-red-600" 
                          : "text-green-600"
                      }>
                        {result.data.enhanced_analysis.ai_agreement.disagreement_detected 
                          ? "⚠️ Disagreement detected" 
                          : "✅ AIs agree"}
                      </span>
                    </div>
                  )}
                  
                  {/* Professor AI Status */}
                  {result.data.enhanced_analysis.professor_analysis && (
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">Professor AI: </span>
                      <span className={
                        result.data.enhanced_analysis.professor_analysis.triggered
                          ? "text-blue-600" 
                          : "text-gray-500"
                      }>
                        {result.data.enhanced_analysis.professor_analysis.triggered 
                          ? `🩺 Activated (${result.data.enhanced_analysis.professor_analysis.expert_diagnosis})` 
                          : "Not needed"}
                      </span>
                    </div>
                  )}
                  
                  {/* Cost Information */}
                  {result.data.enhanced_analysis.performance_metrics?.total_cost_usd && (
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">Cost: </span>
                      <span className="text-purple-600">
                        ${result.data.enhanced_analysis.performance_metrics.total_cost_usd.toFixed(4)} USD
                      </span>
                    </div>
                  )}
                  
                  {/* Optimization Features */}
                  {result.data.enhanced_analysis.optimization_features && (
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">Optimizations: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.data.enhanced_analysis.optimization_features.map((feature, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {feature.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">%</span>
              </div>
              <h3 className="font-semibold text-blue-700">Xác suất phân tích</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(result.data.binaryProbabilities).map(
                ([label, prob]) => (
                  <div key={label} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                    <span className="font-medium text-gray-800">{label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${label === 'Pneumonia' ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${(prob as number * 100)}%` }}
                        ></div>
                      </div>
                      <span className={`font-bold text-sm ${label === 'Pneumonia' ? 'text-red-600' : 'text-green-600'}`}>
                        {((prob as number) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="mb-4">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">📊</span>
                </div>
                <h3 className="font-semibold text-indigo-700">Chi tiết chẩn đoán</h3>
              </div>
              
              {Array.isArray(result.data.allMultiLabelScores) &&
                result.data.allMultiLabelScores.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.data.allMultiLabelScores
                      .sort((a, b) => (b.score || 0) - (a.score || 0)) // Sort by score descending
                      .map((item, idx) => {
                        const score = typeof item.score === 'number' && !isNaN(item.score) ? item.score : 0;
                        const percentage = (score * 100).toFixed(1);
                        const isHighScore = score > 0.5;
                        
                        return (
                          <div
                            key={item.label}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm ${
                              isHighScore 
                                ? 'bg-red-50 border-red-200' 
                                : score > 0.1 
                                  ? 'bg-yellow-50 border-yellow-200' 
                                  : 'bg-green-50 border-green-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                isHighScore ? 'bg-red-500' : score > 0.1 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}></div>
                              <span className="font-medium text-gray-800 text-sm">{item.label}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    isHighScore ? 'bg-red-500' : score > 0.1 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.max(score * 100, 2)}%` }} // Minimum 2% for visibility
                                ></div>
                              </div>
                              <span className={`font-bold text-xs min-w-[3rem] text-right ${
                                isHighScore ? 'text-red-600' : score > 0.1 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
            </div>
          </div>
          {result.data.warnings && result.data.warnings.length > 0 && (
            <div className="mb-2">
              <span className="font-medium text-orange-600">Thông báo hệ thống:</span>
              <ul className="list-disc list-inside ml-4">
                {result.data.warnings.map((warning, idx) => (
                  <li 
                    key={idx} 
                    className={
                      warning.includes('🚨 MEDICAL SAFETY ALERT') 
                        ? "text-red-900 text-sm font-bold bg-red-100 px-3 py-2 rounded-lg border-l-4 border-red-600 my-2 shadow-md" 
                        : warning.includes('⚠️') && warning.includes('Consider ONNX diagnosis')
                        ? "text-orange-800 text-sm font-medium bg-orange-100 px-3 py-2 rounded-lg border-l-4 border-orange-500 my-1"
                        : warning.includes('🩺') && warning.includes('safety')
                        ? "text-blue-800 text-sm font-medium bg-blue-100 px-3 py-2 rounded-lg border-l-4 border-blue-500 my-1"
                        : "text-orange-700 text-sm"
                    }
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
           )}

          {/* Eigencam Button */}
          {result.data.cloudinaryId && result.data.modelName && (
            <div className="mt-4">
              <button
                onClick={handleGenerateEigencam}
                disabled={loadingEigencam}
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
              >
                {loadingEigencam ? "Đang giải thích..." : "Kết quả giải thích AI"}
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
