import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UploadCloud, CheckCircle2, FileJson } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
        field = ''; row = [];
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0]?.trim());
}

function rowsToQuestions(rows: string[][]) {
  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const required = ['question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'difficulty', 'category', 'subtopic'];
  const missing = required.filter(r => idx(r) === -1);
  if (missing.length > 0) throw new Error(`CSV missing required columns: ${missing.join(', ')}`);

  return rows.slice(1).filter(r => r[idx('question')]?.trim()).map(r => ({
    question: r[idx('question')],
    options: [r[idx('optiona')], r[idx('optionb')], r[idx('optionc')], r[idx('optiond')]],
    correct_answer: r[idx('correctanswer')],
    difficulty: r[idx('difficulty')],
    category: r[idx('category')],
    subtopic: r[idx('subtopic')],
    language: 'mr',
    script: 'Devanagari',
    status: 'pending_review',
    source_api: 'Marathi Bulk Import'
  }));
}

function jsonToQuestions(items: any[]) {
  return items.map((item) => ({
    question: item.question,
    options: item.options,
    correct_answer: item.correctAnswer,
    rationale: item.rationale || null,
    difficulty: item.difficulty || 'Medium',
    category: item.category || 'General',
    subtopic: item.subtopic || 'Marathi',
    language: 'mr',
    script: 'Devanagari',
    status: 'pending_review',
    source_api: 'Marathi Bulk Import'
  }));
}

export function MarathiAdminPanel() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast.error('Please select a file to upload.');
      return;
    }

    setLoading(true);
    try {
      const file = files[0];
      const text = await file.text();
      let toInsert: any[];

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        toInsert = jsonToQuestions(Array.isArray(parsed) ? parsed : parsed.questions || []);
      } else {
        const rows = parseCsv(text);
        if (rows.length < 2) throw new Error('File appears empty.');
        toInsert = rowsToQuestions(rows);
      }

      if (toInsert.length === 0) throw new Error('No valid questions found in the file.');

      const { error } = await supabase.from('questions').insert(toInsert);
      if (error) throw error;

      toast.success(`${toInsert.length} Marathi questions uploaded and queued for review.`);
      setFiles(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Upload failed. Check the file format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-md border-slate-200 mt-8">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6 rounded-t-xl">
        <CardTitle className="text-2xl flex items-center gap-2">
          <FileJson className="w-6 h-6 text-blue-600" /> Marathi Question Importer
        </CardTitle>
        <CardDescription>
          Upload CSV (question,optionA,optionB,optionC,optionD,correctAnswer,difficulty,category,subtopic) or JSON files
          containing Marathi questions. Imported questions are queued as "Pending Review" in the shared question bank.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
             onClick={() => document.getElementById('file-upload')?.click()}>
          <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
          <p className="text-slate-600 font-medium text-center">Click to browse or drag and drop your files here.</p>
          <p className="text-sm text-slate-400 mt-2">Supports .json and .csv</p>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".json,.csv"
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
            {loading ? 'Processing & Uploading...' : 'Upload & Sync with Database'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
