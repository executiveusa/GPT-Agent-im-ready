'use client';

import { Navbar } from '@/components/navbar';
import { FleetGrid } from '@/components/fleet-grid';
import { motion } from 'framer-motion';
import { useSettings } from '@/lib/settings-store';
import { getVisibleAgents, getAllAgents } from '@/lib/agents';
import { AgentOrb } from '@/components/agent-orb';
import Link from 'next/link';
import { Settings, Zap } from 'lucide-react';

export default function FleetPage() {
  const settings = useSettings();
  const allAgents = getAllAgents();
  const visibleCount = getVisibleAgents().length;

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-950">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="w-8 h-px bg-coral-500/60 mb-5" />
                <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#ede9f5] mb-2">
                  Agent Fleet
                </h1>
                <p className="text-sm text-[#9b8fb8] font-body">
                  {visibleCount} agents active · Pi multi-provider runtime ·{' '}
                  <span className="text-violet-400">agent-fleet-v1</span>
                </p>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-900/30 text-xs font-body text-[#9b8fb8] hover:text-[#ede9f5] hover:border-violet-800/40 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </Link>
            </div>
          </motion.div>

          {/* Hierarchy Banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mb-8 p-4 rounded-xl border border-violet-900/25 bg-surface-900"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-body font-semibold text-[#ede9f5]">Fleet Hierarchy</span>
            </div>
            <HierarchyRow />
          </motion.div>

          {/* Active Council Preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-8 p-4 rounded-xl border border-coral-500/20 bg-surface-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-body font-semibold text-[#ede9f5] mb-1">Active Council Pair</p>
                <p className="text-xs text-[#9b8fb8] font-body">
                  Currently configured in{' '}
                  <Link href="/settings" className="text-violet-400 hover:underline">Settings</Link>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ActiveAgentBadge agentId={settings.agent1Id} />
                <span className="text-xs text-[#9b8fb8]/50 font-mono">×</span>
                <ActiveAgentBadge agentId={settings.agent2Id} />
                <Link
                  href={`/council?a1=${settings.agent1Id}&a2=${settings.agent2Id}`}
                  className="ml-2 px-3 py-1.5 rounded-lg bg-coral-500 text-surface-950 text-xs font-body font-semibold hover:bg-coral-400 transition-colors"
                >
                  Launch
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Fleet Grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <FleetGrid showHidden={settings.showPauli} />
          </motion.div>
        </div>
      </main>
    </>
  );
}

function HierarchyRow() {
  const tiers = [
    { label: 'Pauli (Shadow)', color: '#d4af37', codename: 'PLI-000' },
    { label: 'Agent Zero', color: '#6366f1', codename: 'AZ-001' },
    { label: 'Devika', color: '#06b6d4', codename: 'DVK-002' },
    { label: 'DARYA + Fleet', color: '#ec4899', codename: 'DRY-004+' },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tiers.map((tier, i) => (
        <div key={tier.codename} className="flex items-center gap-1">
          <span
            className="text-[10px] font-mono px-2 py-1 rounded-md"
            style={{
              background: `${tier.color}15`,
              color: tier.color,
              border: `1px solid ${tier.color}25`,
            }}
          >
            {tier.label}
          </span>
          {i < tiers.length - 1 && (
            <span className="text-[#9b8fb8]/30 text-xs">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ActiveAgentBadge({ agentId }: { agentId: string }) {
  const allAgents = getAllAgents();
  const agent = allAgents.find((a) => a.id === agentId);
  if (!agent) return null;

  return (
    <div className="flex items-center gap-1.5">
      <AgentOrb agent={agent} size="sm" />
      <span className="text-xs font-body text-[#ede9f5]">{agent.name}</span>
    </div>
  );
}
