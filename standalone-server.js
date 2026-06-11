const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, execSync } = require('child_process');
// pkg resource path
const RESOURCES = typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : __dirname;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname), { index: false }));

// SSE 进度推送
const clients = new Set();

app.get('/api/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function sendProgress(step, message) {
  const data = JSON.stringify({ step, message });
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}

// 移动端 UA 列表（轮换使用，降低被检测概率）
const MOBILE_UAS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S23) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
];

function getRandomUA() {
  return MOBILE_UAS[Math.floor(Math.random() * MOBILE_UAS.length)];
}

// 检查是否是屏蔽消息
function isBlocked(text) {
  if (!text) return false;
  return text.includes('仅支持在小红书') ||
         text.includes('APP 内查看') ||
         text.includes('马上登录') ||
         text.includes('仅支持在APP') ||
         text.includes('你访问的页面不见了');
}

// ============================================================
// 主路由
// ============================================================
app.post('/api/download', async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: '请输入链接' });

    const urlMatch = url.match(/https?:\/\/[^\s]+/);
    if (urlMatch) url = urlMatch[0];

    console.log('[解析] 输入链接:', url);
    sendProgress(1, '正在解析链接...');

    // Step 1: 跟随重定向
    let realUrl = url;
    if (url.includes('xhslink.com') || url.includes('xhs.cn')) {
      sendProgress(2, '正在获取真实链接...');
      realUrl = await followRedirect(url);
    }

    // Step 2: 提取笔记 ID
    sendProgress(3, '正在提取笔记ID...');
    const noteId = extractNoteId(realUrl);
    if (!noteId) return res.status(400).json({ error: '无法提取笔记ID，请检查链接' });
    console.log('[解析] 笔记ID:', noteId);

    // Step 3: 用 Puppeteer 提取内容（核心方案）
    sendProgress(4, '正在启动浏览器...');
    let noteData = await fetchNoteWithPuppeteer(noteId, realUrl);

    // 如果 Puppeteer 提取不完整（标题为空），用 axios 备用方案
    if (!noteData.title) {
      console.log('[备用] Puppeteer 提取不完整，切换 axios 方案...');
      sendProgress(5, '正在用备用方案获取...');
      try {
        const axios = require('axios');
        const resp = await axios.get(realUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Referer': 'https://www.xiaohongshu.com/'
          },
          timeout: 15000
        });
        const html = resp.data;
        // 从 __INITIAL_STATE__ 提取
        const stateMatch = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
        if (stateMatch) {
          const stateStr = stateMatch[1].replace(/undefined/g, 'null');
          const state = JSON.parse(stateStr);
          if (state.note && state.note.noteDetailMap) {
            const keys = Object.keys(state.note.noteDetailMap);
            if (keys.length > 0) {
              const note = state.note.noteDetailMap[keys[0]].note || state.note.noteDetailMap[keys[0]];
              const nc = note.note_card || note;
              const user = nc.user || note.user || {};
              const imgList = nc.image_list || note.image_list || nc.imageList || [];
              const images = imgList.map(img => {
                const info = (img.infoList || []).find(i => i.imageScene === 'WB_DFT') || (img.infoList || [])[0];
                return info ? info.url : (img.url_default || img.url || '');
              }).filter(Boolean);

              noteData = {
                title: nc.title || note.title || '',
                author: user.nickname || user.nick_name || '',
                cover: images[0] || '',
                videoUrl: '',
                images: images,
                content: nc.desc || note.desc || '',
                publishTime: (() => {
                  const ts = nc.time || note.time || nc.create_time || note.create_time || '';
                  if (typeof ts === 'number' && ts > 0) {
                    const d = new Date(ts > 1e12 ? ts : ts * 1000);
                    return d.toISOString().slice(0, 10);
                  }
                  return typeof ts === 'string' ? ts.slice(0, 10) : '';
                })()
              };
              console.log('[备用] axios 提取成功:', noteData.title);
            }
          }
        }
      } catch (axiosErr) {
        console.log('[备用] axios 方案也失败:', axiosErr.message);
      }
    }

    sendProgress(7, '解析完成');

    // 添加原始链接
    noteData.originalUrl = realUrl;

    console.log('[返回数据]', JSON.stringify(noteData, null, 2));
    res.json(noteData);
  } catch (err) {
    console.error('[错误]', err.message);
    res.status(500).json({ error: err.message || '解析失败，请重试' });
  }
});

// 视频代理下载（解决 CDN 403 问题）
app.get('/api/proxy-video', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '缺少 url 参数' });

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': getRandomUA(),
        'Referer': 'https://www.xiaohongshu.com/',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Origin': 'https://www.xiaohongshu.com'
      },
      timeout: 60000
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    res.setHeader('Content-Length', response.headers['content-length'] || '');
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);
  } catch (err) {
    console.error('[代理视频错误]', err.message);
    res.status(500).json({ error: '视频下载失败' });
  }
});

// 图片代理下载
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: '缺少 url 参数' });

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': getRandomUA(),
        'Referer': 'https://www.xiaohongshu.com/',
        'Accept': 'image/*,*/*'
      },
      timeout: 30000
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="image.jpg"');
    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);
  } catch (err) {
    console.error('[代理图片错误]', err.message);
    res.status(500).json({ error: '图片下载失败' });
  }
});

// 获取桌面路径
app.get('/api/desktop-path', (req, res) => {
  const desktop = path.join(os.homedir(), 'Desktop');
  res.json({ path: desktop });
});

