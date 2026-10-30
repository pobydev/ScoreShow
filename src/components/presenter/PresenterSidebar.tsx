/**
 * 발표 화면 좌측의 접을 수 있는 학생 목록 틀
 */

import type { ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

export function PresenterSidebar({
  isExpanded,
  onExpandedChange,
  children,
}: {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`border-r flex flex-col transition-all duration-300 h-full ${
          isExpanded ? "w-64" : "w-0"
        } overflow-hidden`}
        style={{
          backgroundColor: 'var(--sidebar)',
          borderColor: 'var(--sidebar-border)'
        }}
      >
        {/* 접힌 상태일 때도 보이는 토글 버튼 */}
        {!isExpanded && (
          <button
            onClick={() => onExpandedChange(true)}
            className="absolute left-0 top-0 bottom-0 w-8 border-r flex items-center justify-center transition-colors z-10"
            style={{
              backgroundColor: 'var(--sidebar)',
              borderColor: 'var(--sidebar-border)',
              color: 'var(--muted-foreground)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)';
              e.currentTarget.style.color = 'var(--sidebar-foreground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--sidebar)';
              e.currentTarget.style.color = 'var(--muted-foreground)';
            }}
            aria-label="목록 펼치기"
            type="button"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}

        {isExpanded && (
          <>
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--sidebar-foreground)' }}>학생 목록</h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandedChange(false);
                }}
                className="transition-colors flex-shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--sidebar-foreground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted-foreground)';
                }}
                aria-label="목록 접기"
                type="button"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
