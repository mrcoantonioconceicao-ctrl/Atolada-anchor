import React, { useState } from 'react';
import {
  Globe,
  Sparkles,
  Cpu,
  ShieldCheck,
  Zap,
  GraduationCap,
  Wrench,
  User,
  LogOut,
  ChevronDown,
  Cloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Github,
  BookOpen,
} from 'lucide-react';
import { useLanguage, Language, UserMode } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface HeaderBarProps {
  auditScore: number;
  criticalCount: number;
  highCount: number;
  onOpenCloud?: () => void;
  onOpenGithub?: (tab?: 'import' | 'export') => void;
  onOpenTour?: () => void;
  onRunAudit: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  auditScore,
  criticalCount,
  highCount,
  onOpenCloud,
  onOpenGithub,
  onOpenTour,
  onRunAudit,
}) => {
  const { language, setLanguage, userMode, setUserMode, t } = useLanguage();
  const { user, logout } = useAuth();
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const getScoreColor = () => {
    if (criticalCount > 0) return 'text-[#ff7b72] border-[#f85149]/40 bg-[#f85149]/15';
    if (highCount > 0) return 'text-[#f0883e] border-[#d29922]/40 bg-[#d29922]/15';
    if (auditScore >= 85) return 'text-[#7ee787] border-[#238636]/40 bg-[#238636]/15';
    return 'text-[#58a6ff] border-[#1f6feb]/40 bg-[#1f6feb]/15';
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'pt', label: 'Português (PT-BR)', flag: '🇧🇷' },
    { code: 'en', label: 'English (EN-US)', flag: '🇺🇸' },
    { code: 'es', label: 'Español (ES)', flag: '🇪🇸' },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <header className="w-full bg-[#161b22] border-b border-[#30363d] px-3 lg:px-5 py-2.5 flex items-center justify-between gap-3 text-xs select-none shrink-0 z-30">
      {/* Left: Brand & Mode Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-sm">
            <div className="w-full h-full bg-[#0d1117] rounded-[4px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#14F195]" />
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-white text-sm tracking-tight block leading-none">
              Solana Architect
            </span>
            <span className="text-[10px] text-[#8b949e] font-mono leading-none">
              DevSecOps Anchor v0.30 IDE
            </span>
          </div>
        </div>

        {/* Dual Mode Switcher: Junior / Assisted vs Engineer / Advanced */}
        <div className="flex items-center bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
          <button
            onClick={() => setUserMode('junior')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
              userMode === 'junior'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
            title="Modo Júnior: Explicações visuais, dicas de segurança e wizards guiados"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('mode.junior.badge', 'Júnior / Assistido')}</span>
            <span className="md:hidden">Júnior</span>
          </button>

          <button
            onClick={() => setUserMode('advanced')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
              userMode === 'advanced'
                ? 'bg-[#238636] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
            title="Modo Engenheiro: Acesso aos bytes brutos, inspetor AST e logs BPF do terminal"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('mode.advanced.badge', 'Engenheiro / Avançado')}</span>
            <span className="md:hidden">Engenheiro</span>
          </button>
        </div>
      </div>

      {/* Right: Trilingual Selector, Quick Audit Badge, Cloud & Github */}
      <div className="flex items-center gap-2">
        {/* Audit Score Badge */}
        <button
          onClick={onRunAudit}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold transition-all ${getScoreColor()}`}
          title="Clique para executar a verificação de segurança completa"
        >
          {criticalCount > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-[#ff7b72] animate-pulse" />
          ) : highCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-[#f0883e]" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#7ee787]" />
          )}
          <span>{auditScore}/100</span>
          <span className="hidden lg:inline text-[10px] opacity-80 uppercase font-sans">
            ({t('nav.audit_score', 'Auditoria')})
          </span>
        </button>

        {/* Trilingual Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-all font-medium text-xs"
            title="Selecionar Idioma do Sistema"
          >
            <Globe className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span className="font-mono text-[11px]">{currentLangObj.flag}</span>
            <span className="hidden sm:inline font-sans text-xs">{currentLangObj.code.toUpperCase()}</span>
            <ChevronDown className="w-3 h-3 text-[#8b949e]" />
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl py-1 z-50 animate-fadeIn">
              <div className="px-3 py-1 text-[10px] font-mono uppercase text-[#8b949e] border-b border-[#30363d]/60 mb-1">
                Idioma / Language / Idioma
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsLangDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs hover:bg-[#21262d] transition-colors ${
                    language === lang.code ? 'text-[#58a6ff] font-bold bg-[#1f6feb]/10' : 'text-[#c9d1d9]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </span>
                  {language === lang.code && <CheckCircle2 className="w-3.5 h-3.5 text-[#58a6ff]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GitHub Export Quick Action */}
        <button
          onClick={() => onOpenGithub?.('export')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-medium text-xs transition-colors shadow-sm"
          title="Exportar projeto para o GitHub ou baixar CI/CD"
        >
          <Github className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{t('nav.github_push', 'GitHub / Exportar')}</span>
        </button>

        {/* Cloud Account Status */}
        <button
          onClick={onOpenCloud}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-all font-medium text-xs"
          title="Gerenciar Projetos Cloud e Autenticação"
        >
          <Cloud className="w-3.5 h-3.5 text-[#a5d6ff]" />
          <span className="hidden lg:inline">{user ? user.email?.split('@')[0] : t('nav.cloud_projects', 'Cloud')}</span>
        </button>

        {/* Tour / Guide Modal Button */}
        <button
          onClick={onOpenTour}
          className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] transition-all"
          title={t('nav.system_tour', 'Tutorial do IDE')}
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