// 一键保存全部到指定目录
app.post('/api/save-all', async (req, res) => {
  const { data, savePath } = req.body;
  if (!data) return res.status(400).json({ error: '缺少数据' });

  const baseDir = savePath || path.join(os.homedir(), 'Desktop');
  const folderName = sanitizeFolderName(data.author, data.title, data.publishTime);
  const targetDir = path.join(baseDir, folderName);

  try {
    // 创建文件夹
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('[保存] 目标目录:', targetDir);

    const results = { folder: targetDir, files: [], errors: [] };

    // 保存正文
    if (data.content) {
      try {
        const textContent = `${data.title || '无标题'}\n作者: ${data.author || '未知'}\n发布时间: ${data.publishTime || '未知'}\n原链接: ${data.originalUrl || '未知'}\n\n${data.content}`;
        fs.writeFileSync(path.join(targetDir, '正文.txt'), textContent, 'utf-8');
        results.files.push('正文.txt');
      } catch (e) {
        results.errors.push('正文: ' + e.message);
      }
    }

    // 下载图片
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        try {
          const resp = await axios({
            method: 'get',
            url: data.images[i],
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': getRandomUA(),
              'Referer': 'https://www.xiaohongshu.com/'
            },
            timeout: 30000
          });
          const ext = (resp.headers['content-type'] || '').includes('webp') ? 'webp' : 'jpg';
          const filename = `image_${i + 1}.${ext}`;
          fs.writeFileSync(path.join(targetDir, filename), resp.data);
          results.files.push(filename);
        } catch (e) {
          results.errors.push(`图片${i + 1}: ${e.message}`);
        }
      }
    }

    // 下载视频
    if (data.videoUrl) {
      try {
        const resp = await axios({
          method: 'get',
          url: data.videoUrl,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': getRandomUA(),
            'Referer': 'https://www.xiaohongshu.com/',
            'Accept': '*/*',
            'Origin': 'https://www.xiaohongshu.com'
          },
          timeout: 120000
        });
        fs.writeFileSync(path.join(targetDir, 'video.mp4'), resp.data);
        results.files.push('video.mp4');
      } catch (e) {
        results.errors.push('视频: ' + e.message);
      }
    }

    console.log('[保存] 完成:', results);
    res.json(results);
  } catch (err) {
    console.error('[保存错误]', err.message);
    res.status(500).json({ error: '保存失败: ' + err.message });
  }
});

