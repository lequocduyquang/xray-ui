import { useState } from "react";
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

  // Compress image before upload to reduce memory usage
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Resize to max 800x800 to reduce file size
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        }, 'image/jpeg', 0.8); // 80% quality
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      
      // Compress image if it's larger than 1MB
      if (originalFile.size > 1024 * 1024) {
        try {
          const compressedFile = await compressImage(originalFile);
          console.log(`📉 Image compressed: ${(originalFile.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
          setFile(compressedFile);
        } catch (error) {
          console.warn('Compression failed, using original:', error);
          setFile(originalFile);
        }
      } else {
        setFile(originalFile);
      }
      
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
        className="w-full max-w-6xl mx-auto mt-6 space-y-6"
      >
        {/* File Upload Section - Full Width */}
        <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center justify-center gap-2">
              <span className="text-xl">📸</span>
              Tải lên ảnh X-quang
            </h3>
            <p className="text-sm text-blue-600">Hỗ trợ DICOM, PNG, JPEG (tối đa 10MB)</p>
          </div>
          
          <div className="relative group">
            <input
              type="file"
              accept=".dcm,.dicom,image/png,image/jpeg"
              onChange={handleFileChange}
              className="sr-only"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`
                relative flex flex-col items-center justify-center w-full h-32 
                border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
                ${file 
                  ? 'border-green-400 bg-green-50 hover:bg-green-100' 
                  : 'border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-500 group-hover:border-blue-500'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-green-700 mb-1">✅ Đã chọn file thành công</p>
                    <p className="text-xs text-green-600 text-center max-w-48 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Nhấn để chọn file</p>
                    <p className="text-xs text-gray-500">hoặc kéo thả file vào đây</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">DICOM</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">PNG</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">JPEG</span>
                    </div>
                  </>
                )}
              </div>
            </label>
          </div>
          
          {file && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📄</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-800 truncate">{file.name}</p>
                    <p className="text-xs text-blue-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Sẵn sàng phân tích
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors group"
                  title="Xóa file"
                >
                  <svg className="w-4 h-4 text-red-500 group-hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Initial Diagnosis */}
          <div className="w-full bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100 shadow-sm">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-orange-700 mb-1 flex items-center justify-center gap-2">
                <span className="text-xl">🩺</span>
                Chẩn đoán ban đầu
              </h3>
              <p className="text-sm text-orange-600">Chọn chẩn đoán sơ bộ dựa trên quan sát</p>
            </div>
            <div className="space-y-3">
              {validLabels.map((label) => {
                const isSelected = clinicalInfo.initial_diagnosis === label;
                const config = {
                  Normal: {
                    icon: "✅",
                    label: "Phổi bình thường",
                    color: "green",
                    description: "Không có dấu hiệu bất thường"
                  },
                  Pneumonia: {
                    icon: "⚠️", 
                    label: "Viêm phổi",
                    color: "red",
                    description: "Có dấu hiệu viêm hoặc nhiễm trùng"
                  }
                }[label] || { icon: "📋", label: label, color: "gray", description: "Chẩn đoán khác" };
                
                return (
                  <label
                    key={label}
                    className={`
                      relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer 
                      transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                      ${isSelected 
                        ? config.color === 'green' 
                          ? 'bg-green-50 border-green-300 shadow-md ring-2 ring-green-200' 
                          : 'bg-red-50 border-red-300 shadow-md ring-2 ring-red-200'
                        : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-25 hover:shadow-md'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="initial_diagnosis"
                      value={label}
                      checked={isSelected}
                      onChange={(e) => setClinicalInfo({ ...clinicalInfo, initial_diagnosis: e.target.value })}
                      className="sr-only"
                    />
                    
                    {/* Custom Radio Button */}
                    <div className={`
                      relative w-5 h-5 rounded-full border-2 flex items-center justify-center
                      transition-all duration-200
                      ${isSelected 
                        ? config.color === 'green' 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-red-500 bg-red-500'
                        : 'border-gray-300 bg-white group-hover:border-orange-400'
                      }
                    `}>
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{config.icon}</span>
                      <div className="flex-1">
                        <div className={`font-semibold transition-colors ${
                          isSelected 
                            ? config.color === 'green' ? 'text-green-800' : 'text-red-800'
                            : 'text-gray-700'
                        }`}>
                          {config.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {config.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* Indicator dot */}
                    {isSelected && (
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        config.color === 'green' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                    )}
                  </label>
                );
              })}
            </div>
            
            {/* Selected count indicator */}
            {clinicalInfo.initial_diagnosis && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200 text-center">
                <span className="text-sm font-medium text-orange-700">
                  🎯 Đã chọn chẩn đoán ban đầu
                </span>
              </div>
            )}
          </div>
          
          {/* Right Column - Symptoms */}
          <div className="w-full bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-green-700 mb-1 flex items-center justify-center gap-2">
              <span className="text-xl">🩺</span>
              Triệu chứng lâm sàng
            </h3>
            <p className="text-sm text-green-600">Chọn các triệu chứng mà bệnh nhân đang gặp phải</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {symptomOptions.map((symptom) => {
              const isChecked = clinicalInfo.symptoms.includes(symptom);
                             const symptomConfig = {
                 fever: { icon: "🌡️", label: "Sốt", color: "red" },
                 dyspnea: { icon: "💨", label: "Khó thở", color: "blue" },
                 cough: { icon: "🤧", label: "Ho", color: "orange" },
                 wheezing: { icon: "🎵", label: "Thở khò khè", color: "purple" }
               }[symptom] || { icon: "📋", label: symptom, color: "gray" };
              
              return (
                <label
                  key={symptom}
                  className={`
                    relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer 
                    transition-all duration-200 ease-in-out transform hover:scale-[1.02]
                                         ${isChecked 
                       ? symptom === 'fever' ? 'bg-red-50 border-red-300 shadow-md ring-2 ring-red-200'
                         : symptom === 'dyspnea' ? 'bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-200'
                         : symptom === 'cough' ? 'bg-orange-50 border-orange-300 shadow-md ring-2 ring-orange-200'
                         : symptom === 'wheezing' ? 'bg-purple-50 border-purple-300 shadow-md ring-2 ring-purple-200'
                         : 'bg-gray-50 border-gray-300 shadow-md ring-2 ring-gray-200'
                       : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-25 hover:shadow-md'
                     }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleSymptomChange(symptom)}
                    className="sr-only"
                  />
                  
                  {/* Custom Checkbox */}
                  <div className={`
                    relative w-5 h-5 rounded-md border-2 flex items-center justify-center
                    transition-all duration-200
                                         ${isChecked 
                       ? symptom === 'fever' ? 'border-red-500 bg-red-500'
                         : symptom === 'dyspnea' ? 'border-blue-500 bg-blue-500'
                         : symptom === 'cough' ? 'border-orange-500 bg-orange-500'
                         : symptom === 'wheezing' ? 'border-purple-500 bg-purple-500'
                         : 'border-gray-500 bg-gray-500'
                       : 'border-gray-300 bg-white group-hover:border-green-400'
                     }
                  `}>
                    {isChecked && (
                      <svg 
                        className="w-3 h-3 text-white" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={3} 
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{symptomConfig.icon}</span>
                    <div className="flex-1">
                                             <div className={`font-semibold transition-colors ${
                         isChecked 
                           ? symptom === 'fever' ? 'text-red-800' 
                             : symptom === 'dyspnea' ? 'text-blue-800'
                             : symptom === 'cough' ? 'text-orange-800'
                             : symptom === 'wheezing' ? 'text-purple-800'
                             : 'text-gray-800'
                           : 'text-gray-700'
                       }`}>
                         {symptomConfig.label}
                       </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {symptom === "fever" && "Nhiệt độ cơ thể cao"}
                        {symptom === "dyspnea" && "Khó khăn trong hô hấp"}
                        {symptom === "cough" && "Ho khan hoặc có đờm"}
                        {symptom === "wheezing" && "Tiếng rít khi thở"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicator dot */}
                                     {isChecked && (
                     <div className={`w-2 h-2 rounded-full animate-pulse ${
                       symptom === 'fever' ? 'bg-red-400'
                       : symptom === 'dyspnea' ? 'bg-blue-400'
                       : symptom === 'cough' ? 'bg-orange-400'
                       : symptom === 'wheezing' ? 'bg-purple-400'
                       : 'bg-gray-400'
                     }`}></div>
                   )}
                </label>
              );
            })}
          </div>
          
          {/* Selected count indicator */}
          {clinicalInfo.symptoms.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-green-200 text-center">
              <span className="text-sm font-medium text-green-700">
                ✅ Đã chọn {clinicalInfo.symptoms.length} triệu chứng
              </span>
            </div>
          )}
          </div>
        </div>
        
        {/* 🚀 API Mode Toggle - Full Width */}
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
