"use client";

import { useState } from 'react';
import { ShieldCheck, Loader2, RefreshCw, AlertTriangle, Lock, Zap, FileCode, Heart, Github, Linkedin } from 'lucide-react';
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
    <div className="min-h-screen p-8 relative z-10">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border/50 relative">
          <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-primary shadow-[0_0_10px_var(--color-primary)]"></div>
          
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-primary/10 border border-primary/50 relative flex items-center justify-center text-primary clip-cyber overflow-hidden">
              <div className="absolute inset-0 bg-primary/20 animate-pulse"></div>
              <ShieldCheck className="w-7 h-7 relative z-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-white animate-glitch cursor-default select-none" data-text="turbo broccoli">
                turbo broccoli
              </h1>
              <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_lime]"></span>
                System Online
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleSelectProject}
            disabled={loading}
            className="group relative px-8 py-3 bg-primary/10 text-primary font-bold tracking-wider hover:bg-primary hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all clip-cyber border border-primary/50 hover:shadow-[0_0_20px_var(--color-primary)]"
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary group-hover:border-black transition-colors"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary group-hover:border-black transition-colors"></div>
            
            <span className="flex items-center gap-3 relative z-10">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              {loading ? scanStatus || 'INITIALIZING...' : 'INITIATE SCAN'}
            </span>
          </button>
        </div>

        {/* Empty State / Features Home */}
        {!results && !loading && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-12 shadow-2xl transition-all hover:border-primary/20 hover:shadow-primary/5 group text-left">
            
            {/* Background Effects */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px] transition-all group-hover:bg-primary/30"></div>
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-[100px] transition-all group-hover:bg-blue-600/30"></div>
            
            <div className="relative z-10 grid gap-12 md:grid-cols-2 lg:gap-16 items-center">
              
              {/* Hero Section */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary shadow-[0_0_10px_var(--color-primary)] backdrop-blur-sm animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                  System Operational
                </div>
                
                <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Secure Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Deployment</span>
                </h2>
                
                <p className="max-w-md text-lg text-muted-foreground">
                  Advanced static analysis tool designed to catch critical vulnerabilities before they reach production. 
                </p>

                <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    Local Execution
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    Zero Latency
                  </span>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: FileCode, title: "Deep Analysis", desc: "Scans for secrets, misconfigs, and compliance." },
                  { icon: Zap, title: "AI Remediation", desc: "Powered by Gemini API to generate instant fixes." },
                  { icon: ShieldCheck, title: "Real-time Detection", desc: "Instant feedback on your local codebase." },
                  { icon: Lock, title: "Privacy First", desc: "Files never leave your local machine's memory." },
                ].map((feature, idx) => (
                  <div key={idx} className="group/card relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:shadow-lg hover:-translate-y-1">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1 font-semibold text-white">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Stats */}
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-card/50 border border-border p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
                  <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl grayscale group-hover:grayscale-0 transition-all">📂</div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Files Scanned</p>
                  <p className="text-4xl font-bold font-mono text-foreground">{results.scannedFiles}</p>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/30 group-hover:border-primary transition-colors"></div>
                </div>

                <div className="bg-card/50 border border-border p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
                  <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl grayscale group-hover:grayscale-0 transition-all">⚡</div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2.5">Process Time</p>
                  <p className="text-4xl font-bold font-mono text-foreground">{results.durationMs}ms</p>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/30 group-hover:border-primary transition-colors"></div>
                </div>

                <div className="bg-card/50 border border-border p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
                  <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl grayscale group-hover:grayscale-0 transition-all">⚠️</div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2.5">Threats Detected</p>
                  <div className="flex flex-col">
                    <p className={`text-4xl font-bold font-mono ${results.vulnerabilities.length > 0 ? 'text-destructive drop-shadow-[0_0_10px_var(--color-destructive)]' : 'text-foreground'}`}>
                      {results.vulnerabilities.length}
                    </p>
                    {(criticalCount > 0 || highCount > 0) && (
                       <div className="flex gap-2 mt-2 text-xs font-mono">
                         {criticalCount > 0 && <span className="text-destructive font-bold">{criticalCount} CRIT</span>}
                         {highCount > 0 && <span className="text-[#ff5e00] font-bold">{highCount} HIGH</span>}
                       </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/30 group-hover:border-primary transition-colors"></div>
                </div>
            </div>

            {/* Vulnerability List */}
            <div>
              <div className="flex items-center gap-4 mb-6 border-b border-border/30 pb-2">
                <AlertTriangle className="w-6 h-6 text-primary animate-pulse" />
                <h2 className="text-xl font-bold tracking-wider text-primary">DIAGNOSTIC REPORT</h2>
              </div>
              
              {results.vulnerabilities.length === 0 ? (
                <div className="p-12 text-center bg-green-500/5 border border-green-500/20 clip-cyber relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-green-500/50 shadow-[0_0_10px_lime]"></div>
                  <p className="text-green-400 font-bold text-xl tracking-widest uppercase">
                    SYSTEM SECURE // NO THREATS DETECTED
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.vulnerabilities.map((v, i) => (
                    <VulnerabilityCard key={i} vuln={v} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border/50 pt-8 mt-20 flex flex-col md:flex-row items-center justify-center gap-8 text-sm text-muted-foreground font-mono pb-8">
          <div className="flex items-center gap-4">
            <a href="https://vedanttxd.me" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <span className="opacity-70">Made with</span>
              <Heart className="w-4 h-4 text-destructive animate-pulse fill-destructive shadow-[0_0_15px_var(--color-destructive)]" />
              <span className="opacity-70">by</span>
              <span className="text-primary  font-bold tracking-wider uppercase drop-shadow-[0_0_5px_var(--color-primary)]">Vedant</span>
            </a>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com/vedant44-cyber" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2 group relative">
              <div className="absolute inset-0 bg-primary/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
              <Github className="w-5 h-5 relative z-10" />
              <span className="hidden md:inline relative z-10 font-bold group-hover:tracking-widest transition-all duration-300">GITHUB</span>
            </a>
            <a href="https://linkedin.com/in/vedant-dorlikar-13b173307" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2 group relative">
              <div className="absolute inset-0 bg-blue-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
              <Linkedin className="w-5 h-5 relative z-10" />
              <span className="hidden md:inline relative z-10 font-bold group-hover:tracking-widest transition-all duration-300">LINKEDIN</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