function sanitizeFolderName(author, title, publishTime) {
  const parts = [];
  if (author) parts.push(author.replace(/[\\/:*?"<>|]/g, '_').trim());
  if (title) parts.push(title.replace(/[\\/:*?"<>|]/g, '_').trim().substring(0, 60));
  parts.push(publishTime || new Date().toISOString().slice(0, 10));
  return parts.join(' - ') || '小红书笔记';
}

// 跟随重定向
async function followRedirect(shortUrl) {
  try {
    const resp = await axios.get(shortUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: { 'User-Agent': getRandomUA() }
    });
    return resp.headers.location || shortUrl;
  } catch (err) {
    if (err.response && err.response.headers.location) return err.response.headers.location;
    return shortUrl;
  }
}

// 提取笔记 ID
function extractNoteId(url) {
  const patterns = [
    /\/explore\/([a-f0-9]+)/,
    /\/discovery\/item\/([a-f0-9]+)/,
    /\/note\/([a-f0-9]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ============================================================
// 从 Edge 浏览器提取小红书 cookies
// ============================================================
function getEdgeCookies() {
  try {
    // Windows 上 Edge cookies 存在 SQLite 数据库中
    // 但直接读取需要关闭 Edge，所以我们用另一种方式
    // 尝试从 Edge 的 Local State 和 Cookies 文件复制
    const edgeDataDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data');
    const cookiesPath = path.join(edgeDataDir, 'Default', 'Cookies');

    if (!fs.existsSync(cookiesPath)) {
      console.log('[Cookies] Edge cookies 文件不存在');
      return '';
    }

    // 注意：Edge 运行时 cookies 文件被锁定
    // 我们需要用 sqlite3 来读取，或者用其他方式
    console.log('[Cookies] Edge cookies 路径:', cookiesPath);
    return null; // 返回 null 表示需要其他方式
  } catch (e) {
    console.log('[Cookies] 提取失败:', e.message);
    return null;
  }
}

// ============================================================
// Puppeteer 核心提取逻辑
// ============================================================
async function fetchNoteWithPuppeteer(noteId, url) {
  let browser = null;

  try {
    const puppeteer = require('puppeteer-core');

    sendProgress(5, '正在启动浏览器...');

    // 自动检测 Chrome/Edge 路径
    const chromePaths = [
      process.env.CHROME_PATH,
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      (process.env.LOCALAPPDATA || '') + '/Microsoft/Edge/Application/msedge.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ].filter(Boolean);
    const execPath = chromePaths.find(p => { try { return fs.existsSync(p); } catch(e) { return false; } });
    if (!execPath) throw new Error('未找到 Chrome 或 Edge 浏览器，请安装后重试');
    console.log('[浏览器]', execPath);

    // 尝试连接到已运行的 Edge（远程调试模式）
    let connectedToExisting = false;
    try {
      browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
      });
      connectedToExisting = true;
      console.log('[浏览器] 已连接到运行中的 Edge');
    } catch (e) {
      // 连接失败，启动新实例
      console.log('[浏览器] 无法连接到运行中的 Edge，启动新实例');
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: execPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--lang=zh-CN'
        ]
      });
    }

    const page = await browser.newPage();

    // 隐藏自动化特征
    await page.evaluateOnNewDocument(`function() {
      Object.defineProperty(navigator, 'webdriver', { get: function() { return undefined; } });
      window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {} };
      Object.defineProperty(navigator, 'plugins', {
        get: function() {
          return [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
          ];
        }
      });
      Object.defineProperty(navigator, 'languages', { get: function() { return ['zh-CN', 'zh', 'en-US', 'en']; } });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: function() { return 8; } });
      Object.defineProperty(navigator, 'deviceMemory', { get: function() { return 8; } });
    }`);

    // 移动端 UA（SSR 返回更丰富的数据）
    const ua = getRandomUA();
    await page.setUserAgent(ua);
    await page.setViewport({ width: 390, height: 844 });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.xiaohongshu.com/'
    });

    sendProgress(6, '正在获取笔记数据...');

    // 保留 xsec_token 等查询参数
    const urlObj = new URL(url.replace('/discovery/item/', '/explore/'));
    const exploreUrl = urlObj.origin + urlObj.pathname + urlObj.search;
    console.log('[Puppeteer] 直接导航:', exploreUrl);

    // 直接导航到笔记页面（增加超时时间，容错处理）
    try {
      await page.goto(exploreUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (navErr) {
      console.log('[Puppeteer] 导航超时，继续尝试提取...');
    }
    await new Promise(r => setTimeout(r, 3000));

    // 关闭弹窗
    try {
      const closeBtn = await page.$('[class*="close"], [class*="Close"], .close-button');
      if (closeBtn) await closeBtn.click();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));

    // ========== 核心：从渲染后的 DOM 提取数据（编码正确） ==========
    console.log('[Puppeteer] 从 DOM 提取数据...');

    // ========== 核心：从渲染后的 DOM 提取数据（编码正确） ==========
    console.log('[Puppeteer] 从 DOM 提取数据...');

    const domResult = await page.evaluate(`(function() {
      var data = { title: '', author: '', content: '', images: [], videoUrl: '', cover: '', publishTime: '' };
      try {
        var state = window.__INITIAL_STATE__;
        if (state) {
          var note = null;
          if (state.noteData && state.noteData.data && state.noteData.data.noteData) {
            note = state.noteData.data.noteData;
          }
          if (!note && state.noteData && state.noteData.data && state.noteData.data.noteData && state.noteData.data.noteData.note) {
            note = state.noteData.data.noteData.note;
          }
          if (!note && state.note && state.note.data) {
            note = state.note.data;
          }
          if (!note) {
            var findNote = function(obj, depth) {
              depth = depth || 0;
              if (depth > 10 || !obj || typeof obj !== 'object') return null;
              if (obj.note_card) return obj.note_card;
              if (obj.noteCard) return obj.noteCard;
              if (obj.user && obj.desc && typeof obj.desc === 'string') return obj;
              if (obj.user && obj.image_list) return obj;
              if (obj.noteDetailMap) {
                var keys = Object.keys(obj.noteDetailMap);
                for (var ki = 0; ki < keys.length; ki++) {
                  var n = obj.noteDetailMap[keys[ki]];
                  if (n && (n.note || n.noteCard)) return n.note || n.noteCard;
                  if (n && n.user && n.desc) return n;
                }
              }
              var objKeys = Object.keys(obj);
              for (var oi = 0; oi < objKeys.length; oi++) {
                var key = objKeys[oi];
                if (key === '__proto__' || key === 'constructor') continue;
                try {
                  var result = findNote(obj[key], depth + 1);
                  if (result) return result;
                } catch (e) {}
              }
              return null;
            };
            note = findNote(state);
          }
          if (note) {
            if (note.title) data.title = note.title;
            if (note.desc) data.content = note.desc;
            if (note.user) {
              data.author = note.user.nickName || note.user.nickname || note.user.nick_name || '';
            }
            var timeStr = note.time || note.create_time || note.timestamp || note.last_update_time || note.lastUpdateTime || '';
            if (timeStr) {
              if (typeof timeStr === 'number') {
                var ts = timeStr > 1e12 ? timeStr : timeStr * 1000;
                data.publishTime = new Date(ts).toISOString().slice(0, 10);
              } else if (typeof timeStr === 'string' && timeStr.length >= 10) {
                data.publishTime = timeStr.slice(0, 10);
              }
            }
            var imgList = note.image_list || note.imageList || [];
            var firstInfo = imgList[0] && (imgList[0].infoList || imgList[0].info_list);
            if (firstInfo) {
              var scenes = [];
              for (var si = 0; si < firstInfo.length; si++) {
                scenes.push(firstInfo[si].imageScene || firstInfo[si].image_scene);
              }
              console.log('[Puppeteer] 可用图片场景:', JSON.stringify(scenes));
            }
            for (var ii = 0; ii < imgList.length; ii++) {
              var img = imgList[ii];
              var imgUrl = '';
              var imgInfo = img.infoList || img.info_list;
              if (imgInfo && imgInfo.length > 0) {
                // 优先无水印场景，其次默认场景
                var scenePriority = ['NO_WB', 'WB_DFT', 'CRD_PRV', 'WB_PRV'];
                for (var si = 0; si < scenePriority.length; si++) {
                  for (var wi = 0; wi < imgInfo.length; wi++) {
                    var sc = imgInfo[wi].imageScene || imgInfo[wi].image_scene;
                    if (sc === scenePriority[si] && imgInfo[wi].url) {
                      imgUrl = imgInfo[wi].url;
                      break;
                    }
                  }
                  if (imgUrl) break;
                }
                // 如果没有匹配任何优先场景，用第一个可用的
                if (!imgUrl && imgInfo[0] && imgInfo[0].url) {
                  imgUrl = imgInfo[0].url;
                }
              }
              if (!imgUrl) {
                imgUrl = img.url_default || img.urlDefault || img.url || '';
              }
              if (imgUrl) data.images.push(imgUrl);
            }
            if (note.video) {
              var media = note.video.media || note.video;
              var stream = media.stream || media;
              var h264 = stream.h264 || stream.h265 || [];
              if (Array.isArray(h264) && h264.length > 0) {
                data.videoUrl = h264[0].master_url || h264[0].masterUrl || '';
              }
              if (!data.videoUrl && note.video.consumer) {
                var vkey = note.video.consumer.originVideoKey || note.video.consumer.origin_video_key || '';
                if (vkey) data.videoUrl = vkey.indexOf('http') === 0 ? vkey : 'https://sns-video-bd.xhscdn.com/' + vkey;
              }
            }
            if (note.cover) {
              data.cover = note.cover.url_default || note.cover.urlDefault || note.cover.url || '';
            }
          }
        }
      } catch (e) {}
      if (!data.content) {
        var descSels = ['#detail-desc .desc', '.note-text', '[class*="note-content"]', '[class*="noteContent"]', '[class*="desc"][class*="note"]'];
        for (var di = 0; di < descSels.length; di++) {
          var el = document.querySelector(descSels[di]);
          var text = el ? (el.innerText || '').trim() : '';
          if (text && text.length > 5 && text.indexOf('\\u4ec5\\u652f\\u6301\\u5728\\u5c0f\\u7ea2\\u4e66') === -1) { data.content = text; break; }
        }
      }
      if (!data.title) {
        var titleSels = ['#detail-title', '.note-text .title', '[class*="note-title"]', '[class*="noteTitle"]', '[class*="detail"] [class*="title"]'];
        for (var ti = 0; ti < titleSels.length; ti++) {
          var tel = document.querySelector(titleSels[ti]);
          var ttext = tel ? (tel.innerText || '').trim() : '';
          if (ttext && ttext.length > 1 && ttext.length < 100) { data.title = ttext; break; }
        }
        if (!data.title) {
          var titleEls = document.querySelectorAll('[class*="title"]');
          for (var tei = 0; tei < titleEls.length; tei++) {
            var tte = titleEls[tei];
            var ttex = (tte.innerText || '').trim();
            var cls = tte.className || '';
            if (ttex && ttex.length > 1 && ttex.length < 100 && cls.indexOf('comment') === -1 && cls.indexOf('recommend') === -1 && cls.indexOf('related') === -1 && cls.indexOf('card-title') === -1) {
              data.title = ttex; break;
            }
          }
        }
      }
      if (!data.author) {
        var authSels = ['[class*="author-name"]', '[class*="authorName"]', '[class*="username"]', '[class*="nick-name"]', '[class*="nickname"]', '.author .name', '[class*="user-info"] [class*="name"]'];
        for (var ai = 0; ai < authSels.length; ai++) {
          var ael = document.querySelector(authSels[ai]);
          var atext = ael ? (ael.innerText || '').trim().split('\\n')[0].trim() : '';
          if (atext && atext.length > 0 && atext.length < 30) { data.author = atext; break; }
        }
      }
      if (data.images.length === 0) {
        var imgEls = document.querySelectorAll('.note-image img, [class*="slide"] img, .swiper img, [class*="imageList"] img');
        for (var iei = 0; iei < imgEls.length; iei++) {
          var isrc = imgEls[iei].src || '';
          if (isrc && isrc.indexOf('http') !== -1 && isrc.indexOf('avatar') === -1 && isrc.indexOf('icon') === -1) {
            data.images.push(isrc.split('?')[0]);
          }
        }
      }
      return data;
    })()`);

    console.log('[Puppeteer] DOM 提取结果:', {
      title: domResult.title?.substring(0, 30),
      author: domResult.author,
      contentLen: domResult.content?.length || 0,
      images: domResult.images?.length || 0,
      videoUrl: !!domResult.videoUrl
    });

    // 用 regex 从原始 HTML 补充内容、图片、视频（__INITIAL_STATE__ 可能缺少 desc）
    const fetchUrl = exploreUrl.replace(/'/g, "\\'");
    const html = await page.evaluate(`(async function() {
      try {
        var resp = await fetch('${fetchUrl}', {
          credentials: 'include',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
          }
        });
        return await resp.text();
      } catch (e) {
        return '';
      }
    })()`);

    console.log('[Puppeteer] fetch HTML 长度:', html?.length || 0);

    // 从 HTML 提取补充数据
    let content = domResult.content || '';
    let images = domResult.images || [];
    let videoUrl = domResult.videoUrl || '';

    if (html && html.length > 5000) {
      // 从 HTML 提取正文内容（desc 字段在 __INITIAL_STATE__ 中可能为空）
      if (!content) {
        content = extractContentFromHtml(html);
        if (content) console.log('[Puppeteer] HTML 提取到内容:', content.substring(0, 50));
      }

      // 从 HTML 提取图片（优先从 __INITIAL_STATE__ JSON 解析，获取最佳场景）
      let htmlImages = [];
      try {
        const stateMatch = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
        if (stateMatch) {
          const state = JSON.parse(stateMatch[1].replace(/undefined/g, 'null'));
          const note = findNoteInState(state);
          if (note) {
            htmlImages = parseNoteObject(note).images || [];
            if (htmlImages.length > 0) {
              console.log('[Puppeteer] 从 __INITIAL_STATE__ 提取图片:', htmlImages.length);
            }
          }
        }
      } catch (e) { /* JSON 解析失败，回退到 regex */ }
      if (htmlImages.length === 0) {
        htmlImages = extractImagesFromHtml(html);
      }
      if (htmlImages.length > images.length) {
        images = htmlImages;
        console.log('[Puppeteer] HTML 提取到更多图片:', htmlImages.length);
      }

      // 从 HTML 补充视频 URL
      if (!videoUrl) {
        videoUrl = extractVideoFromHtml(html);
      }

      // 从 HTML 补充发布时间
      if (!domResult.publishTime) {
        domResult.publishTime = extractPublishTimeFromHtml(html);
      }
    }

    // 清理图片 URL
    images = images.map(u => cleanImageUrl(u)).filter(Boolean);

    // 去重
    const uniqueImages = [];
    const seenBases = new Set();
    for (const url of images) {
      const fileNameMatch = url.match(/\/([a-z0-9]+)!/);
      const baseId = fileNameMatch ? fileNameMatch[1] : url;
      if (!seenBases.has(baseId)) {
        seenBases.add(baseId);
        const hdVersion = images.find(u => u.includes(baseId) && u.includes('h5_1080jpg'));
        uniqueImages.push(hdVersion || url);
      }
    }

    const result = {
      title: domResult.title || '',
      author: domResult.author || '',
      cover: cleanImageUrl(domResult.cover) || (uniqueImages.length > 0 ? uniqueImages[0] : ''),
      videoUrl: videoUrl || '',
      images: uniqueImages,
      content: content || '',
      publishTime: domResult.publishTime || ''
    };

    // 过滤无效标题
    const invalidTitles = ['小红书 - 你的生活兴趣社区', '小红书', ''];
    if (invalidTitles.includes(result.title)) result.title = '';

    return result;

  } catch (err) {
    console.error('[Puppeteer 错误]', err.message);
    throw new Error('页面解析失败: ' + err.message);
  } finally {
    // 如果是连接到已运行的浏览器，不关闭；否则关闭
    if (browser && !browser._connected) {
      await browser.close();
    }
  }
}

// ============================================================
// HTML 数据提取（核心）
// ============================================================
function extractFromHtml(html, noteId) {
  const result = { title: '', author: '', cover: '', videoUrl: '', images: [], content: '' };
  if (!html) return result;

  // 1. 标题（从内嵌 JSON 提取，最可靠）
  const titleJsonMatch = html.match(/"title":"((?:[^"\\]|\\.)*)"/);
  if (titleJsonMatch && titleJsonMatch[1]) {
    try {
      const title = JSON.parse('"' + titleJsonMatch[1] + '"');
      if (title && title.length > 1) result.title = title;
    } catch (e) {}
  }

  // 备用：从 meta 标签提取
  if (!result.title) {
    const titlePatterns = [
      /<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i,
      /<meta[^>]*content="([^"]*)"[^>]*property="og:title"/i,
      /<title>([^<]*)<\/title>/
    ];
    for (const p of titlePatterns) {
      const m = html.match(p);
      if (m && m[1] && !m[1].includes('小红书 - 你的生活兴趣社区') && !m[1].includes('你访问的页面不见了') && !m[1].includes(' - 小红书')) {
        result.title = m[1].replace(/\s*-\s*小红书$/, '').trim();
        break;
      }
    }
  }

  // 2. 封面图
  const coverPatterns = [
    /<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i,
    /<meta[^>]*content="([^"]*)"[^>]*property="og:image"/i
  ];
  for (const p of coverPatterns) {
    const m = html.match(p);
    if (m && m[1] && !m[1].includes('3 亿人的生活经验')) {
      result.cover = m[1];
      break;
    }
  }

  // 3. 视频 URL（多种来源）
  // 3a. og:video meta
  const ogVideo = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]*)"/i);
  if (ogVideo && ogVideo[1]) {
    result.videoUrl = ogVideo[1];
  }

  // 3b. 从内嵌 JSON 提取 masterUrl / master_url
  if (!result.videoUrl) {
    const masterPatterns = [
      /"masterUrl":"((?:[^"\\]|\\.)*)"/,
      /"master_url":"((?:[^"\\]|\\.)*)"/
    ];
    for (const pattern of masterPatterns) {
      const masterMatch = html.match(pattern);
      if (masterMatch && masterMatch[1]) {
        try {
          result.videoUrl = JSON.parse('"' + masterMatch[1] + '"');
        } catch (e) {
          result.videoUrl = masterMatch[1].replace(/\\u002F/g, '/');
        }
        break;
      }
    }
  }

  // 3c. 从 originVideoKey / origin_video_key 提取
  if (!result.videoUrl) {
    const originPatterns = [
      /"originVideoKey":"((?:[^"\\]|\\.)*)"/,
      /"origin_video_key":"((?:[^"\\]|\\.)*)"/
    ];
    for (const pattern of originPatterns) {
      const originMatch = html.match(pattern);
      if (originMatch && originMatch[1]) {
        try {
          const key = JSON.parse('"' + originMatch[1] + '"');
          result.videoUrl = key.startsWith('http') ? key : 'https://sns-video-bd.xhscdn.com/' + key;
        } catch (e) {}
        break;
      }
    }
  }

  // 4. 作者
  const nicknameMatch = html.match(/"nickname":"((?:[^"\\]|\\.)*)"/);
  if (nicknameMatch && nicknameMatch[1]) {
    try {
      result.author = JSON.parse('"' + nicknameMatch[1] + '"');
    } catch (e) {
      result.author = nicknameMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
    }
  }

  // 5. 正文内容（多种模式匹配）
  const descPatterns = [
    /"desc":"((?:[^"\\]|\\.)*)"/,           // 标准单行
    /"desc"\s*:\s*"((?:[^"\\]|\\.|\n)*)"/,  // 可能含换行
    /"content":"((?:[^"\\]|\\.)*)"/,         // 备用字段名
  ];
  for (const pattern of descPatterns) {
    if (result.content) break;
    const descMatch = html.match(pattern);
    if (descMatch && descMatch[1]) {
      try {
        const desc = JSON.parse('"' + descMatch[1].replace(/\n/g, '\\n') + '"');
        if (desc.length > 5 && !isBlocked(desc)) {
          result.content = desc;
        }
      } catch (e) {
        let desc = descMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '')
          .replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        if (desc.length > 5 && !isBlocked(desc)) {
          result.content = desc;
        }
      }
    }
  }

  // 6. 图片提取（多种来源，去重）
  const imageSet = new Set();

  // 6a. 从内嵌 JSON 的 "url" 字段提取（sns-webpic CDN，最常见）
  const urlMatches = html.match(/"url":"((?:[^"\\]|\\.)*)"/g) || [];
  for (const match of urlMatches) {
    const m = match.match(/"url":"((?:[^"\\]|\\.)*)"/);
    if (m && m[1]) {
      try {
        let url = JSON.parse('"' + m[1] + '"');
        // 只保留图片 CDN URL
        if (url && (url.includes('sns-webpic') || url.includes('sns-img') || url.includes('ci.xiaohongshu'))) {
          if (!url.includes('avatar') && !url.includes('icon') && !url.includes('logo')) {
            imageSet.add(cleanImageUrl(url));
          }
        }
      } catch (e) {
        // 手动解码 /
        let url = m[1].replace(/\\u002F/g, '/').replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
        if (url && (url.includes('sns-webpic') || url.includes('sns-img'))) {
          if (!url.includes('avatar') && !url.includes('icon')) {
            imageSet.add(cleanImageUrl(url));
          }
        }
      }
    }
  }

  // 6b. 从 url_default 提取
  if (imageSet.size === 0) {
    const urlDefaultMatches = html.match(/"url_default":"((?:[^"\\]|\\.)*)"/g) || [];
    for (const match of urlDefaultMatches) {
      const m = match.match(/"url_default":"((?:[^"\\]|\\.)*)"/);
      if (m && m[1]) {
        try {
          const url = JSON.parse('"' + m[1] + '"');
          if (url && !url.includes('avatar') && !url.includes('icon')) {
            imageSet.add(cleanImageUrl(url));
          }
        } catch (e) {}
      }
    }
  }

  // 6c. 从 og:image 提取
  if (imageSet.size === 0) {
    const ogImageMatches = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/gi) || [];
    for (const tag of ogImageMatches) {
      const m = tag.match(/content="([^"]*)"/);
      if (m && m[1] && !m[1].includes('3 亿人的生活经验') && m[1].includes('http')) {
        imageSet.add(cleanImageUrl(m[1]));
      }
    }
  }

  // 去重：同一图片的不同版本（h5_1080jpg / style_xxx 等）
  const allImages = [...imageSet];
  const uniqueImages = [];
  const seenBases = new Set();
  for (const url of allImages) {
    // 提取图片文件名基础部分（去掉 ! 后缀）
    const fileNameMatch = url.match(/\/([a-z0-9]+)!/);
    const baseId = fileNameMatch ? fileNameMatch[1] : url;
    if (!seenBases.has(baseId)) {
      seenBases.add(baseId);
      // 优先保留高清版本（h5_1080jpg）
      const hdVersion = allImages.find(u => u.includes(baseId) && u.includes('h5_1080jpg'));
      uniqueImages.push(hdVersion || url);
    }
  }
  result.images = uniqueImages;

  // 如果没有封面，用第一张图
  if (!result.cover && result.images.length > 0) {
    result.cover = result.images[0];
  }

  // 过滤无效标题
  const invalidTitles = ['小红书 - 你的生活兴趣社区', '小红书', '小红书 - 你访问的页面不见了', ''];
  if (invalidTitles.includes(result.title)) result.title = '';

  return result;
}

