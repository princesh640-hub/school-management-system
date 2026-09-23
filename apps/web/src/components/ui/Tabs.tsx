'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  style?: React.CSSProperties;
}

export function Tabs({ tabs, activeTab, onChange, style }: TabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-default)',
        gap: 8,
        overflowX: 'auto',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              fontSize: '0.925rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${isActive ? 'var(--brand-primary)' : 'transparent'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: -1,
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isActive ? 'var(--brand-primary-light)' : 'var(--surface-subtle)',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
