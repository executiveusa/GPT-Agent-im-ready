'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { getVisibleAgents, getAllAgents, type AgentDefinition } from '@/lib/agents';
import { AgentOrb } from './agent-orb';
import { useSettings } from '@/lib/settings-store';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FleetGridProps {
  showHidden?: boolean;
  onSelectAgent?: (agentId: string) => void;
  selectedIds?: string[];
  compact?: boolean;
}

export function FleetGrid({
  showHidden = false,
  onSelectAgent,
  selectedIds = [],
  compact = false,
}: FleetGridProps) {
  const settings = useSettings();
  const agents = showHidden ? getAllAgents() : getVisibleAgents();

  const visibleAgents = agents.filter(
    (a) => !a.hidden || (a.id === 'pauli' && settings.showPauli) || showHidden
  );

  return (
    <div
      className={cn(
        'grid gap-3',
        compact
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {visibleAgents.map((agent, i) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          index={i}
          compact={compact}
          isSelected={selectedIds.includes(agent.id)}
          onSelect={onSelectAgent ? () => onSelectAgent(agent.id) : undefined}
        />
      ))}
    </div>
  );
}

interface AgentCardProps {
  agent: AgentDefinition;
  index: number;
  compact: boolean;
  isSelected: boolean;
  onSelect?: () => void;
}

function AgentCard({ agent, index, compact, isSelected, onSelect }: AgentCardProps) {
  const providerLabel = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    demo: 'Demo',
  }[agent.provider];

  const providerColor = {
    openai: 'text-emerald-400',
    anthropic: 'text-violet-400',
    demo: 'text-[#9b8fb8]',
  }[agent.provider];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      onClick={onSelect}
      className={cn(
        'relative rounded-xl border transition-all duration-200',
        compact ? 'p-3' : 'p-4',
        isSelected
          ? 'border-opacity-100 bg-surface-800'
          : 'border-violet-900/25 bg-surface-900 hover:bg-surface-800 hover:border-violet-800/40',
        onSelect && 'cursor-pointer',
        isSelected && 'ring-2 ring-offset-1 ring-offset-surface-950'
      )}
      style={isSelected ? { borderColor: agent.color, '--tw-ring-color': agent.color } as React.CSSProperties : {}}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: agent.color }}
        />
      )}

      {compact ? (
        <div className="flex items-center gap-2.5">
          <AgentOrb agent={agent} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-body font-semibold text-[#ede9f5] truncate">{agent.name}</p>
            <p className="text-[10px] font-mono text-[#9b8fb8]/60">{agent.codename}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <AgentOrb agent={agent} size="md" showName showCodename />
            <span className={cn('text-[10px] font-mono mt-0.5', providerColor)}>
              {providerLabel}
            </span>
          </div>

          <p className="text-xs text-[#9b8fb8] font-body leading-relaxed mb-3">
            {agent.description}
          </p>

          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-md"
              style={{
                background: `${agent.color}18`,
                color: agent.color,
                border: `1px solid ${agent.color}30`,
              }}
            >
              {agent.role}
            </span>

            {!onSelect && (
              <Link
                href={`/council?a1=${agent.id}`}
                className="flex items-center gap-1 text-[10px] font-body text-[#9b8fb8]/60 hover:text-[#ede9f5] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Launch <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