// 清理图片 URL（补全协议，去除查询参数）
function cleanImageUrl(url) {
  if (!url) return url;
  // 补全协议
  if (url.startsWith('//')) url = 'https:' + url;
  // 去除查询参数
  url = url.split('?')[0];
  return url;
}

// 从 HTML 提取正文内容
function extractContentFromHtml(html) {
  const patterns = [
    /"desc":"((?:[^"\\]|\\.)*)"/,
    /"desc"\s*:\s*"((?:[^"\\]|\\.|\n)*)"/,
    /"content":"((?:[^"\\]|\\.)*)"/,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m && m[1]) {
      let text = '';
      try {
        text = JSON.parse('"' + m[1].replace(/\n/g, '\\n') + '"');
      } catch (e) {
        text = m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '')
          .replace(/\\u002F/g, '/')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
      if (text.length > 5 && !isBlocked(text)) {
        return text;
      }
    }
  }
  return '';
}

// 从 HTML 提取图片 URL
function extractImagesFromHtml(html) {
  const imageSet = new Set();
  const urlMatches = html.match(/"url":"((?:[^"\\]|\\.)*)"/g) || [];
  for (const match of urlMatches) {
    const m = match.match(/"url":"((?:[^"\\]|\\.)*)"/);
    if (m && m[1]) {
      try {
        let url = JSON.parse('"' + m[1] + '"');
        if (url && (url.includes('sns-webpic') || url.includes('sns-img') || url.includes('ci.xiaohongshu'))) {
          if (!url.includes('avatar') && !url.includes('icon') && !url.includes('logo')) {
            imageSet.add(url);
          }
        }
      } catch (e) {
        let url = m[1].replace(/\\u002F/g, '/');
        if (url && (url.includes('sns-webpic') || url.includes('sns-img'))) {
          if (!url.includes('avatar') && !url.includes('icon')) {
            imageSet.add(url);
          }
        }
      }
    }
  }

  // 从 url_default 提取
  if (imageSet.size === 0) {
    const urlDefaultMatches = html.match(/"url_default":"((?:[^"\\]|\\.)*)"/g) || [];
    for (const match of urlDefaultMatches) {
      const m = match.match(/"url_default":"((?:[^"\\]|\\.)*)"/);
      if (m && m[1]) {
        try {
          const url = JSON.parse('"' + m[1] + '"');
          if (url && !url.includes('avatar') && !url.includes('icon')) {
            imageSet.add(url);
          }
        } catch (e) {}
      }
    }
  }

  return [...imageSet].map(u => cleanImageUrl(u));
}

