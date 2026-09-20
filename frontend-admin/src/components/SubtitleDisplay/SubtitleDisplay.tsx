import React, { useEffect, useRef, useState } from 'react';
import { Subtitles, Clock, ArrowDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/utils/helpers';
import type { RecognitionStatus } from '@/types';
import { SubtitleItem } from './SubtitleItem';

// 距底部小于该阈值时视为「贴底」，新内容到达才自动滚动
const AT_BOTTOM_THRESHOLD = 80;

// 各类识别状态在空态区的提示文案与处理办法
const EMPTY_STATE_HINTS: Record<RecognitionStatus, { title: string; hint: string }> = {
  idle: {
    title: '暂无字幕内容',
    hint: '处理办法：点击左侧「开启麦克风」，开始识别语音',
  },
  listening: {
    title: '正在聆听…',
    hint: '请开始说话，识别结果会实时显示在这里',
  },
  interrupted: {
    title: '识别被浏览器打断',
    hint: '处理办法：检查麦克风权限与设备后，重新点击「开启麦克风」',
  },
  'network-error': {
    title: '网络连接已断开',
    hint: '处理办法：检查网络连接，恢复后重新开启麦克风',
  },
  'no-result': {
    title: '一直没有识别到结果',
    hint: '处理办法：靠近麦克风，用设置的源语言清晰说话',
  },
};

// 各类识别状态在底部状态栏的指示样式
const STATUS_BADGES: Record<RecognitionStatus, { dotClass: string; label: string }> = {
  idle: { dotClass: 'bg-dark-600', label: '等待开始' },
  listening: { dotClass: 'bg-accent-green animate-pulse', label: '实时识别中' },
  interrupted: { dotClass: 'bg-accent-yellow', label: '识别被打断' },
  'network-error': { dotClass: 'bg-accent-red', label: '网络已断开' },
  'no-result': { dotClass: 'bg-accent-yellow animate-pulse', label: '未识别到结果' },
};

export const SubtitleDisplay: React.FC = () => {
  const subtitles = useAppStore(state => state.subtitles);
  const currentSubtitle = useAppStore(state => state.currentSubtitle);
  const recognitionStatus = useAppStore(state => state.recognitionStatus);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 用户是否停留在底部附近（用 ref 避免滚动事件频繁触发渲染）
  const isAtBottomRef = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  // 顶部时钟：每秒更新一次
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 跟踪用户滚动位置，判断是否需要显示「回到最新」
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_THRESHOLD;
    isAtBottomRef.current = atBottom;
    setShowJumpToBottom(!atBottom);
  };

  // 仅当用户停留在底部时才自动滚动，向上翻阅时不抢视线
  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subtitles, currentSubtitle]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    isAtBottomRef.current = true;
    setShowJumpToBottom(false);
  };

  // 条数与列表实际渲染的条目保持一致（历史 + 正在识别的一条）
  const totalCount = subtitles.length + (currentSubtitle ? 1 : 0);
  const emptyHint = EMPTY_STATE_HINTS[recognitionStatus];
  const statusBadge = STATUS_BADGES[recognitionStatus];

  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-0 glass-panel rounded-2xl">
      {/* 标题栏 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-dark-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <Subtitles className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">实时字幕</h2>
            <p className="text-xs text-dark-500">中英双语对照显示</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <Clock className="w-4 h-4" />
          <span>{formatTime(now)}</span>
        </div>
      </header>

      {/* 字幕内容区 */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
        >
          {subtitles.length === 0 && !currentSubtitle ? (
            <div className="flex flex-col items-center justify-center h-full text-dark-500">
              <Subtitles className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">{emptyHint.title}</p>
              <p className="text-sm mt-2">{emptyHint.hint}</p>
            </div>
          ) : (
            <>
              {/* 历史字幕 */}
              {subtitles.map(subtitle => (
                <SubtitleItem key={subtitle.id} subtitle={subtitle} />
              ))}

              {/* 当前正在识别的内容 */}
              {currentSubtitle && (
                <div className="glass-card p-4 border-l-4 border-primary-500 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 animate-pulse" />
                    <div className="flex-1">
                      <p className="text-dark-100 text-lg typing-cursor">
                        {currentSubtitle}
                      </p>
                      <p className="text-dark-500 text-sm mt-2 italic">
                        正在识别...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 向上翻阅时显示「回到最新」入口 */}
        {showJumpToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-6 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-800/90 hover:bg-dark-700 border border-white/10 rounded-full text-dark-200 hover:text-dark-100 shadow-lg transition-all"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            回到最新
          </button>
        )}
      </div>

      {/* 底部状态栏 */}
      <footer className="px-6 py-3 border-t border-white/10 bg-dark-900/50">
        <div className="flex items-center justify-between text-xs text-dark-500">
          <span>共 {totalCount} 条字幕</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${statusBadge.dotClass}`}
            />
            <span>{statusBadge.label}</span>
          </div>
        </div>
      </footer>
    </main>
  );
};
