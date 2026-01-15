"use client";

import { useState } from 'react';
import { ShieldCheck, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { VulnerabilityCard } from './components/VulnerabilityCard';
import { ScanResult, Vulnerability } from '@/types';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("");

  // Helper to read file contents
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleSelectProject = async () => {
    try {

      if (!window.showDirectoryPicker) {
        alert("Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.");
        return;
      }


      const dirHandle = await window.showDirectoryPicker();
      setLoading(true);
      setScanStatus("Reading files...");

      const filesPayload: { path: string, content: string }[] = [];
      let skippedCount = 0;
      
      async function scanDir(handle: any, path = "") {
        for await (const entry of handle.values()) {
          const newPath = path ? `${path}/${entry.name}` : entry.name;
          
          if (entry.kind === 'file') {
             // Production ignore logic
             if (newPath.includes('node_modules') || newPath.includes('.git') || 
                 newPath.includes('.next') || newPath.includes('dist') || 
                 newPath.includes('build') || newPath.includes('coverage') ||
                 newPath.endsWith('.png') || newPath.endsWith('.jpg') || 
                 newPath.endsWith('.jpeg') || newPath.endsWith('.svg') ||
                 newPath.endsWith('.ico')) {
               continue;
             }

             const file = await entry.getFile();
             // Limit individual file size to 500KB for Production (Next.js limits apply)
             if (file.size < 500000) { 
                try {
                  const content = await readFileContent(file);
                  filesPayload.push({ path: newPath, content });
                } catch (err) {
                  console.warn(`Failed to read ${newPath}`, err);
                }
             } else {
               skippedCount++;
             }
          } else if (entry.kind === 'directory') {
             if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                await scanDir(entry, newPath);
             }
          }
        }
      }

      await scanDir(dirHandle);
      
      if (filesPayload.length === 0) {
        alert("No scannable files found in this directory.");
        setLoading(false);
        setScanStatus("");
        return;
      }

      setScanStatus(`Scanning ${filesPayload.length} files (${skippedCount} large files skipped)...`);
      
      // Extract all file paths for global context
      const allFilePaths = filesPayload.map(f => f.path);

      // Chunking logic to prevent 413 Payload Too Large
      const CHUNK_SIZE = 5; 
      const chunks = [];
      for (let i = 0; i < filesPayload.length; i += CHUNK_SIZE) {
          chunks.push(filesPayload.slice(i, i + CHUNK_SIZE));
      }

      const allResults: ScanResult = { 
        vulnerabilities: [], 
        scannedFiles: 0, 
        durationMs: 0 
      };

      for (let i = 0; i < chunks.length; i++) {
        setScanStatus(`Scanning batch ${i + 1} of ${chunks.length}...`);
        
        const res = await fetch('/api/scan', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            files: chunks[i],
            filePaths: allFilePaths // Send global context with every batch
          }) 
        });

        if (!res.ok) throw new Error(`Batch ${i+1} failed: ${res.statusText}`);
        
        const data = await res.json();
        if (data.success) {
           // Deduplicate vulnerabilities based on unique signature (ruleId + file + line)
           const newVulns = data.data.vulnerabilities;
           for (const v of newVulns) {
             const exists = allResults.vulnerabilities.some(
               existing => existing.ruleId === v.ruleId && existing.file === v.file && existing.line === v.line
             );
             if (!exists) {
               allResults.vulnerabilities.push(v);
             }
           }
           
           allResults.scannedFiles += data.data.scannedFiles;
           allResults.durationMs += data.data.durationMs;
        } else {
           throw new Error(data.error || "Unknown server error");
        }
      }

      setResults(allResults);


    } catch (error) {
      console.error(error);
      if ((error as Error).name === 'AbortError') return;
      
      let msg = (error as Error).message;
      if (msg.includes('413')) {
        msg = "Project too large for demo (Payload limit exceeded). Try a smaller folder.";
      }
      alert(`Scan failed: ${msg}`);
    } finally {
      setLoading(false);
      setScanStatus("");
    }
  };

  const criticalCount = results?.vulnerabilities.filter(v => v.severity === 'CRITICAL').length || 0;
  const highCount = results?.vulnerabilities.filter(v => v.severity === 'HIGH').length || 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">DeployGuard</h1>
              <p className="text-muted-foreground text-sm">Pre-deployment Security Guardrails</p>
            </div>
          </div>
          
          <button 
            onClick={handleSelectProject}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? scanStatus || 'Scanning...' : 'Select Project'}
          </button>
        </div>

        {/* Empty State */}
        {!results && !loading && (
          <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/30">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <ShieldCheck className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-lg font-medium">Ready to Scan</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
              Select your local project folder. DeployGuard will analyze the files securely in-memory.
            </p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border p-4 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Files Scanned</p>
                <p className="text-2xl font-bold">{results.scannedFiles}</p>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Time Taken</p>
                <p className="text-2xl font-bold">{results.durationMs}ms</p>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Issues Found</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{results.vulnerabilities.length}</p>
                  {(criticalCount > 0 || highCount > 0) && (
                     <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                       {criticalCount} Critical
                     </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vulnerability List */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Security Findings
              </h2>
              {results.vulnerabilities.length === 0 ? (
                <div className="p-8 text-center bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-green-400 font-medium">No vulnerabilities found! 🎉</p>
                </div>
              ) : (
                results.vulnerabilities.map((v, i) => (
                  <VulnerabilityCard key={i} vuln={v} />
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