// 从 HTML 提取视频 URL
function extractVideoFromHtml(html) {
  // 1. og:video meta
  const ogVideo = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]*)"/i);
  if (ogVideo && ogVideo[1]) return ogVideo[1];

  // 2. masterUrl / master_url
  const masterPatterns = [
    /"masterUrl":"((?:[^"\\]|\\.)*)"/,
    /"master_url":"((?:[^"\\]|\\.)*)"/
  ];
  for (const pattern of masterPatterns) {
    const m = html.match(pattern);
    if (m && m[1]) {
      try {
        return JSON.parse('"' + m[1] + '"');
      } catch (e) {
        return m[1].replace(/\\u002F/g, '/');
      }
    }
  }

  // 3. originVideoKey / origin_video_key
  const originPatterns = [
    /"originVideoKey":"((?:[^"\\]|\\.)*)"/,
    /"origin_video_key":"((?:[^"\\]|\\.)*)"/
  ];
  for (const pattern of originPatterns) {
    const m = html.match(pattern);
    if (m && m[1]) {
      try {
        const key = JSON.parse('"' + m[1] + '"');
        return key.startsWith('http') ? key : 'https://sns-video-bd.xhscdn.com/' + key;
      } catch (e) {}
    }
  }

  return '';
}

// 从 HTML 提取发布时间
function extractPublishTimeFromHtml(html) {
  // 1. "time":"2024-01-01 12:00:00"
  const timeMatch = html.match(/"time"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  if (timeMatch && timeMatch[1]) return timeMatch[1];

  // 2. "create_time":1704067200000 (timestamp)
  const tsMatch = html.match(/"create_time"\s*:\s*(\d{10,13})/);
  if (tsMatch && tsMatch[1]) {
    const ts = parseInt(tsMatch[1]);
    const ms = ts > 1e12 ? ts : ts * 1000;
    return new Date(ms).toISOString().slice(0, 10);
  }

  // 3. last_update_time
  const updateMatch = html.match(/"last_update_time"\s*:\s*(\d{10,13})/);
  if (updateMatch && updateMatch[1]) {
    const ts = parseInt(updateMatch[1]);
    const ms = ts > 1e12 ? ts : ts * 1000;
    return new Date(ms).toISOString().slice(0, 10);
  }

  // 4. timestamp
  const timestampMatch = html.match(/"timestamp"\s*:\s*(\d{10,13})/);
  if (timestampMatch && timestampMatch[1]) {
    const ts = parseInt(timestampMatch[1]);
    const ms = ts > 1e12 ? ts : ts * 1000;
    return new Date(ms).toISOString().slice(0, 10);
  }

  return '';
}

// 从 __INITIAL_STATE__ 递归搜索 note 数据
function findNoteInState(obj, depth = 0) {
  if (depth > 12 || !obj || typeof obj !== 'object') return null;

  if (obj.note_card) return obj.note_card;
  if (obj.noteCard) return obj.noteCard;

  if (obj.desc && typeof obj.desc === 'string' && obj.desc.length > 5 &&
      !isBlocked(obj.desc)) {
    if (obj.image_list || obj.user) return obj;
  }

  if (obj.noteDetailMap) {
    for (const key of Object.keys(obj.noteDetailMap)) {
      const note = obj.noteDetailMap[key];
      if (note && (note.note || note.noteCard)) return note.note || note.noteCard;
      if (note && note.desc) return note;
    }
  }

  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor') continue;
    try {
      const result = findNoteInState(obj[key], depth + 1);
      if (result) return result;
    } catch (e) {}
  }

  return null;
}

