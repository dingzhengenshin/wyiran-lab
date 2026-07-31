"use client";

import { useCallback, useEffect, useState } from "react";

const IOS_GAME_URL = "tencentmsdk1104466820://";
const ANDROID_GAME_URL =
  "intent://launch#Intent;scheme=tencentmsdk1104466820;package=com.tencent.tmgp.sgame;end";
const OFFICIAL_SITE = "https://pvp.qq.com/";

function getGameUrl() {
  return /Android/i.test(navigator.userAgent)
    ? ANDROID_GAME_URL
    : IOS_GAME_URL;
}

export function LaunchCard() {
  const [showFallback, setShowFallback] = useState(false);

  const launchGame = useCallback(() => {
    window.location.href = getGameUrl();
    window.setTimeout(() => setShowFallback(true), 1600);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(launchGame, 550);
    return () => window.clearTimeout(timer);
  }, [launchGame]);

  return (
    <main className="shell">
      <div className="glow glowOne" />
      <div className="glow glowTwo" />
      <section className="card" aria-live="polite">
        <div className="candy" aria-hidden="true">
          <span>♡</span>
        </div>
        <p className="eyebrow">情侣关系申请</p>
        <h1>正在处理申请…</h1>
        <p className="hint">
          {showFallback
            ? "没有自动跳转？点一下就好。"
            : "请稍候，马上为你打开。"}
        </p>
        <div className="loader" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        {showFallback && (
          <div className="actions">
            <button type="button" onClick={launchGame}>
              打开王者荣耀
            </button>
            <a href={OFFICIAL_SITE}>前往王者荣耀官网</a>
          </div>
        )}
        <p className="privacy">本页面不收集登录信息或个人数据</p>
      </section>
    </main>
  );
}
