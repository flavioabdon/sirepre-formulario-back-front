import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface AsyncFileUploadProps {
    label: string;
    description: string;
    accept: Record<string, string[]>;
    imageRef?: string;
    onUploadSuccess: (fileId: number) => void;
    onClear: () => void;
    initialValue?: number | null;
    error?: string;
}

const AsyncFileUpload: React.FC<AsyncFileUploadProps> = ({
    label,
    description,
    accept,
    imageRef,
    onUploadSuccess,
    onClear,
    initialValue,
    error: externalError
}) => {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(initialValue ? 'success' : 'idle');
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setFileName(file.name);
        setStatus('uploading');
        setProgress(10);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulate progress or use real XHR
            setProgress(30);

            const response = await fetch('/api/postulantes/upload/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Error al subir el archivo');

            const data = await response.json();
            setProgress(100);
            setStatus('success');
            onUploadSuccess(data.id);
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Error de conexión');
            setProgress(0);
        }
    }, [onUploadSuccess]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        multiple: false,
        disabled: status === 'uploading' || status === 'success'
    });

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setStatus('idle');
        setFileName(null);
        setProgress(0);
        setError(null);
        onClear();
    };

    return (
        <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${isDragActive ? 'border-[#FB6732] bg-[#FB6732]/5 shadow-lg' :
            status === 'success' ? 'border-green-500 bg-green-50' :
                status === 'error' ? 'border-red-500 bg-red-50' :
                    'border-gray-200 bg-white hover:border-gray-300'
            }`}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        {status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                            status === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                                <FileText className="w-4 h-4 text-[#535551]" />}
                        {label}
                        {status === 'success' && <span className="text-[10px] bg-green-200 text-green-700 px-2 py-0.5 rounded-full uppercase ml-2 animate-bounce">Listo</span>}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
                </div>
                {status === 'success' && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {imageRef && status === 'idle' && (
                <div className="flex justify-center mb-4">
                    <img src={imageRef} alt="Referencia" className="h-32 object-contain opacity-80 rounded-lg" />
                </div>
            )}

            {status === 'idle' && (
                <div
                    {...getRootProps()}
                    className="cursor-pointer border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-600">
                        {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Formatos permitidos: {Object.values(accept).flat().join(', ')}</p>
                </div>
            )}

            {status === 'uploading' && (
                <div className="py-6 space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-[#535551]">
                        <span className="flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Subiendo {fileName}...
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-[#FB6732] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {status === 'success' && (
                <div className="py-4 flex items-center gap-4 bg-white/60 p-3 rounded-xl border border-white/80">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-gray-800 truncate">{fileName || 'Archivo cargado'}</p>
                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Subido correctamente</p>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-3 text-red-700 bg-red-100/50 p-3 rounded-xl">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-xs font-bold">{error || 'No se pudo subir el archivo'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setStatus('idle')}
                        className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Reintentar subida
                    </button>
                </div>
            )}

            {externalError && status !== 'error' && (
                <div className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {externalError}
                </div>
            )}
        </div>
    );
};

export default AsyncFileUpload;
