// ==UserScript==
// @name         小红书下载器
// @namespace    https://github.com/BOYGAGAGA
// @version      2.0.0
// @description  在小红书页面添加下载按钮，一键下载图片/视频/正文
// @author       BOYGAGA
// @match        https://www.xiaohongshu.com/explore/*
// @match        https://www.xiaohongshu.com/discovery/item/*
// @icon         https://www.xiaohongshu.com/favicon.ico
// @grant        none
// @license      MIT
// @homepage     https://github.com/BOYGAGAGA/rednote-downloader
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // 配置
  // ============================================================
  const SERVER_URL = 'http://localhost:3000'; // 本地服务器地址

  // ============================================================
  // 样式注入
  // ============================================================
  const style = document.createElement('style');
  style.textContent = `
    #rednote-dl-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #ff2442, #ff4d6a);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(255, 36, 66, 0.4);
      transition: all 0.3s ease;
      animation: rednote-dl-pulse 2s infinite;
    }

    #rednote-dl-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(255, 36, 66, 0.6);
      animation: none;
    }

    #rednote-dl-btn:active {
      transform: scale(0.95);
    }

    #rednote-dl-btn svg {
      width: 24px;
      height: 24px;
      color: white;
    }

    #rednote-dl-tooltip {
      position: fixed;
      bottom: 84px;
      right: 24px;
      background: #1e1e1e;
      color: #fff;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 8px;
      white-space: nowrap;
      z-index: 99999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    }

    #rednote-dl-btn:hover + #rednote-dl-tooltip,
    #rednote-dl-btn:hover ~ #rednote-dl-tooltip {
      opacity: 1;
    }

    @keyframes rednote-dl-pulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(255, 36, 66, 0.4); }
      50% { box-shadow: 0 4px 24px rgba(255, 36, 66, 0.7); }
    }

    #rednote-dl-btn.downloading {
      animation: rednote-dl-spin 1s linear infinite;
    }

    @keyframes rednote-dl-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    #rednote-dl-btn.done {
      background: linear-gradient(135deg, #00c853, #69f0ae);
      animation: none;
    }
  `;
  document.head.appendChild(style);

  // ============================================================
  // 创建按钮
  // ============================================================
  const btn = document.createElement('button');
  btn.id = 'rednote-dl-btn';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  `;

  const tooltip = document.createElement('div');
  tooltip.id = 'rednote-dl-tooltip';
  tooltip.textContent = '下载此笔记';

  document.body.appendChild(btn);
  document.body.appendChild(tooltip);

  // ============================================================
  // 获取当前笔记 URL
  // ============================================================
  function getCurrentNoteUrl() {
    return window.location.href;
  }

  // ============================================================
  // 点击下载
  // ============================================================
  btn.addEventListener('click', async () => {
    const noteUrl = getCurrentNoteUrl();

    // 检查服务器是否运行
    try {
      await fetch(SERVER_URL + '/api/progress', { method: 'GET' });
    } catch (e) {
      tooltip.textContent = '⚠️ 请先启动下载器服务器';
      tooltip.style.opacity = '1';
      tooltip.style.background = '#ff2442';
      setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.background = '#1e1e1e';
      }, 3000);
      return;
    }

    // 开始下载
    btn.classList.add('downloading');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    `;
    tooltip.textContent = '正在解析...';
    tooltip.style.opacity = '1';

    try {
      // 解析笔记
      const res = await fetch(SERVER_URL + '/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: noteUrl })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // 一键保存
      tooltip.textContent = '正在保存...';
      const saveRes = await fetch(SERVER_URL + '/api/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, savePath: '' })
      });
      const saveResult = await saveRes.json();

      if (!saveRes.ok) throw new Error(saveResult.error);

      // 成功
      btn.classList.remove('downloading');
      btn.classList.add('done');
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      tooltip.textContent = `✅ 已保存 ${saveResult.files?.length || 0} 个文件到桌面`;
      tooltip.style.background = '#00c853';

      setTimeout(() => {
        btn.classList.remove('done');
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        `;
        tooltip.style.opacity = '0';
        tooltip.style.background = '#1e1e1e';
      }, 3000);

    } catch (e) {
      btn.classList.remove('downloading');
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      `;
      tooltip.textContent = '❌ ' + (e.message || '下载失败');
      tooltip.style.background = '#ff2442';

      setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.background = '#1e1e1e';
      }, 3000);
    }
  });
})();
