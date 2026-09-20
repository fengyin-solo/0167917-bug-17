import React, { useEffect, useRef, useState } from 'react';
import { Subtitles, Clock, AlertTriangle, WifiOff, Mic, ArrowDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/utils/helpers';
import { SubtitleItem } from './SubtitleItem';

// 距底部多少像素以内视为"正在跟随最新内容"
const STICK_THRESHOLD = 80;

export const SubtitleDisplay: React.FC = () => {
  const subtitles = useAppStore(state => state.subtitles);
  const currentSubtitle = useAppStore(state => state.currentSubtitle);
  const isMicOn = useAppStore(state => state.isMicOn);
  const recognitionStatus = useAppStore(state => state.recognitionStatus);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 用户是否停留在底部附近，决定是否跟随新内容自动滚动
  const stickToBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [now, setNow] = useState(() => new Date());

  // 顶部时钟每秒更新
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 仅在用户停留在底部附近时跟随新内容滚动，向上翻阅时不打断视线
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [subtitles, currentSubtitle]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
    stickToBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  // 空态提示：按识别状态区分，写清各自的处理办法
  const renderEmptyState = () => {
    if (recognitionStatus === 'interrupted') {
      return (
        <>
          <AlertTriangle className="w-16 h-16 mb-4 text-accent-yellow opacity-60" />
          <p className="text-lg">识别被浏览器打断</p>
          <p className="text-sm mt-2">请重新开启麦克风以继续识别</p>
        </>
      );
    }
    if (recognitionStatus === 'network-error') {
      return (
        <>
          <WifiOff className="w-16 h-16 mb-4 text-accent-red opacity-60" />
          <p className="text-lg">网络连接已断开</p>
          <p className="text-sm mt-2">语音识别需要联网，请检查网络后重新开启麦克风</p>
        </>
      );
    }
    if (recognitionStatus === 'no-result') {
      return (
        <>
          <Mic className="w-16 h-16 mb-4 text-accent-yellow opacity-60" />
          <p className="text-lg">一直没有识别到内容</p>
          <p className="text-sm mt-2">请靠近麦克风清晰说话，并确认源语言设置正确</p>
        </>
      );
    }
    if (isMicOn) {
      return (
        <>
          <Subtitles className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">正在聆听...</p>
          <p className="text-sm mt-2">请开始说话，识别结果将实时显示在这里</p>
        </>
      );
    }
    return (
      <>
        <Subtitles className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">暂无字幕内容</p>
        <p className="text-sm mt-2">开启麦克风开始识别语音</p>
      </>
    );
  };

  // 与列表实际渲染的条目保持一致：历史字幕 + 正在识别的那一条
  const totalCount = subtitles.length + (currentSubtitle ? 1 : 0);

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
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-6 space-y-4 scroll-smooth"
        >
          {subtitles.length === 0 && !currentSubtitle ? (
            <div className="flex flex-col items-center justify-center h-full text-dark-500">
              {renderEmptyState()}
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

        {/* 向上翻阅时提供回到最新的入口 */}
        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600/90 hover:bg-primary-500 text-white text-xs shadow-lg shadow-primary-600/30 transition-all"
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
              className={`w-2 h-2 rounded-full ${
                isMicOn ? 'bg-accent-green animate-pulse' : 'bg-dark-600'
              }`}
            />
            <span>{isMicOn ? '实时识别中' : '等待开始'}</span>
          </div>
        </div>
      </footer>
    </main>
  );
};
