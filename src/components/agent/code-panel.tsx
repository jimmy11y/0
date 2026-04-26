'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAgentStore, type CodePanelFile } from '@/lib/agent-store';
import {
  X, Copy, Check, ChevronRight, ChevronDown,
  FileCode, FileText, FileJson, Folder, FolderOpen,
  Terminal, Maximize2, Minimize2, Eye, Code, Play,
} from 'lucide-react';

// ── File icon based on extension ──
function getFileIcon(fileName: string, className = 'h-3.5 w-3.5') {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx'].includes(ext)) return <FileCode className={`${className} text-blue-400`} />;
  if (['js', 'jsx'].includes(ext)) return <FileCode className={`${className} text-yellow-400`} />;
  if (['py'].includes(ext)) return <FileCode className={`${className} text-green-400`} />;
  if (['json'].includes(ext)) return <FileJson className={`${className} text-yellow-400`} />;
  if (['md', 'txt'].includes(ext)) return <FileText className={`${className} text-gray-400`} />;
  if (['css', 'scss'].includes(ext)) return <FileCode className={`${className} text-purple-400`} />;
  if (['html'].includes(ext)) return <FileCode className={`${className} text-orange-400`} />;
  return <FileCode className={`${className} text-gray-400`} />;
}

// ── Detect language from filename ──
function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', h: 'c', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', html: 'html', css: 'css', scss: 'scss', sql: 'sql',
    sh: 'bash', bash: 'bash', xml: 'xml', toml: 'toml',
  };
  return map[ext] || 'text';
}

// ── Check if file supports live preview ──
function isPreviewable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['html', 'htm', 'svg'].includes(ext);
}

// ── One Dark syntax colors ──
const C = {
  keyword: '#c678dd', string: '#98c379', number: '#d19a66', comment: '#5c6370',
  func: '#61afef', type: '#e5c07b', operator: '#56b6c2', tag: '#e06c75',
  punctuation: '#abb2bf', default: '#abb2bf', bracket: '#abb2bf',
};