// 解析 note 对象为标准格式
function parseNoteObject(note) {
  const images = [];

  // 从 image_list 提取图片
  const imgList = note.image_list || note.imageList || [];
  if (imgList.length > 0) {
    const info = imgList[0].infoList || imgList[0].info_list;
    if (info) {
      const scenes = info.map(i => i.imageScene || i.image_scene);
      console.log('[parseNote] 可用图片场景:', JSON.stringify(scenes));
    }
  }
  for (const img of imgList) {
    let imgUrl = '';
    const imgInfo = img.infoList || img.info_list;
    // 优先无水印场景
    if (imgInfo && imgInfo.length > 0) {
      const scenePriority = ['NO_WB', 'WB_DFT', 'CRD_PRV', 'WB_PRV'];
      for (const scene of scenePriority) {
        const found = imgInfo.find(i => (i.imageScene || i.image_scene) === scene && i.url);
        if (found) { imgUrl = found.url; break; }
      }
      if (!imgUrl && imgInfo[0] && imgInfo[0].url) {
        imgUrl = imgInfo[0].url;
      }
    }
    if (!imgUrl) {
      imgUrl = img.url_default || img.urlDefault || img.url || '';
    }
    if (imgUrl) images.push(cleanImageUrl(imgUrl));
  }

  // 视频 URL
  let videoUrl = '';
  if (note.video) {
    const media = note.video.media || note.video;
    const stream = media.stream || media;
    const h264 = stream.h264 || stream.h265 || [];
    if (Array.isArray(h264) && h264.length > 0) {
      videoUrl = h264[0].master_url || h264[0].masterUrl || '';
    }
    if (!videoUrl && note.video.consumer) {
      const key = note.video.consumer.originVideoKey || note.video.consumer.origin_video_key || '';
      if (key) videoUrl = key.startsWith('http') ? key : 'https://sns-video-bd.xhscdn.com/' + key;
    }
  }

  return {
    title: note.title || note.displayTitle || '',
    author: note.user?.nickname || note.user?.nick_name || '',
    cover: cleanImageUrl(note.cover?.url_default || note.cover?.urlDefault || note.cover?.url || ''),
    videoUrl,
    images,
    content: note.desc || ''
  };
}


