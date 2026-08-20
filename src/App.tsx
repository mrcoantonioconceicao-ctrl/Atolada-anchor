import React, { useState, useMemo } from 'react';
import { USER_INITIAL_COUNTER_CODE } from './data/defaultContracts';
import { runAnchorSecurityAudit } from './utils/solanaUtils';
import { Navbar } from './components/Navbar';
import { CodeEditor } from './components/CodeEditor';
import { PdaVisualizer } from './components/PdaVisualizer';
import { ExecutionSandbox } from './components/ExecutionSandbox';
import { SdkAndIdlViewer } from './components/SdkAndIdlViewer';
import { SecurityGuide } from './components/SecurityGuide';
import { AiAssistantModal } from './components/AiAssistantModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'pda' | 'simulator' | 'sdk' | 'guide'>('editor');
  const [code, setCode] = useState<string>(USER_INITIAL_COUNTER_CODE);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);

  // Run security audit on current code state
  const auditResult = useMemo(() => {
    return runAnchorSecurityAudit(code);
  }, [code]);

  const handleResetCode = () => {
    setCode(USER_INITIAL_COUNTER_CODE);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col font-sans selection:bg-[#1f6feb] selection:text-white">
      {/* Top Bar Navigation Contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        auditScore={auditResult.score}
        onOpenAi={() => setIsAiOpen(true)}
        onRunAudit={() => setActiveTab('editor')}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 relative">
        {activeTab === 'editor' && (
          <CodeEditor
            code={code}
            setCode={setCode}
            auditIssues={auditResult.issues}
            auditScore={auditResult.score}
            onRunAudit={() => runAnchorSecurityAudit(code)}
            onResetCode={handleResetCode}
          />
        )}

        {activeTab === 'pda' && <PdaVisualizer />}

        {activeTab === 'simulator' && <ExecutionSandbox code={code} />}

        {activeTab === 'sdk' && <SdkAndIdlViewer code={code} />}

        {activeTab === 'guide' && <SecurityGuide />}
      </main>

      {/* AI Senior Engineer Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        currentCode={code}
        onInsertCode={(newCode) => setCode(newCode)}
      />
    </div>
  );
}
