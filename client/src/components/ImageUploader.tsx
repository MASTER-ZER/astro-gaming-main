import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface ImageUploaderProps {
  value: string | string[];
  onChange: (val: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  maxImages?: number;
}

function getAdminToken() { return localStorage.getItem("admin_token") || ""; }

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${getAdminToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const data = await res.json();
  return data.url || data.path || data.filePath || "";
}

// Single image uploader
export function SingleImageUploader({ value, onChange, label = "الصورة" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (e: any) {
      alert(e.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInput} />

      {value ? (
        <div className="relative group w-full rounded-xl overflow-hidden" style={{ height: 120 }}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white hover:bg-white/30 transition-all"
            >
              تغيير
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          disabled={uploading}
          className="w-full rounded-xl flex flex-col items-center justify-center gap-2 py-8 transition-all"
          style={{
            background: uploading ? "rgba(0,144,255,0.05)" : "rgba(255,255,255,0.03)",
            border: "2px dashed rgba(255,255,255,0.12)",
            cursor: "pointer",
          }}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-white/30" />
              <span className="text-xs text-white/30">اضغط أو اسحب صورة هنا</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Multiple images uploader
export function MultipleImageUploader({ values, onChange, maxImages = 5, label = "الصور" }: {
  values: string[];
  onChange: (v: string[]) => void;
  maxImages?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList) => {
    if (values.length >= maxImages) return;
    setUploading(true);
    try {
      const remaining = maxImages - values.length;
      const toUpload = Array.from(files).slice(0, remaining);
      const urls: string[] = [];
      for (const file of toUpload) {
        const url = await uploadFile(file);
        urls.push(url);
      }
      onChange([...values, ...urls]);
    } catch (e: any) {
      alert(e.message || "فشل رفع الصور");
    } finally { setUploading(false); }
  };

  const removeImage = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onInput} />

      {/* Existing images */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, idx) => (
            <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden shrink-0">
              <img src={url} alt={`${label} ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {values.length < maxImages && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          disabled={uploading}
          className="w-full rounded-xl flex items-center justify-center gap-2 py-4 transition-all"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "2px dashed rgba(255,255,255,0.12)",
            cursor: "pointer",
          }}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 text-primary/50 animate-spin" /><span className="text-xs text-white/30">جاري الرفع...</span></>
          ) : (
            <><Upload className="w-4 h-4 text-white/30" /><span className="text-xs text-white/30">رفع صور ({values.length}/{maxImages})</span></>
          )}
        </button>
      )}
    </div>
  );
}
