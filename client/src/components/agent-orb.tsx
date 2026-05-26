'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AgentDefinition } from '@/lib/agents';

interface AgentOrbProps {
  agent: AgentDefinition;
  speaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showCodename?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { orb: 36, ring: 48, font: 'text-[10px]' },
  md: { orb: 52, ring: 68, font: 'text-xs' },
  lg: { orb: 72, ring: 90, font: 'text-sm' },
};

export function AgentOrb({
  agent,
  speaking = false,
  size = 'md',
  showName = false,
  showCodename = false,
  className,
}: AgentOrbProps) {
  const s = SIZE_MAP[size];

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative flex items-center justify-center" style={{ width: s.ring, height: s.ring }}>
        {/* Outer pulse ring — only when speaking */}
        {speaking && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: s.ring,
              height: s.ring,
              border: `1.5px solid ${agent.color}`,
              opacity: 0.6,
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Secondary glow ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: s.orb + 12,
            height: s.orb + 12,
            background: `radial-gradient(circle, ${agent.glowColor} 0%, transparent 70%)`,
          }}
          animate={speaking ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.9, repeat: speaking ? Infinity : 0, ease: 'easeInOut' }}
        />

        {/* Core sphere */}
        <motion.div
          className="relative rounded-full flex items-center justify-center select-none cursor-default"
          style={{
            width: s.orb,
            height: s.orb,
            background: `radial-gradient(circle at 32% 28%, ${lighten(agent.color, 40)}, ${agent.color} 55%, ${darken(agent.color, 30)} 100%)`,
            boxShadow: speaking
              ? `0 0 20px ${agent.glowColor}, 0 0 40px ${agent.glowColor}, inset 0 1px 1px rgba(255,255,255,0.25)`
              : `0 0 12px ${agent.glowColor}, inset 0 1px 1px rgba(255,255,255,0.18)`,
          }}
          animate={speaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, repeat: speaking ? Infinity : 0, ease: 'easeInOut' }}
          whileHover={{ scale: 1.08 }}
        >
          <span className="text-base select-none pointer-events-none" style={{ fontSize: s.orb * 0.42 }}>
            {agent.emoji}
          </span>
        </motion.div>
      </div>

      {showName && (
        <div className="text-center">
          <p className={cn('font-body font-semibold text-[#ede9f5]', s.font)}>{agent.name}</p>
          {showCodename && (
            <p className="text-[10px] font-mono text-[#9b8fb8]/60">{agent.codename}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Simple hex color helpers (no external lib needed)
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r - amount, g - amount, b - amount);
}