// 内嵌首页
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(INDEX_HTML);
});
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');


// 开机自启管理
const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const APP_NAME = 'RednoteDownloader';

function enableAutoStart() {
  const exePath = process.execPath;
  exec(`reg add "${REG_KEY}" /v "${APP_NAME}" /t REG_SZ /d "\\"${exePath}\\"" /f`, (err) => {
    if (err) console.log('[自启] 设置失败:', err.message);
    else console.log('[自启] 已开启开机自启');
  });
}

function disableAutoStart() {
  exec(`reg delete "${REG_KEY}" /v "${APP_NAME}" /f`, (err) => {
    if (err && err.code !== 1) console.log('[自启] 取消失败:', err.message);
    else console.log('[自启] 已关闭开机自启');
  });
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--autostart')) {
  enableAutoStart();
  if (args.includes('--exit')) process.exit(0);
}
if (args.includes('--no-autostart')) {
  disableAutoStart();
  if (args.includes('--exit')) process.exit(0);
}

// 隐藏 Windows 控制台窗口（同步，确保窗口立即消失）
function hideConsoleWindow() {
  if (process.platform !== 'win32') return;
  try {
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -Name W -Namespace N -MemberDefinition \'[DllImport(\\\"kernel32.dll\\\")] public static extern IntPtr GetConsoleWindow();[DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindow(IntPtr h,int n);\'; $h=[N.W]::GetConsoleWindow(); if($h){[N.W]::ShowWindow($h,0)}"', { windowsHide: true, stdio: 'ignore' });
  } catch (e) {}
}