function highlightLine(line: string, language: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    if (!remaining) break;
    if (remaining.startsWith('//') || (remaining.startsWith('#') && ['python', 'ruby', 'bash', 'yaml'].includes(language))) {
      tokens.push(<span key={key++} style={{ color: C.comment, fontStyle: 'italic' }}>{remaining}</span>);
      remaining = '';
      continue;
    }
    const strMatch = remaining.match(/^("""|'''|"|'|`)([\s\S]*?)(\1)/);
    if (strMatch && strMatch.index === 0) {
      tokens.push(<span key={key++} style={{ color: C.string }}>{strMatch[0]}</span>);
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }
    const kws = 'import|export|from|const|let|var|function|return|if|else|for|while|class|extends|implements|interface|type|enum|async|await|try|catch|throw|new|this|super|default|switch|case|break|continue|typeof|instanceof|void|null|undefined|true|false|def|self|print|lambda|yield|with|as|in|not|and|or|is|None|True|False|use|client|server';
    const kwMatch = remaining.match(new RegExp(`^(\\b(?:${kws})\\b)`));
    if (kwMatch) {
      tokens.push(<span key={key++} style={{ color: C.keyword, fontWeight: 500 }}>{kwMatch[1]}</span>);
      remaining = remaining.slice(kwMatch[1].length);
      continue;
    }
    const typeMatch = remaining.match(/^\b([A-Z][a-zA-Z0-9_]*)\b/);
    if (typeMatch && language === 'typescript') {
      tokens.push(<span key={key++} style={{ color: C.type }}>{typeMatch[1]}</span>);
      remaining = remaining.slice(typeMatch[1].length);
      continue;
    }
    const numMatch = remaining.match(/^\b\d+(\.\d+)?\b/);
    if (numMatch) {
      tokens.push(<span key={key++} style={{ color: C.number }}>{numMatch[0]}</span>);
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }
    const tagMatch = remaining.match(/^<\/?[A-Z][a-zA-Z]*/);
    if (tagMatch) {
      tokens.push(<span key={key++} style={{ color: C.tag }}>{tagMatch[0]}</span>);
      remaining = remaining.slice(tagMatch[0].length);
      continue;
    }
    const funcMatch = remaining.match(/^\b([a-z_][a-zA-Z0-9_]*)\(/);
    if (funcMatch) {
      tokens.push(<span key={key++} style={{ color: C.func }}>{funcMatch[1]}</span>);
      tokens.push(<span key={key++} style={{ color: C.bracket }}>(</span>);
      remaining = remaining.slice(funcMatch[0].length);
      continue;
    }
    const opMatch = remaining.match(/^[=><!+\-*/&|?:]+/);
    if (opMatch && opMatch[0].length > 0 && !opMatch[0].startsWith('=')) {
      tokens.push(<span key={key++} style={{ color: C.operator }}>{opMatch[0]}</span>);
      remaining = remaining.slice(opMatch[0].length);
      continue;
    }
    tokens.push(<span key={key++} style={{ color: C.default }}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }
  return tokens;
}

// ── Build file tree from file list ──
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  depth: number;
}

function buildFileTree(files: CodePanelFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.fileName.split('/').filter(Boolean);
    let currentLevel = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existingNode = currentLevel.find(n => n.name === part);
      if (existingNode) {
        currentLevel = existingNode.children;
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isFolder: !isFile,
          children: [],
          depth: i,
        };
        currentLevel.push(newNode);
        currentLevel = newNode.children;
      }
    }
  }
  return root;
}

// ── File Tree Component ──
function FileTree({
  nodes,
  activeFilePath,
  onSelectFile,
  defaultExpanded,
}: {
  nodes: TreeNode[];
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  defaultExpanded?: boolean;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      const allFolders = new Set<string>();
      const addFolders = (ns: TreeNode[]) => {
        for (const n of ns) {
          if (n.isFolder) {
            allFolders.add(n.path);
            addFolders(n.children);
          }
        }
      };
      addFolders(nodes);
      return allFolders;
    }
    return new Set();
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="text-[12px] font-mono">
      {nodes.map(node => (
        <div key={node.path}>
          <button
            onClick={() => node.isFolder ? toggleFolder(node.path) : onSelectFile(node.path)}
            className={`flex items-center gap-1 w-full px-2 py-[3px] text-left transition-colors hover:bg-white/5 ${
              !node.isFolder && node.path === activeFilePath ? 'bg-white/10 text-white/80' : 'text-white/50'
            }`}
            style={{ paddingLeft: `${8 + node.depth * 14}px` }}
          >
            {node.isFolder ? (
              <>
                {expandedFolders.has(node.path) ? (
                  <ChevronDown className="h-3 w-3 text-white/30 shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-white/30 shrink-0" />
                )}
                {expandedFolders.has(node.path) ? (
                  <FolderOpen className="h-3.5 w-3.5 text-yellow-500/70 shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-yellow-500/50 shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-3 shrink-0" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {node.isFolder && expandedFolders.has(node.path) && (
            <FileTree
              nodes={node.children}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Live Preview Component ──
function LivePreview({ content, fileName }: { content: string; fileName: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const previewSrc = useMemo(() => {
    if (ext === 'svg') {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
    }
    // For HTML - create a blob URL
    const blob = new Blob([content], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [content, ext]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (previewSrc.startsWith('blob:')) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [previewSrc]);

  return (
    <div className="flex-1 bg-white overflow-hidden">
      <iframe
        ref={iframeRef}
        src={previewSrc}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title="Live Preview"
      />
    </div>
  );
}

// ════════════════════════════════════════════════
// ── Main CodePanel Component ──
// ════════════════════════════════════════════════
export function CodePanel() {
  const {
    codePanelOpen,
    codePanelFiles,
    codePanelActiveIndex,
    setCodePanelActiveIndex,
    closeCodePanel,
  } = useAgentStore();

  const [copied, setCopied] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [panelWidth, setPanelWidth] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerWidth : 600);
  const [isMaximized, setIsMaximized] = useState(false);
  // 'code' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('code');
  const isDragging = useRef(false);

  const activeFile = codePanelFiles[codePanelActiveIndex] || null;
  const canPreview = activeFile ? isPreviewable(activeFile.fileName) : false;

  const handleCopy = useCallback(async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeFile]);

  const handleSelectFile = useCallback((path: string) => {
    const index = codePanelFiles.findIndex(f => f.fileName === path);
    if (index >= 0) setCodePanelActiveIndex(index);
  }, [codePanelFiles, setCodePanelActiveIndex]);

  // Auto-switch to preview mode for HTML files
  useEffect(() => {
    if (activeFile && isPreviewable(activeFile.fileName)) {
      setViewMode('split');
    } else {
      setViewMode('code');
    }
  }, [activeFile?.fileName]);

  // Adjust panel width on resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) {
        setPanelWidth(window.innerWidth);
        setShowExplorer(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Resize drag
  useEffect(() => {
    if (!codePanelOpen || isMaximized) return;
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const minW = window.innerWidth < 768 ? 280 : 400;
      setPanelWidth(Math.max(minW, Math.min(960, window.innerWidth - e.clientX)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [codePanelOpen, isMaximized]);

  if (!codePanelOpen || !activeFile) return null;

  const lines = activeFile.content.split('\n');
  const lineCount = lines.length;
  const language = getLanguage(activeFile.fileName);
  const fileTree = buildFileTree(codePanelFiles);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      className={`flex h-full shrink-0 border-l border-white/[0.08] bg-[#1e1e1e] ${isMobile ? 'fixed inset-0 z-50 border-l-0' : ''}`}
      style={{ width: isMaximized ? '100%' : isMobile ? '100%' : `${panelWidth}px` }}
    >
      {/* ── Resize Handle ── */}
      {!isMaximized && !isMobile && (
        <div
          className="w-1 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        />
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {/* ── Activity Bar ── */}
        <div className="flex items-center h-9 px-2 border-b border-white/[0.06] bg-[#252526] shrink-0 gap-1">
          {/* Toggle explorer */}
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={`p-1.5 rounded transition-colors ${showExplorer ? 'text-white/60 bg-white/10' : 'text-white/25 hover:text-white/50'}`}
            title="Toggle Explorer"
          >
            <Folder className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          {/* File name */}
          <div className="flex items-center gap-1.5">
            {getFileIcon(activeFile.fileName, 'h-3.5 w-3.5')}
            <span className="text-[11px] text-white/50 font-mono">{activeFile.fileName.split('/').pop()}</span>
          </div>

          <div className="flex-1" />

          {/* View Mode Toggle - only for previewable files */}
          {canPreview && (
            <div className="flex items-center bg-white/5 rounded-md p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('code')}
                className={`p-1 rounded transition-colors ${viewMode === 'code' ? 'text-white/70 bg-white/10' : 'text-white/25 hover:text-white/50'}`}
                title="Code View"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-1 rounded transition-colors ${viewMode === 'split' ? 'text-white/70 bg-white/10' : 'text-white/25 hover:text-white/50'}`}
                title="Split View"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1 rounded transition-colors ${viewMode === 'preview' ? 'text-white/70 bg-white/10' : 'text-white/25 hover:text-white/50'}`}
                title="Preview Only"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Toggle terminal */}
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`p-1.5 rounded transition-colors ${showTerminal ? 'text-white/60 bg-white/10' : 'text-white/25 hover:text-white/50'}`}
            title="Toggle Terminal"
          >
            <Terminal className="h-4 w-4" />
          </button>

          {/* Maximize/Restore */}
          {!isMobile && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded text-white/25 hover:text-white/50 transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-white/25 hover:text-white/50 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Close */}
          <button
            onClick={closeCodePanel}
            className="p-1.5 rounded text-white/25 hover:text-red-400/70 transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── File Explorer Sidebar ── */}
          {showExplorer && codePanelFiles.length > 0 && (
            <div className="w-32 sm:w-48 shrink-0 border-r border-white/[0.06] bg-[#252526] overflow-y-auto code-panel-scrollbar">
              <div className="px-3 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                Explorer
              </div>
              <FileTree
                nodes={fileTree}
                activeFilePath={activeFile.fileName}
                onSelectFile={handleSelectFile}
                defaultExpanded
              />
            </div>
          )}

          {/* ── Editor + Preview Area ── */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* ── File Tabs ── */}
            <div className="flex items-center bg-[#252526] border-b border-white/[0.06] shrink-0 overflow-x-auto code-panel-scrollbar">
              {codePanelFiles.map((file, i) => (
                <button
                  key={file.fileName}
                  onClick={() => setCodePanelActiveIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border-r border-white/[0.06] transition-colors whitespace-nowrap shrink-0 ${
                    i === codePanelActiveIndex
                      ? 'bg-[#1e1e1e] text-white/80 border-t-2 border-t-blue-500/80'
                      : 'text-white/35 hover:text-white/50 hover:bg-white/5 border-t-2 border-t-transparent'
                  }`}
                >
                  {getFileIcon(file.fileName, 'h-3 w-3')}
                  <span>{file.fileName.split('/').pop()}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); }}
                    className="ml-1 text-white/15 hover:text-white/50"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>

            {/* ── Breadcrumb Path ── */}
            <div className="flex items-center gap-1 px-3 py-1 bg-[#1e1e1e] border-b border-white/[0.04] shrink-0">
              {activeFile.fileName.split('/').map((segment, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-white/10" />}
                  <span className={`text-[10px] font-mono ${i === arr.length - 1 ? 'text-white/40' : 'text-white/20'}`}>
                    {segment}
                  </span>
                </span>
              ))}
              <span className="ml-auto text-[10px] text-white/15 font-mono">
                Ln {lineCount}, {language}
              </span>
            </div>

            {/* ── Code + Preview Split ── */}
            <div className="flex flex-1 overflow-hidden">
              {/* Code View */}
              {(viewMode === 'code' || viewMode === 'split') && (
                <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col min-w-0 overflow-hidden`}>
                  <div className="flex-1 overflow-auto code-panel-scrollbar bg-[#1e1e1e]">
                    <div className="flex min-h-full">
                      <div className="shrink-0 py-2 pr-3 pl-4 text-right select-none sticky left-0 bg-[#1e1e1e]">
                        {lines.map((_, i) => (
                          <div key={i} className="text-[12px] leading-[20px] font-mono text-white/20 h-5">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      <pre className="flex-1 py-2 pr-6 text-[12px] leading-[20px] font-mono whitespace-pre overflow-x-auto">
                        {lines.map((line, i) => (
                          <div key={i} className="h-5 hover:bg-white/[0.02] px-1">
                            {highlightLine(line, language)}
                          </div>
                        ))}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Panel */}
              {(viewMode === 'preview' || viewMode === 'split') && canPreview && (
                <div className={`${viewMode === 'split' ? 'w-1/2 border-l border-white/[0.08]' : 'w-full'} flex flex-col min-w-0`}>
                  {/* Preview Header */}
                  <div className="flex items-center h-8 px-3 bg-[#252526] border-b border-white/[0.06] shrink-0">
                    <Eye className="h-3.5 w-3.5 text-emerald-400/60 mr-1.5" />
                    <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Live Preview</span>
                    <div className="flex-1" />
                    <button
                      onClick={() => {
                        // Refresh preview by re-rendering
                        setViewMode(v => v);
                      }}
                      className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                      title="Refresh Preview"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Preview Content */}
                  <LivePreview content={activeFile.content} fileName={activeFile.fileName} />
                </div>
              )}

              {/* Non-previewable file message */}
              {viewMode === 'preview' && !canPreview && (
                <div className="w-full flex flex-col items-center justify-center text-white/20 gap-2">
                  <Eye className="h-8 w-8 opacity-30" />
                  <span className="text-xs">Preview not available for this file type</span>
                  <button
                    onClick={() => setViewMode('code')}
                    className="text-[10px] text-orange-400/50 hover:text-orange-400/80 underline"
                  >
                    Switch to Code View
                  </button>
                </div>
              )}
            </div>

            {/* ── Terminal Section ── */}
            {showTerminal && (
              <div className="h-36 shrink-0 border-t border-white/[0.06] bg-[#1a1a1a] flex flex-col">
                <div className="flex items-center px-3 py-1 bg-[#252526] border-b border-white/[0.06] shrink-0">
                  <Terminal className="h-3 w-3 text-white/30 mr-1.5" />
                  <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">Terminal</span>
                </div>
                <div className="flex-1 p-2 font-mono text-[11px] text-white/40 overflow-auto code-panel-scrollbar">
                  <div className="text-emerald-400/50">$ <span className="text-white/30">Ready</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
