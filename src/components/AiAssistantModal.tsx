import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, Code, CheckCircle2, Loader2, Zap } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  onInsertCode: (newCode: string) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentCode,
  onInsertCode,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendPrompt = async (customPrompt?: string) => {
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setAiResponse(null);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `User Prompt: ${textToSubmit}\n\nCurrent Anchor Smart Contract Code:\n\`\`\`rust\n${currentCode}\n\`\`\``,
          systemInstruction: `You are a Senior Solana & Rust Smart Contract Engineer and Security Auditor specializing in Anchor v0.30+.
Your task is to analyze, refactor, generate, or audit Anchor Rust smart contracts.
When providing code, format it cleanly in \`\`\`rust ... \`\`\` blocks.
Explain key security details like PDA seeds, canonical bump validation, account discriminators, space math, and has_one constraints clearly and concisely.`,
        }),
      });

      const data = await response.json();
      if (data.error) {
        setAiResponse(`⚠️ Error: ${data.error}`);
      } else {
        setAiResponse(data.text);
      }
    } catch (err: any) {
      setAiResponse(`⚠️ Request failed: ${err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShortcutClick = (shortcutText: string) => {
    setPrompt(shortcutText);
    handleSendPrompt(shortcutText);
  };

  const extractCodeFromResponse = () => {
    if (!aiResponse) return null;
    const match = aiResponse.match(/```rust([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  const codeSnippet = extractCodeFromResponse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#1f6feb26] border border-[#30363d] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#58a6ff]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#c9d1d9] flex items-center gap-2">
                <span>Anchor AI Assistant</span>
                <span className="px-1.5 py-0.2 text-[10px] font-mono bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d] rounded">
                  Gemini Powered
                </span>
              </h3>
              <p className="text-[11px] text-[#8b949e]">Ask questions, request code refactoring, or generate Anchor tests</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Preset Prompt Shortcuts */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono text-[#8b949e] font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#ffa657]" /> Quick Senior Engineer Prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleShortcutClick('Refactor counter code using checked arithmetic and custom error enums')}
                className="px-2.5 py-1 text-xs bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded transition-colors text-left"
              >
                ⚡ Add checked_add & error enums
              </button>

              <button
                onClick={() => handleShortcutClick('Add a reset instruction handler to reset counter back to zero')}
                className="px-2.5 py-1 text-xs bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded transition-colors text-left"
              >
                🔄 Add reset() instruction handler
              </button>

              <button
                onClick={() => handleShortcutClick('Explain step-by-step how bump seeds and has_one constraints protect this Anchor contract')}
                className="px-2.5 py-1 text-xs bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded transition-colors text-left"
              >
                🛡️ Explain PDA bump security
              </button>
            </div>
          </div>

          {/* AI Response Display */}
          {loading ? (
            <div className="p-10 text-center space-y-3 bg-[#161b22] rounded-lg border border-[#30363d]">
              <Loader2 className="w-6 h-6 text-[#58a6ff] animate-spin mx-auto" />
              <p className="text-xs font-mono text-[#8b949e]">
                Analyzing Anchor Rust contract & generating response...
              </p>
            </div>
          ) : aiResponse ? (
            <div className="space-y-3">
              <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3 text-xs text-[#c9d1d9] leading-relaxed font-sans">
                <div className="font-bold text-[#58a6ff] border-b border-[#30363d] pb-2 flex items-center gap-1.5 font-mono">
                  <Bot className="w-4 h-4" />
                  <span>AI Audit & Review Findings</span>
                </div>
                <div className="whitespace-pre-wrap font-mono text-xs">{aiResponse}</div>
              </div>

              {codeSnippet && (
                <button
                  onClick={() => {
                    onInsertCode(codeSnippet);
                    onClose();
                  }}
                  className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Code className="w-4 h-4 text-white" />
                  <span>Insert Generated Code into Rust IDE</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8b949e] bg-[#161b22] rounded-lg border border-[#30363d]">
              Select a quick prompt above or type your question below.
            </div>
          )}
        </div>

        {/* Modal Footer Input */}
        <div className="p-3 bg-[#161b22] border-t border-[#30363d] flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
            placeholder="Ask AI Senior Engineer to audit, refactor, or explain..."
            className="flex-1 bg-[#0d1117] text-xs font-mono text-[#c9d1d9] border border-[#30363d] rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
          />
          <button
            onClick={() => handleSendPrompt()}
            disabled={loading || !prompt.trim()}
            className={`p-2 rounded border transition-all ${
              loading || !prompt.trim()
                ? 'bg-[#0d1117] text-[#8b949e] border-[#30363d] cursor-not-allowed'
                : 'bg-[#238636] hover:bg-[#2ea043] text-white border-[#30363d]'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
