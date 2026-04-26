'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAgentStore, type CodePanelFile } from '@/lib/agent-store';
import {
  X, Copy, Check, ChevronRight, ChevronDown,
  FileCode, FileText, FileJson, Folder, FolderOpen,
  Terminal, Maximize2, Minimize2,
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
    // Comments
    if (remaining.startsWith('//') || (remaining.startsWith('#') && ['python', 'ruby', 'bash', 'yaml'].includes(language))) {
      tokens.push(<span key={key++} style={{ color: C.comment, fontStyle: 'italic' }}>{remaining}</span>);
      remaining = '';
      continue;
    }
    // Strings - double/single/backtick
    const strMatch = remaining.match(/^("""|'''|"|'|`)([\s\S]*?)(\1)/);
    if (strMatch && strMatch.index === 0) {
      tokens.push(<span key={key++} style={{ color: C.string }}>{strMatch[0]}</span>);
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }
    // Keywords
    const kws = 'import|export|from|const|let|var|function|return|if|else|for|while|class|extends|implements|interface|type|enum|async|await|try|catch|throw|new|this|super|default|switch|case|break|continue|typeof|instanceof|void|null|undefined|true|false|def|self|print|lambda|yield|with|as|in|not|and|or|is|None|True|False|use|client|server';
    const kwMatch = remaining.match(new RegExp(`^(\\b(?:${kws})\\b)`));
    if (kwMatch) {
      tokens.push(<span key={key++} style={{ color: C.keyword, fontWeight: 500 }}>{kwMatch[1]}</span>);
      remaining = remaining.slice(kwMatch[1].length);
      continue;
    }
    // Type/ClassName
    const typeMatch = remaining.match(/^\b([A-Z][a-zA-Z0-9_]*)\b/);
    if (typeMatch && language === 'typescript') {
      tokens.push(<span key={key++} style={{ color: C.type }}>{typeMatch[1]}</span>);
      remaining = remaining.slice(typeMatch[1].length);
      continue;
    }
    // Numbers
    const numMatch = remaining.match(/^\b\d+(\.\d+)?\b/);
    if (numMatch) {
      tokens.push(<span key={key++} style={{ color: C.number }}>{numMatch[0]}</span>);
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }
    // JSX tags
    const tagMatch = remaining.match(/^<\/?[A-Z][a-zA-Z]*/);
    if (tagMatch) {
      tokens.push(<span key={key++} style={{ color: C.tag }}>{tagMatch[0]}</span>);
      remaining = remaining.slice(tagMatch[0].length);
      continue;
    }
    // Function calls
    const funcMatch = remaining.match(/^\b([a-z_][a-zA-Z0-9_]*)\(/);
    if (funcMatch) {
      tokens.push(<span key={key++} style={{ color: C.func }}>{funcMatch[1]}</span>);
      tokens.push(<span key={key++} style={{ color: C.bracket }}>(</span>);
      remaining = remaining.slice(funcMatch[0].length);
      continue;
    }
    // Operators
    const opMatch = remaining.match(/^[=><!+\-*/&|?:]+/);
    if (opMatch && opMatch[0].length > 0 && !opMatch[0].startsWith('=')) {
      tokens.push(<span key={key++} style={{ color: C.operator }}>{opMatch[0]}</span>);
      remaining = remaining.slice(opMatch[0].length);
      continue;
    }
    // Default char
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
  const isDragging = useRef(false);

  const activeFile = codePanelFiles[codePanelActiveIndex] || null;

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

  return (
    <div
      className={`flex h-full shrink-0 border-l border-white/[0.08] bg-[#1e1e1e] ${typeof window !== 'undefined' && window.innerWidth < 768 ? 'fixed inset-0 z-50 border-l-0' : ''}`}
      style={{ width: isMaximized ? '100%' : typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : `${panelWidth}px` }}
    >
      {/* ── Resize Handle ── */}
      {!isMaximized && (
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
        {/* ── Activity Bar (icons) ── */}
        <div className="flex items-center h-9 px-2 border-b border-white/[0.06] bg-[#252526] shrink-0 gap-1">
          {/* Toggle explorer */}
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={`p-1.5 rounded transition-colors ${showExplorer ? 'text-white/60 bg-white/10' : 'text-white/25 hover:text-white/50'}`}
            title="Toggle Explorer"
          >
            <Folder className="h-4 w-4" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* File name display */}
          <div className="flex items-center gap-1.5">
            {getFileIcon(activeFile.fileName, 'h-3.5 w-3.5')}
            <span className="text-[11px] text-white/50 font-mono">{activeFile.fileName.split('/').pop()}</span>
          </div>

          <div className="flex-1" />

          {/* Toggle terminal */}
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`p-1.5 rounded transition-colors ${showTerminal ? 'text-white/60 bg-white/10' : 'text-white/25 hover:text-white/50'}`}
            title="Toggle Terminal"
          >
            <Terminal className="h-4 w-4" />
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded text-white/25 hover:text-white/50 transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

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

          {/* ── Editor Area ── */}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      // Close tab logic could go here
                    }}
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

            {/* ── Code Content ── */}
            <div className="flex-1 overflow-auto code-panel-scrollbar bg-[#1e1e1e]">
              <div className="flex min-h-full">
                {/* Line numbers */}
                <div className="shrink-0 py-2 pr-3 pl-4 text-right select-none sticky left-0 bg-[#1e1e1e]">
                  {lines.map((_, i) => (
                    <div key={i} className="text-[12px] leading-[20px] font-mono text-white/20 h-5">
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Code */}
                <pre className="flex-1 py-2 pr-6 text-[12px] leading-[20px] font-mono whitespace-pre overflow-x-auto">
                  {lines.map((line, i) => (
                    <div key={i} className="h-5 hover:bg-white/[0.02] px-1">
                      {highlightLine(line, language)}
                    </div>
                  ))}
                </pre>
              </div>
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
