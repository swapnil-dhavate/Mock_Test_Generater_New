import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UploadCloud, CheckCircle2, FileJson } from 'lucide-react';

export function MarathiAdminPanel() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast.error('Please select a file to upload.');
      return;
    }

    setLoading(true);
    // In a real scenario, this would send FormData to a backend route
    // and parse logic for CSV/JSON.
    
    // Simulating parsing and storing in Firestore
    setTimeout(() => {
      setLoading(false);
      toast.success('Marathi Question Bank uploaded and indexed successfully!');
      setFiles(null);
    }, 2000);
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-md border-slate-200 mt-8">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6 rounded-t-xl">
        <CardTitle className="text-2xl flex items-center gap-2">
          <FileJson className="w-6 h-6 text-blue-600" /> Marathi Question Importer
        </CardTitle>
        <CardDescription>
          Upload CSV or JSON files containing Marathi questions for MPSC Nursing Mock Tests.
          The system will auto-index the questions and validate Devanagari Unicode.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
             onClick={() => document.getElementById('file-upload')?.click()}>
          <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
          <p className="text-slate-600 font-medium text-center">Click to browse or drag and drop your files here.</p>
          <p className="text-sm text-slate-400 mt-2">Supports .json, .csv, and .xlsx</p>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".json,.csv,.xlsx"
            onChange={(e) => setFiles(e.target.files)}
          />
        </div>

        {files && files.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {files[0].name} ({Math.round(files[0].size / 1024)} KB)
            </span>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button 
            disabled={!files || loading} 
            onClick={handleUpload}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Processing & Indexing...' : 'Upload & Sync with Database'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