// 启动带远程调试的 Edge（复用登录状态）
function launchEdgeWithDebug() {
  const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const altEdgePath = (process.env.LOCALAPPDATA || '') + '/Microsoft/Edge/Application/msedge.exe';
  const execPath = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(altEdgePath) ? altEdgePath : null);
  if (!execPath) return;

  // 检查 9222 端口是否已被占用
  try {
    const netstat = execSync('netstat -ano | findstr :9222', { encoding: 'utf-8' });
    if (netstat.includes('LISTENING')) {
      console.log('[Edge] 远程调试端口 9222 已在使用');
      return;
    }
  } catch (e) {}

  // 启动 Edge 带远程调试
  const userDataDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data');
  const cmd = `"${execPath}" --remote-debugging-port=9222 --user-data-dir="${userDataDir}" --restore-last-session`;
  console.log('[Edge] 启动带远程调试的 Edge...');
  exec(cmd, { windowsHide: true }, (err) => {
    if (err) console.log('[Edge] 启动失败:', err.message);
  });
}

// 自启状态查询 API
app.get('/api/autostart', (req, res) => {
  try {
    const result = execSync(`reg query "${REG_KEY}" /v "${APP_NAME}"`, { encoding: 'utf-8' });
    res.json({ enabled: result.includes(APP_NAME) });
  } catch (e) {
    res.json({ enabled: false });
  }
});

// 自启开关 API
app.post('/api/autostart', (req, res) => {
  const { enabled } = req.body;
  if (enabled) {
    enableAutoStart();
  } else {
    disableAutoStart();
  }
  res.json({ success: true, enabled });
});

app.listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('rednote-downloader by BOYGAGA已启动! 访问: ' + url);
  // 隐藏控制台窗口
  hideConsoleWindow();
  // 启动带远程调试的 Edge
  launchEdgeWithDebug();
  // 自动打开浏览器
  setTimeout(() => {
    const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(openCmd + ' ' + url, (err) => {
      if (err) console.log('请手动打开浏览器访问:', url);
    });
  }, 2000);
});
