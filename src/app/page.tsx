"use client";

import { useState } from 'react';
import { ShieldCheck, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { VulnerabilityCard } from './components/VulnerabilityCard';
import { ScanResult, Vulnerability } from '@/types';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScanResult | null>(null);

  const startScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
            onClick={startScan}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? 'Scanning...' : 'Run Scan'}
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
              DeployGuard will analyze your codebase against 5 critical security rules including Secrets, JWT, and CORS checks.
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
