// 主题固定为浅色(深色模式已移除)
    var WEB_ASSET_HASH = '{{ASSET_HASH}}';
    var webConfig = null, webConfigReq = null;
    var loadedPanels = {};

    function ensureConfig(force) {
      if (force) { webConfig = null; webConfigReq = null; }
      if (webConfig) return Promise.resolve(webConfig);
      if (!webConfigReq) {
        webConfigReq = fetch('/config.json?_=' + Date.now()).then(function(r){ return r.json(); }).then(function(d) {
          webConfig = d || {};
          return webConfig;
        });
      }
      return webConfigReq;
    }
    function checked(v) { return v ? 'checked' : ''; }
    function buildTzOptions(sel) {
      var zones = [
        [480,'UTC+8 北京/香港'], [540,'UTC+9 东京'], [420,'UTC+7 曼谷'], [330,'UTC+5:30 印度'],
        [60,'UTC+1 中欧'], [0,'UTC/GMT'], [-300,'UTC-5 纽约'], [-360,'UTC-6 芝加哥'], [-480,'UTC-8 洛杉矶']
      ];
      return zones.map(function(z){ return '<option value="' + z[0] + '"' + (z[0] == sel ? ' selected' : '') + '>' + z[1] + '</option>'; }).join('');
    }
    function pushTypeOptions(type) {
      var opts = [
        [1,'POST JSON（通用格式）'], [2,'Bark（iOS推送）'], [3,'GET请求（参数在URL中）'], [4,'钉钉机器人'],
        [5,'PushPlus'], [6,'Server酱'], [7,'自定义模板'], [8,'飞书机器人'], [9,'Gotify'], [10,'Telegram Bot']
      ];
      return opts.map(function(o){ return '<option value="' + o[0] + '"' + (o[0] == type ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    }
    function buildPushChannels(chans) {
      chans = chans || [];
      var html = '';
      for (var i = 0; i < 5; i++) {
        var ch = chans[i] || {}, idx = String(i), en = !!ch.enabled;
        var defName = '通道' + (i + 1);
        var configured = en || !!ch.url || !!ch.key1 || !!ch.key2 || !!ch.customBody || (ch.type && ch.type != 1) || (ch.name && ch.name !== defName);
        var folded = !en;
        html += '<div class="push-channel' + (en ? ' enabled' : '') + (folded ? ' folded' : '') + (configured ? ' configured' : '') + '" id="channel' + idx + '" data-configured="' + (configured ? '1' : '0') + '">';
        html += '<div class="push-channel-header">';
        html += '<input type="checkbox" name="push' + idx + 'en" id="push' + idx + 'en" onchange="toggleChannel(' + idx + ')"' + (en ? ' checked' : '') + '>';
        html += '<label for="push' + idx + 'en" class="label-inline">启用推送通道 ' + (i + 1) + '</label>';
        html += '<span class="ch-summary" id="chsum' + idx + '"></span>';
        html += '<button type="button" class="channel-fold" onclick="toggleChannelBody(' + idx + ')" id="foldBtn' + idx + '">展开</button>';
        html += '</div><div class="push-channel-body">';
        html += '<div class="form-group"><label>通道名称</label><input type="text" name="push' + idx + 'name" value="' + htmlEsc(ch.name || defName) + '" placeholder="自定义名称" oninput="updateChannelSummary(' + idx + ')"></div>';
        html += '<div class="form-group"><label>推送方式</label><select name="push' + idx + 'type" id="push' + idx + 'type" onchange="updateTypeHint(' + idx + ')">' + pushTypeOptions(ch.type || 1) + '</select><div class="push-type-hint" id="hint' + idx + '"></div></div>';
        html += '<div class="form-group"><label id="urllabel' + idx + '">推送URL/Webhook</label><input type="text" name="push' + idx + 'url" id="url' + idx + '" value="' + htmlEsc(ch.url || '') + '" placeholder="http://your-server.com/api 或 webhook地址"></div>';
        html += '<div id="extra' + idx + '" style="display:none;"><div class="form-group"><label id="key1label' + idx + '">参数1</label><input type="text" name="push' + idx + 'key1" id="key1' + idx + '" value="' + htmlEsc(ch.key1 || '') + '"></div>';
        html += '<div class="form-group" id="key2group' + idx + '"><label id="key2label' + idx + '">参数2</label><input type="text" name="push' + idx + 'key2" id="key2' + idx + '" value="' + htmlEsc(ch.key2 || '') + '"></div>';
        html += '<details class="bark-advanced" id="barkAdvanced' + idx + '" style="display:none;"><summary>Bark 高级参数 <span class="bark-summary" id="barkSummary' + idx + '"></span></summary><div class="bark-params" id="barkParams' + idx + '"><div class="bark-param-grid">';
        html += '<div class="form-group"><label>副标题 subtitle</label><input type="text" id="bark_subtitle' + idx + '" data-bark-key="subtitle" placeholder="可选"></div>';
        html += '<div class="form-group"><label>分组 group</label><input type="text" id="bark_group' + idx + '" data-bark-key="group" placeholder="SMS"></div>';
        html += '<div class="form-group"><label>中断级别 level</label><select id="bark_level' + idx + '" data-bark-key="level"><option value="">默认 active</option><option value="active">active</option><option value="timeSensitive">timeSensitive</option><option value="passive">passive</option><option value="critical">critical</option></select></div>';
        html += '<div class="form-group"><label>铃声 sound</label><input type="text" id="bark_sound' + idx + '" data-bark-key="sound" placeholder="bell / minuet"></div>';
        html += '<div class="form-group"><label>角标 badge</label><input type="number" id="bark_badge' + idx + '" data-bark-key="badge" placeholder="1"></div>';
        html += '<div class="form-group"><label>保存秒数 ttl</label><input type="number" id="bark_ttl' + idx + '" data-bark-key="ttl" placeholder="3600"></div>';
        html += '<div class="form-group"><label>图标 icon</label><input type="url" id="bark_icon' + idx + '" data-bark-key="icon" placeholder="https://.../icon.png"></div>';
        html += '<div class="form-group"><label>图片 image</label><input type="url" id="bark_image' + idx + '" data-bark-key="image" placeholder="https://.../image.jpg"></div>';
        html += '<div class="form-group"><label>点击 URL</label><input type="text" id="bark_url' + idx + '" data-bark-key="url" placeholder="https://... 或 URL Scheme"></div>';
        html += '<div class="form-group"><label>复制内容 copy</label><input type="text" id="bark_copy' + idx + '" data-bark-key="copy" placeholder="{message}"></div>';
        html += '<div class="form-group"><label>自动复制 autoCopy</label><select id="bark_autoCopy' + idx + '" data-bark-key="autoCopy"><option value="">跟随 App</option><option value="1">开启</option><option value="0">关闭</option></select></div>';
        html += '<div class="form-group"><label>保存历史 isArchive</label><select id="bark_isArchive' + idx + '" data-bark-key="isArchive"><option value="">跟随 App</option><option value="1">保存</option><option value="0">不保存</option></select></div>';
        html += '<div class="form-group"><label>持续响铃 call</label><select id="bark_call' + idx + '" data-bark-key="call"><option value="">关闭</option><option value="1">开启</option></select></div>';
        html += '<div class="form-group"><label>点击动作 action</label><select id="bark_action' + idx + '" data-bark-key="action"><option value="">默认</option><option value="alert">alert 弹窗</option></select></div>';
        html += '<div class="form-group"><label>通知 ID id</label><input type="text" id="bark_id' + idx + '" data-bark-key="id" placeholder="同 ID 会更新通知"></div>';
        html += '<div class="form-group"><label>其它参数</label><input type="text" id="bark_other' + idx + '" placeholder="markdown=...&ciphertext=..."></div>';
        html += '</div><p class="form-hint">保存时会自动合成为 Bark 参数；可用 {sender} {message} {timestamp} 占位符。</p></div></details></div>';
        html += '<div id="custom' + idx + '" style="display:none;"><div class="form-group"><label>请求体模板（使用 {sender} {message} {timestamp} 占位符）</label><textarea name="push' + idx + 'body" rows="4" style="width:100%;font-family:monospace;">' + htmlEsc(ch.customBody || '') + '</textarea></div></div>';
        html += '<button type="button" class="btn btn-secondary btn-sm" onclick="testPush(' + idx + ', this)">测试推送</button><div class="result-box" id="pushTestResult' + idx + '"></div>';
        html += '</div></div>';
      }
      return html;
    }
    function renderConfigTemplate(html) {
      var c = webConfig || {};
      var map = {
        WEB_USER: htmlEsc(c.webUser || ''), WEB_PASS: htmlEsc(c.webPass || ''),
        SMTP_SERVER: htmlEsc(c.smtpServer || ''), SMTP_PORT: String(c.smtpPort || 465),
        SMTP_USER: htmlEsc(c.smtpUser || ''), SMTP_PASS: htmlEsc(c.smtpPass || ''), SMTP_SEND_TO: htmlEsc(c.smtpSendTo || ''),
        ADMIN_PHONE: htmlEsc(c.adminPhone || ''), NUMBER_BLACK_LIST: htmlEsc(c.numberBlackList || ''), FORWARD_RULES: htmlEsc(c.forwardRules || ''),
        SMTP_CHECK: c.emailConfigured ? '已配置' : '未配置', EMAIL_EN: checked(c.emailEnabled), PUSH_EN: checked(c.pushEnabled),
        MODEM_CHECK: c.modemReady ? '已就绪' : '未就绪', PUSH_COUNT: String(c.pushEnabledCount || 0), INBOX_MAX: String(c.inboxMax || ''),
        NTP: htmlEsc(c.ntpServer || ''), RB_CHECKED: checked(c.rebootEnabled), RB_HOUR: String(c.rebootHour == null ? 3 : c.rebootHour),
        HB_CHECKED: checked(c.hbEnabled), HB_HOUR: String(c.hbHour == null ? 9 : c.hbHour), TZ_OPTIONS: buildTzOptions(c.tzOffsetMin),
        DATA_CHECKED: checked(c.dataEnabled), APN: htmlEsc(c.apn || ''), PHONE_NUMBER: htmlEsc(c.phoneNumber || ''),
        OPERATOR_PLMN: htmlEsc(c.operatorPlmn || ''), PUSH_CHANNELS: buildPushChannels(c.pushChannels),
        UPTIME: htmlEsc(c.uptimeText || '')
      };
      return html.replace(/%([A-Z0-9_]{2,})%/g, function(m, k){ return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m; });
    }
    function panelHook(name) {
      if (name === 'log') { initLogPanel(); } else { stopLogPoll(); }
      if (name === 'overview') { loadStatus(); loadLatestOtp(); startStatusPoll(); } else { stopStatusPoll(); }
      if (name === 'inbox') loadMessages();
      if (name === 'keepalive' || name === 'diagnose') kaLoadStatus();
      if (name === 'sim') wifiPrefill();
      if (name === 'push') { for (var i = 0; i < 5; i++) { toggleChannel(i); updateTypeHint(i); } setupChannels(); parseFwdRules(); renderRules(); }
      if (name === 'atterm') bindAtTerminal();
    }
    function activateNav(name) {
      document.querySelectorAll('.sidebar-nav a').forEach(function(a) { a.classList.remove('active'); });
      var a = document.querySelector('.sidebar-nav a[data-panel="' + name + '"]');
      if (a) a.classList.add('active');
    }
    function normalizePanelName(name) {
      name = String(name || '').replace(/^#/, '');
      return document.querySelector('.sidebar-nav a[data-panel="' + name + '"]') ? name : 'overview';
    }
    function panelFromHash() {
      return normalizePanelName(decodeURIComponent((location.hash || '').slice(1)));
    }
    function switchPanel(name) {
      name = normalizePanelName(name);
      var host = document.getElementById('panelHost');
      activateNav(name);
      if (loadedPanels[name]) {
        ensureConfig(false).then(function() {
          host.innerHTML = renderConfigTemplate(loadedPanels[name]);
          var cachedPanel = document.getElementById('panel-' + name);
          if (cachedPanel) cachedPanel.classList.add('active');
          panelHook(name);
        });
        return;
      }
      host.innerHTML = '<div class="msg-empty">加载中...</div>';
      ensureConfig(false).then(function() {
        return fetch('/ui?panel=' + encodeURIComponent(name) + '&v=' + encodeURIComponent(WEB_ASSET_HASH)).then(function(r){ return r.text(); });
      }).then(function(html) {
        loadedPanels[name] = html;
        host.innerHTML = renderConfigTemplate(html);
        var p = document.getElementById('panel-' + name);
        if (p) p.classList.add('active');
        panelHook(name);
      }).catch(function(e) {
        host.innerHTML = '<div class="msg-empty">页面加载失败: ' + htmlEsc(String(e)) + '</div>';
      });
    }
    document.querySelectorAll('.sidebar-nav a').forEach(function(a) {
      a.addEventListener('click', function() {
        var name = normalizePanelName(this.dataset.panel);
        if (location.hash === '#' + name) switchPanel(name);
        else location.hash = name;
      });
    });
    window.addEventListener('hashchange', function() { switchPanel(panelFromHash()); });

    // ---- Push Channel JS ----
    function toggleChannel(idx) {
      var ch = document.getElementById('channel' + idx);
      var cb = document.getElementById('push' + idx + 'en');
      if (!ch || !cb) return;
      if (cb.checked) {
        ch.classList.add('enabled');
        ch.classList.remove('folded');
        ch.dataset.configured = '1';
      } else {
        ch.classList.remove('enabled');
        ch.classList.add('folded');
      }
      updateChannelFoldText(idx);
    }
    function updateChannelFoldText(idx) {
      var ch = document.getElementById('channel' + idx);
      var btn = document.getElementById('foldBtn' + idx);
      if (!ch || !btn) return;
      btn.textContent = ch.classList.contains('folded') ? '展开' : '收起';
    }
    function toggleChannelBody(idx) {
      var ch = document.getElementById('channel' + idx);
      if (!ch) return;
      ch.classList.toggle('folded');
      updateChannelFoldText(idx);
    }
    var barkKeys = ['subtitle','group','level','sound','badge','ttl','icon','image','url','copy','autoCopy','isArchive','call','action','id'];
    function barkDecode(v) {
      try { return decodeURIComponent(String(v || '').replace(/\+/g, ' ')); } catch (e) { return String(v || ''); }
    }
    function barkEncode(v) { return encodeURIComponent(String(v || '')); }
    function parseParamString(raw) {
      var out = {}, extra = [];
      String(raw || '').replace(/^\?+/, '').split(/[&\n]/).forEach(function(part) {
        part = part.trim();
        if (!part) return;
        var p = part.indexOf('='), k = barkDecode(p < 0 ? part : part.slice(0, p)).trim();
        if (!k) return;
        var v = p < 0 ? '1' : barkDecode(part.slice(p + 1));
        if (barkKeys.indexOf(k) >= 0) out[k] = v;
        else if (['title','body','device_key','device_keys'].indexOf(k) < 0) extra.push(barkEncode(k) + '=' + barkEncode(v));
      });
      out._other = extra.join('&');
      return out;
    }
    function loadBarkParams(idx) {
      var key2 = document.getElementById('key2' + idx);
      var box = document.getElementById('barkParams' + idx);
      if (!key2 || !box) return;
      var params = parseParamString(key2.value);
      barkKeys.forEach(function(k) {
        var el = box.querySelector('[data-bark-key="' + k + '"]');
        if (el) el.value = params[k] || '';
      });
      var other = document.getElementById('bark_other' + idx);
      if (other) other.value = params._other || '';
      updateBarkSummary(idx);
    }
    function updateBarkSummary(idx) {
      var key2 = document.getElementById('key2' + idx);
      var summary = document.getElementById('barkSummary' + idx);
      if (!key2 || !summary) return;
      var params = parseParamString(key2.value);
      var items = [];
      ['group','level','sound','copy'].forEach(function(k) { if (params[k]) items.push(k + '=' + params[k]); });
      if (params._other) items.push('其它');
      summary.textContent = items.length ? items.slice(0, 4).join(' · ') : '未配置';
    }
    function serializeBarkParams(idx) {
      var key2 = document.getElementById('key2' + idx);
      var box = document.getElementById('barkParams' + idx);
      if (!key2 || !box) return;
      var parts = [];
      barkKeys.forEach(function(k) {
        var el = box.querySelector('[data-bark-key="' + k + '"]');
        var v = el ? String(el.value || '').trim() : '';
        if (v) parts.push(barkEncode(k) + '=' + barkEncode(v));
      });
      var other = document.getElementById('bark_other' + idx);
      if (other && other.value.trim()) parts.push(other.value.trim().replace(/^[?&]+/, ''));
      key2.value = parts.join('&');
      updateBarkSummary(idx);
    }
    function bindBarkParams(idx) {
      var box = document.getElementById('barkParams' + idx);
      if (!box || box.dataset.bound) return;
      box.dataset.bound = '1';
      box.querySelectorAll('input,select').forEach(function(el) {
        el.addEventListener('input', function(){ serializeBarkParams(idx); });
        el.addEventListener('change', function(){ serializeBarkParams(idx); });
      });
    }
    function serializeAllBarkParams() {
      for (var i = 0; i < 5; i++) {
        var sel = document.getElementById('push' + i + 'type');
        if (sel && parseInt(sel.value) === 2) serializeBarkParams(i);
      }
    }
    // 折叠状态下也能看出通道是什么：header 显示"名称 · 类型"摘要
    function pushTypeLabel(t) {
      var m = {1:'POST JSON',2:'Bark',3:'GET',4:'钉钉',5:'PushPlus',6:'Server酱',7:'自定义',8:'飞书',9:'Gotify',10:'Telegram'};
      return m[t] || '';
    }
    function updateChannelSummary(idx) {
      var el = document.getElementById('chsum' + idx);
      if (!el) return;
      var nameEl = document.querySelector('[name="push' + idx + 'name"]');
      var sel = document.getElementById('push' + idx + 'type');
      var name = nameEl ? nameEl.value.trim() : '';
      var t = sel ? pushTypeLabel(parseInt(sel.value)) : '';
      if (name === '通道' + (idx + 1)) name = '';  // 默认名不重复显示
      el.textContent = [name, t].filter(Boolean).join(' · ');
    }
    // 转发规则里按真实通道名显示（回退"通道N"）
    function chanName(n) {
      var arr = (webConfig && webConfig.pushChannels) || [];
      var ch = arr[n - 1] || {};
      return (ch.name || '').trim() || ('通道' + n);
    }
    function updateTypeHint(idx) {
      var sel = document.getElementById('push' + idx + 'type');
      var hint = document.getElementById('hint' + idx);
      var extra = document.getElementById('extra' + idx);
      var custom = document.getElementById('custom' + idx);
      if (!sel || !hint || !extra || !custom) return;
      var type = parseInt(sel.value);
      updateChannelSummary(idx);
      var bp = document.getElementById('barkParams' + idx);
      var ba = document.getElementById('barkAdvanced' + idx);
      extra.style.display = 'none'; custom.style.display = 'none';
      document.getElementById('key1label' + idx).innerText = '参数 1';
      document.getElementById('key2label' + idx).innerText = '参数 2';
      document.getElementById('urllabel' + idx).innerText = '推送URL/Webhook';
      document.getElementById('url' + idx).placeholder = 'http://your-server.com/api 或 webhook地址';
      document.getElementById('key1' + idx).placeholder = '';
      document.getElementById('key2' + idx).placeholder = '';
      var kg = document.getElementById('key2group' + idx);
      if (kg) kg.style.display = 'none';
      if (bp) bp.style.display = '';
      if (ba) ba.style.display = 'none';
      if (type == 1) hint.innerHTML = 'POST JSON<br>{"sender":"+447700900123","message":"...","timestamp":"2026-01-01 12:00:00"}';
      else if (type == 2) { hint.innerHTML = 'Bark (iOS)<br>URL 留空使用 https://api.day.app；自建填服务器根地址，设备端发送到 /push。'; extra.style.display='block'; if(kg)kg.style.display='none'; if(ba)ba.style.display='block'; document.getElementById('urllabel'+idx).innerText='Bark 服务器 URL'; document.getElementById('url'+idx).placeholder='留空=官方服务；自建=https://bark.example.com'; document.getElementById('key1label'+idx).innerText='Device Key'; document.getElementById('key1'+idx).placeholder='Bark App 中显示的 key'; bindBarkParams(idx); loadBarkParams(idx); serializeBarkParams(idx); }
      else if (type == 3) hint.innerHTML = 'GET 请求<br>URL?sender=xxx&message=xxx&timestamp=xxx';
      else if (type == 4) { hint.innerHTML = '钉钉机器人<br>填写 Webhook 地址，加签需填 Secret'; extra.style.display='block'; document.getElementById('key1label'+idx).innerText='Secret（加签密钥，可选）'; document.getElementById('key1'+idx).placeholder='SEC...'; }
      else if (type == 5) { hint.innerHTML = 'PushPlus<br>填写 Token，URL 留空使用默认'; extra.style.display='block'; document.getElementById('key1label'+idx).innerText='Token'; document.getElementById('key1'+idx).placeholder='pushplus token'; if(kg)kg.style.display='block'; document.getElementById('key2label'+idx).innerText='发送渠道'; document.getElementById('key2'+idx).placeholder='wechat / extension / app'; }
      else if (type == 6) { hint.innerHTML = 'Server酱<br>填写 SendKey，URL 留空使用默认'; extra.style.display='block'; document.getElementById('key1label'+idx).innerText='SendKey'; document.getElementById('key1'+idx).placeholder='SCT...'; }
      else if (type == 7) { hint.innerHTML = '自定义模板<br>使用 {sender} {message} {timestamp} 占位符'; custom.style.display='block'; }
      else if (type == 8) { hint.innerHTML = '飞书机器人<br>填写 Webhook 地址，签名验证需填 Secret'; extra.style.display='block'; document.getElementById('key1label'+idx).innerText='Secret（签名密钥，可选）'; document.getElementById('key1'+idx).placeholder='飞书签名密钥'; }
      else if (type == 9) { hint.innerHTML = 'Gotify<br>填写服务器地址 + 应用 Token'; extra.style.display='block'; document.getElementById('key1label'+idx).innerText='Token（应用 Token）'; document.getElementById('key1'+idx).placeholder='A...'; }
      else if (type == 10) { hint.innerHTML = 'Telegram Bot<br>Chat ID（参数1）+ Bot Token（参数2）'; extra.style.display='block'; document.getElementById('key1label'+idx).innerText='Chat ID'; document.getElementById('key1'+idx).placeholder='123456789'; if(kg)kg.style.display='block'; document.getElementById('key2label'+idx).innerText='Bot Token'; document.getElementById('key2'+idx).placeholder='12345678:ABC...'; }
    }
    // ---- 推送通道：只显示已启用，其余由"添加推送通道"逐个展开 ----
    function setupChannels() {
      for (var i = 0; i < 5; i++) {
        var ch = document.getElementById('channel' + i), en = document.getElementById('push' + i + 'en');
        if (ch && en && ch.dataset.configured !== '1' && !en.checked) ch.style.display = 'none';
        updateChannelFoldText(i);
      }
      var form = document.getElementById('mainForm3');
      if (form && !form.dataset.barkSubmitBound) {
        form.dataset.barkSubmitBound = '1';
        form.addEventListener('submit', serializeAllBarkParams);
      }
      updateAddBtn();
    }
    function updateAddBtn() {
      var btn = document.getElementById('addChannelBtn'); if (!btn) return;
      var hidden = 0;
      for (var i = 0; i < 5; i++) { var ch = document.getElementById('channel' + i); if (ch && ch.style.display === 'none') hidden++; }
      btn.style.display = hidden > 0 ? '' : 'none';
    }
    function addChannel() {
      for (var i = 0; i < 5; i++) {
        var ch = document.getElementById('channel' + i);
        if (ch && ch.style.display === 'none') {
          ch.style.display = '';
          ch.dataset.configured = '1';
          ch.classList.remove('folded');
          var en = document.getElementById('push' + i + 'en');
          if (en) { en.checked = true; toggleChannel(i); }
          updateTypeHint(i);
          updateChannelFoldText(i);
          updateAddBtn();
          return;
        }
      }
    }
    document.addEventListener('DOMContentLoaded', function() {
      for (var i = 0; i < 5; i++) { toggleChannel(i); updateTypeHint(i); }
      setupChannels();
    });

    // ---- Push Channel Test ----
    var pushTestTimers = {}, pushTestBtns = {};
    function pushTestDone(idx) {
      var b = pushTestBtns[idx];
      if (b) b.disabled = false;
    }
    function pollTestPush(idx) {
      if (pushTestTimers[idx]) clearTimeout(pushTestTimers[idx]);
      fetch('/testpush?action=status&ch=' + idx).then(function(x){return x.json();}).then(function(d) {
        var r = document.getElementById('pushTestResult' + idx);
        if (d.queued || d.running) {
          r.className = 'result-box result-loading';
          r.textContent = d.message || '测试推送后台执行中...';
          pushTestTimers[idx] = setTimeout(function(){ pollTestPush(idx); }, 3000);
          return;
        }
        pushTestDone(idx);
        r.className = 'result-box ' + (d.success ? 'result-success' : 'result-error');
        r.textContent = d.message || (d.success ? '测试推送已发送' : '测试推送失败');
      }).catch(function(e){
        pushTestDone(idx);
        var r = document.getElementById('pushTestResult' + idx);
        r.className = 'result-box result-error';
        r.textContent = '状态查询失败: ' + e;
      });
    }
    function testPush(idx, btn) {
      if (btn) { pushTestBtns[idx] = btn; btn.disabled = true; }  // 测试期间防重复点击
      var r = document.getElementById('pushTestResult' + idx);
      r.className = 'result-box result-loading'; r.textContent = '测试推送已提交（请先保存配置）...';
      fetch('/testpush?ch=' + idx, { method: 'POST' }).then(function(x){return x.json();}).then(function(d) {
        if (d.success && d.queued) {
          r.textContent = d.message || '后台测试推送中...';
          pollTestPush(idx);
        } else {
          pushTestDone(idx);
          r.className = 'result-box result-error';
          r.textContent = d.message || '任务启动失败';
        }
      }).catch(function(e){ pushTestDone(idx); r.className = 'result-box result-error'; r.textContent = '请求失败: ' + e; });
    }

    // ---- USSD ----
    function sendUssd() {
      var code = document.getElementById('ussdCode').value.trim();
      if (!code) return;
      var r = document.getElementById('ussdResult');
      r.className = 'result-box result-loading'; r.textContent = '查询中（最长约 20 秒）...';
      fetch('/ussd?code=' + encodeURIComponent(code)).then(function(x){return x.json();}).then(function(d) {
        r.className = 'result-box ' + (d.success ? 'result-info' : 'result-error');
        r.textContent = d.message || '(无响应)';
      }).catch(function(e){ r.className = 'result-box result-error'; r.textContent = '请求失败: ' + e; });
    }

    // ---- Send SMS ----
    function updateCount(el) { document.getElementById('charCount').textContent = el.value.length; }
    // ---- 发短信弹窗 ----
    function openSmsModal() {
      var r = document.getElementById('smsSendResult'); r.className = 'result-box'; r.textContent = '';
      document.getElementById('smsModal').classList.add('show');
      document.getElementById('smsPhone').focus();
    }
    function closeSmsModal() { document.getElementById('smsModal').classList.remove('show'); }
    function sendSmsModal() {
      var phone = document.getElementById('smsPhone').value.trim();
      var content = document.getElementById('smsContent').value;
      var r = document.getElementById('smsSendResult');
      if (!phone) { r.className = 'result-box result-error'; r.textContent = '请输入目标号码'; return; }
      if (!content.trim()) { r.className = 'result-box result-error'; r.textContent = '请输入短信内容'; return; }
      var btn = document.getElementById('smsSendBtn'); btn.disabled = true;
      r.className = 'result-box result-loading'; r.textContent = '提交中...';
      var body = 'phone=' + encodeURIComponent(phone) + '&content=' + encodeURIComponent(content);
      fetch('/sendsms', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function(x){ return x.json(); }).then(function(d) {
          btn.disabled = false;
          r.className = 'result-box ' + (d.success ? 'result-success' : 'result-error'); r.textContent = d.message;
          if (d.success) {
            document.getElementById('smsContent').value = ''; updateCount(document.getElementById('smsContent'));
            loadStatus();
            if (smsBox === 'sent') setTimeout(loadMessages, 1200);
            setTimeout(closeSmsModal, 1000);
          }
        }).catch(function(e){ btn.disabled = false; r.className = 'result-box result-error'; r.textContent = '请求失败: ' + e; });
    }

    // ---- Cellular HTTP payload traffic ----
    var pingPollTimer = null;
    function doPing(){
      var b=document.getElementById('pingBtn'),r=document.getElementById('pingResult');
      var url=(document.getElementById('pingUrl').value||'').trim();
      b.disabled=true;b.textContent='...';
      r.className='result-box result-loading';r.textContent='提交 payload 下载任务...';
      fetch('/ping',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'url='+encodeURIComponent(url)}).then(function(rr){return rr.json()}).then(function(d){
        if(d.success && d.running){ r.textContent='后台下载 payload 中（会短暂开启蜂窝数据）...'; pollPingStatus(); }
        else{ b.disabled=false;b.textContent='下载 payload'; r.className='result-box result-error'; r.textContent=d.message||'任务启动失败'; }
      }).catch(function(e){b.disabled=false;b.textContent='下载 payload';r.className='result-box result-error';r.textContent='请求失败: '+e;});
    }
    function pollPingStatus(){
      if(pingPollTimer) clearTimeout(pingPollTimer);
      fetch('/ping?action=status',{method:'POST'}).then(function(rr){return rr.json()}).then(function(d){
        var b=document.getElementById('pingBtn'),r=document.getElementById('pingResult');
        if(d.running){
          r.className='result-box result-loading';
          r.textContent='正在通过蜂窝网络下载 payload（后台执行，可刷新网页）...';
          pingPollTimer=setTimeout(pollPingStatus,1000);
          return;
        }
        b.disabled=false;b.textContent='下载 payload';
        if(d.success){r.className='result-box result-success';r.textContent='payload 下载完成 — '+(d.message||'完成');}
        else{r.className='result-box result-error';r.textContent='payload 下载失败 — '+(d.message||'无结果');}
      }).catch(function(e){
        var b=document.getElementById('pingBtn'),r=document.getElementById('pingResult');
        b.disabled=false;b.textContent='下载 payload';r.className='result-box result-error';r.textContent='状态查询失败: '+e;
      });
    }

    // ---- WiFi Control ----
    function wifiRestart(){
      if(!confirm('确定要重启WiFi吗？网页将暂时不可用。'))return;
      var r=document.getElementById('wifiResult');
      r.className='result-box result-loading';r.textContent='WiFi 重启中（约5秒）...';
      fetch('/wifi?action=restart').then(function(rr){return rr.json()}).then(function(d){
        r.className=d.success?'result-box result-success':'result-box result-error';
        r.textContent=d.message;
      }).catch(function(e){r.className='result-box result-error';r.textContent='请求失败: '+e;});
    }

    // ---- Flight Mode ----
    function queryFlightMode(){
      var r=document.getElementById('flightResult');
      r.className='result-box result-loading';r.textContent='查询中...';
      fetch('/flight?action=query').then(function(rr){return rr.json()}).then(function(d){
        if(d.success){r.className='result-box result-info';r.innerHTML=d.message;}
        else{r.className='result-box result-error';r.innerHTML='查询失败: '+d.message;}
      }).catch(function(e){r.className='result-box result-error';r.textContent='请求失败: '+e;});
    }
    function toggleFlightMode(){
      if(!confirm('确定要切换飞行模式吗？'))return;
      var b=document.getElementById('flightBtn'),r=document.getElementById('flightResult');
      b.disabled=true;r.className='result-box result-loading';r.textContent='切换中...';
      fetch('/flight?action=toggle').then(function(rr){return rr.json()}).then(function(d){
        b.disabled=false;
        if(d.success){r.className='result-box result-success';r.innerHTML=d.message;}
        else{r.className='result-box result-error';r.innerHTML='切换失败: '+d.message;}
      }).catch(function(e){b.disabled=false;r.className='result-box result-error';r.textContent='请求失败: '+e;});
    }

    // ---- Modem Control ----
    function modemAction(action){
      var names={'restart':'软重启','hardreset':'硬重启'};
      var name=names[action]||action;
      var resultEl=document.getElementById('modemRstResult');   // 仅 restart/hardreset 调用本函数
      if(action==='hardreset'){
        if(!confirm('硬重启将断电重启模组，确定继续？'))return;
        resultEl.className='result-box result-loading';resultEl.textContent='硬重启中（约10秒）...';
        fetch('/modem?action=hardreset').then(function(rr){return rr.json()}).then(function(d){
          resultEl.className='result-box result-success';resultEl.textContent=d.message+' — 稍后请手动查询信号确认恢复';
        }).catch(function(e){resultEl.className='result-box result-error';resultEl.textContent='请求失败: '+e;});
        return;
      }
      resultEl.className='result-box result-loading';resultEl.textContent=name+'中...';
      fetch('/modem?action='+action).then(function(rr){return rr.json()}).then(function(d){
        if(d.success){
          resultEl.className='result-box result-success';resultEl.textContent=name+'成功: '+d.message;
        }
        else{resultEl.className='result-box result-error';resultEl.textContent=name+'失败: '+d.message;}
      }).catch(function(e){resultEl.className='result-box result-error';resultEl.textContent='请求失败: '+e;});
    }

    // ---- AT Terminal ----
    function atTime(){var d=new Date(),p=function(n){return('0'+n).slice(-2)};return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());}
    function addLog(msg,type){
      type=type||'resp';var log=document.getElementById('atLog'),div=document.createElement('div'),b=document.createElement('b');
      if(!log)return;
      var ts=document.createElement('span');ts.className='at-ts';ts.textContent='['+atTime()+'] ';
      if(type==='user'){b.style.color='#fff';b.textContent='> ';}
      else if(type==='error'){b.style.color='#f44336';b.textContent='! ';}
      else{b.style.color='#50e3c2';b.textContent='';}
      div.appendChild(ts);div.appendChild(b);div.appendChild(document.createTextNode(msg));
      log.appendChild(div);log.scrollTop=log.scrollHeight;
    }
    var atHistory=[],atHistPos=-1,atDraft='';
    function sendAT(){
      var inp=document.getElementById('atCmd');if(!inp)return;var cmd=inp.value.trim();if(!cmd)return;
      var btn=document.getElementById('atBtn');
      if(btn&&btn.disabled)return;  // 上一条还在执行(含快捷指令入口)，避免并发 /at 请求堆积拖垮 httpd
      if(atHistory[atHistory.length-1]!==cmd){atHistory.push(cmd);if(atHistory.length>30)atHistory.shift();}
      atHistPos=-1;atDraft='';
      btn.disabled=true;btn.textContent='...';
      addLog(cmd,'user');inp.value='';
      fetch('/at?cmd='+encodeURIComponent(cmd)).then(function(rr){return rr.json()}).then(function(d){
        addLog(d.message,d.success?'resp':'error');
      }).catch(function(e){addLog('网络错误: '+e,'error')}).finally(function(){btn.disabled=false;btn.textContent='发送';});
    }
    function atQuick(cmd){var inp=document.getElementById('atCmd');if(!inp)return;inp.value=cmd;sendAT();}
    function clearATLog(){var l=document.getElementById('atLog');if(!l)return;l.innerHTML='';addLog('日志已清空','resp');}
    function bindAtTerminal(){
      var el = document.getElementById('atCmd');
      if (!el || el.dataset.bound) return;
      el.dataset.bound = '1';
      el.addEventListener('keydown',function(e){
        if(e.key==='Enter'){sendAT();return;}
        // ↑/↓ 翻阅历史命令(常用调试指令不用反复输入)；开始翻阅时暂存未发送的草稿，翻过头恢复
        if(e.key==='ArrowUp'||e.key==='ArrowDown'){
          if(!atHistory.length)return;
          e.preventDefault();
          if(e.key==='ArrowUp'){
            if(atHistPos<0){atDraft=el.value;atHistPos=atHistory.length-1;}
            else atHistPos=Math.max(0,atHistPos-1);
          }else{
            if(atHistPos<0)return;  // 没在翻历史，不动用户正在输入的内容
            atHistPos+=1;
          }
          if(atHistPos>=atHistory.length){atHistPos=-1;el.value=atDraft;return;}
          el.value=atHistory[atHistPos];
        }
      });
    }

    // ---- Log Viewer (进入页/手动刷新重放保留日志，自动刷新只追新增) ----
    var logTimer = null, logSince = 0, logLines = [], logLoading = false;
    function startLogPoll() {
      if (logTimer) return;
      logTimer = setInterval(refreshLog, 2000);
    }
    function stopLogPoll() {
      if (logTimer) { clearInterval(logTimer); logTimer = null; }
    }
    function toggleLogAuto() {
      var auto = document.getElementById('logAuto');
      if (auto && auto.checked) startLogPoll();
      else stopLogPoll();
    }
    function setLogStatus(text) {
      var s = document.getElementById('logStatus');
      if (s) s.textContent = text || '';
    }
    function logNearBottom(el) {
      return el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    }
    function renderLogView(emptyText) {
      var el = document.getElementById('logView');
      if (!el) return;
      var stick = logNearBottom(el);  // 用户上翻查看历史时，自动刷新不把滚动条拖回底部
      if (!logLines.length) {
        el.textContent = emptyText == null ? '(暂无日志)' : emptyText;
      } else {
        // 先转义再拼接高亮 span，无注入风险
        el.innerHTML = logLines.map(function(l) {
          var cls = /失败|错误|超时|异常|error|fail/i.test(l) ? ' err'
                  : (/重试|警告|warn|降级|忽略/i.test(l) ? ' warn' : '');
          return '<span class="log-line' + cls + '">' + htmlEsc(l) + '</span>';
        }).join('\n');
      }
      if (stick) el.scrollTop = el.scrollHeight;  // 只有原本就在底部时才跟随
    }
    function copyLogAll(btn) { copyText(logLines.join('\n'), btn); }
    function initLogPanel() {
      reloadLog();
      var auto = document.getElementById('logAuto');
      if (!auto || auto.checked) startLogPoll();
      else stopLogPoll();
    }
    function clearLogUI() {
      logLines = [];
      renderLogView('');
      setLogStatus('已清空，之后只显示新日志');
    }
    function reloadLog() {
      logLines = [];
      logSince = 0;
      renderLogView('加载中...');
      refreshLog(true);
    }
    function refreshLog(fullReload) {
      fullReload = !!fullReload;
      if (document.hidden && !fullReload) return;  // 后台标签页不轮询，省带宽与设备负载
      if (logLoading) return;
      var el = document.getElementById('logView');
      if (!el) return;
      var reqSince = fullReload ? 0 : logSince;
      logLoading = true;
      if (fullReload) setLogStatus('正在加载设备端保留日志...');
      fetch('/log?since=' + reqSince + '&_=' + Date.now(), { cache: 'no-store' }).then(function(r) { return r.json(); }).then(function(d) {
        if (!d || !Array.isArray(d.lines)) return;
        if (fullReload || d.seq < logSince) logLines = [];  // 重载/设备重启 -> 重置
        logSince = d.seq;
        if (d.lines.length) {
          logLines = logLines.concat(d.lines);
          if (logLines.length > 500) logLines = logLines.slice(logLines.length - 500);
          renderLogView();
        } else if (fullReload || el.textContent === '加载中...') {
          renderLogView('(暂无日志)');
        }
        setLogStatus('共 ' + logLines.length + ' 条');
      }).catch(function() {
        if (fullReload || el.textContent === '加载中...') {
          renderLogView('无法获取日志');
          setLogStatus('日志请求失败');
        }
      }).finally(function() {
        logLoading = false;
      });
    }
    // ---- Keep-Alive (保号) ----
    function normalizeKaUrlForDisplay(url) {
      url = url || '';
      if (url.indexOf('gg.incrafttime.top/api/payload') >= 0) url = url.replace('size=128684', 'size=64342');
      return url;
    }
    function kaLoadStatus() {
      fetch('/keepalive?action=status').then(function(r){return r.json();}).then(function(d) {
        var el = document.getElementById('kaEnabled'); if (el) el.checked = !!d.enabled;
        el = document.getElementById('kaIntervalDays'); if (el) el.value = d.intervalDays;
        el = document.getElementById('kaAction'); if (el) el.value = d.action;
        el = document.getElementById('kaTarget'); if (el) el.value = d.target || '';
        var kaUrl = normalizeKaUrlForDisplay(d.url);
        el = document.getElementById('kaUrl'); if (el) el.value = kaUrl;
        el = document.getElementById('pingUrl'); if (el) el.value = kaUrl;
        var cd = document.getElementById('kaCountdown');
        if (!cd) return;
        if (!d.timeValid) cd.textContent = '时间未同步，倒计时暂不可用';
        else if (!d.lastTime) cd.textContent = '尚未建立基准日，启用后首次检查时建立';
        else cd.textContent = '距下次保号约 ' + d.daysLeft + ' 天';
      }).catch(function(){});
    }
    var kaRunTimer = null;
    function kaPollRunStatus() {
      if (kaRunTimer) clearTimeout(kaRunTimer);
      fetch('/keepalive?action=status').then(function(r){return r.json();}).then(function(d) {
        var rbox = document.getElementById('kaResult');
        if (d.jobQueued || d.jobRunning) {
          rbox.className = 'result-box result-loading';
          rbox.textContent = d.jobMessage || '保号动作后台执行中...';
          kaRunTimer = setTimeout(kaPollRunStatus, 1500);
          return;
        }
        if (d.jobDone) {
          rbox.className = 'result-box ' + (d.jobSuccess ? 'result-success' : 'result-error');
          rbox.textContent = d.jobMessage || (d.jobSuccess ? '保号动作已完成' : '保号动作失败');
          kaLoadStatus();
        }
      }).catch(function(e){
        var rbox = document.getElementById('kaResult');
        rbox.className = 'result-box result-error';
        rbox.textContent = '状态查询失败: ' + e;
      });
    }
    function kaRun() {
      var r = document.getElementById('kaResult');
      r.className = 'result-box result-loading'; r.textContent = '正在提交后台保号任务...';
      fetch('/keepalive?action=run').then(function(x){return x.json();}).then(function(d) {
        if (d.success && d.queued) {
          r.textContent = d.message || '保号动作已排队';
          kaPollRunStatus();
        } else {
          r.className = 'result-box result-error';
          r.textContent = d.message || '任务启动失败';
        }
      }).catch(function(e){ r.className = 'result-box result-error'; r.textContent = '请求失败: ' + e; });
    }
    function kaReset() {
      if (!confirm('确定把保号基准日重置为今天？')) return;
      var r = document.getElementById('kaResult');
      r.className = 'result-box result-loading'; r.textContent = '处理中...';
      fetch('/keepalive?action=reset').then(function(x){return x.json();}).then(function(d) {
        r.className = 'result-box result-success'; r.textContent = d.message; kaLoadStatus();
      }).catch(function(e){ r.className = 'result-box result-error'; r.textContent = '请求失败: ' + e; });
    }

    // ---- Overview dashboard (live /status) ----
    function ovSet(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
    function fmtCsq(c) {
      if (c == null || c >= 99 || c < 0) return '无信号';
      var dbm = -113 + 2 * c;
      return dbm + ' dBm';
    }
    function modemPhaseText(d) {
      var p = d && d.modemInitPhase;
      if (p === 'powering') return '模组上电中';
      if (p === 'at_ready') return 'AT已就绪';
      if (p === 'registering') return '网络注册中';
      if (p === 'ready') return '已就绪';
      if (p === 'failed') return '注册超时';
      return d && d.modemReady ? '已就绪' : '启动中';
    }
    function signalPendingText(d) {
      if (!d || !d.signalFresh) return modemPhaseText(d);
      if (!d.modemReady && d.modemInitPhase !== 'ready') return '注册中';
      return '无信号';
    }
    function fmtCsqStatus(d) {
      return (!d || d.csq == null || d.csq >= 99 || d.csq < 0) ? signalPendingText(d) : (d.csq + ' /31');
    }
    function fmtRssiStatus(d) {
      return (!d || d.csq == null || d.csq >= 99 || d.csq < 0) ? signalPendingText(d) : fmtCsq(d.csq);
    }
    function pendingValue(v, fresh) { return v || (fresh ? '--' : '采样中'); }
    var devTz = 480;  // 设备时区分钟偏移(从 /status 更新)，按此格式化时间，与查看者所在时区无关
    var apHandled = false;  // 配网模式只自动跳转一次
    function fmtEpoch(ep) {
      if (!ep) return '(无)';
      var d = new Date((ep + devTz * 60) * 1000), p = function(n){ return ('0' + n).slice(-2); };
      return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
    }
    // 详情抽屉里用到秒的完整时间
    function fmtEpochFull(ep) {
      if (!ep) return '(无)';
      var d = new Date((ep + devTz * 60) * 1000), p = function(n){ return ('0' + n).slice(-2); };
      return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' +
             p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
    }
    function fmtClockEpoch(ep) {
      if (!ep) return '--';
      var d = new Date((ep + devTz * 60) * 1000), p = function(n){ return ('0' + n).slice(-2); };
      return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
    }
    function fmtRsrp(r) { if (r == null || r >= 0 || r < -200) return '--'; return r + ' dBm'; }
    function fmtBer(b) { return (b == null || b >= 99) ? '99 (未知)' : String(b); }
    function fmtDb(v, unit) { if (v == null || v === 999 || v < -200) return '--'; return v + (unit || ' dB'); }
    function fmtUptime(s) { var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h + ':' + ('0' + m).slice(-2) + ':' + ('0' + x).slice(-2); }
    // ESP-IDF esp_reset_reason_t 显示名；11=USB 外设复位，常见于 USB 串口/下载/主机重新枚举。
    function resetReasonText(v) {
      var m = {0:'未知',1:'上电/复位键',2:'外部引脚',3:'软件重启',4:'异常崩溃',5:'中断看门狗',6:'任务看门狗',7:'其他看门狗',8:'深睡眠唤醒',9:'棕断/欠压',10:'SDIO复位',11:'USB复位',12:'JTAG复位',13:'eFuse错误',14:'电源毛刺',15:'CPU锁死'};
      return (m[v] || '原因码') + ' (' + v + ')';
    }
    function kb(b) { return Math.round(b / 1024) + ' KB'; }
    // 信号量表填充：raw 映射到 lo..hi 百分比，按 warnAt/okAt 染色(越大越好)
    function setGauge(id, raw, lo, hi, label, warnAt, okAt) {
      var fill = document.getElementById(id), vEl = document.getElementById(id + 'V');
      if (vEl) vEl.textContent = label;
      if (!fill) return;
      var bad = (raw == null || raw === 999 || raw < -200 || (lo === 0 && hi === 31 && raw >= 99));
      if (bad) { fill.style.width = '0'; fill.className = 'fill'; return; }
      var pct = Math.max(2, Math.min(100, (raw - lo) / (hi - lo) * 100));
      fill.style.width = pct + '%';
      fill.className = 'fill ' + (raw >= okAt ? 'ok' : raw >= warnAt ? 'warn' : 'bad');
    }
    var statusTimer = null, statusPolling = false, statusSeq = 0, statusAbort = null, statusLoading = false, statusFailCount = 0, devEpochBase = 0, devEpochBaseMs = 0, latestStatusKey = '', statusFastUntil = 0;
    function deviceEpochNow() {
      if (!devEpochBase) return 0;
      return devEpochBase + Math.floor((Date.now() - devEpochBaseMs) / 1000);
    }
    function updateDeviceClockLabel() {
      var ep = deviceEpochNow();
      if (ep) ovSet('ovRefresh', '设备 ' + fmtClockEpoch(ep));
    }
    function loadStatus() {
      if (statusLoading) return;  // 上一次 /status 还没回来时不叠加请求，避免 ESP32 被轮询拖慢
      statusLoading = true;
      var seq = ++statusSeq, timedOut = false, finished = false;
      var ctrl = window.AbortController ? new AbortController() : null;
      statusAbort = ctrl;
      var opt = { cache: 'no-store' };
      if (ctrl) opt.signal = ctrl.signal;
      var timeoutId = setTimeout(function() {
        if (finished || seq !== statusSeq) return;
        timedOut = true;
        if (ctrl) ctrl.abort();
        else ovSet('ovRefresh', '刷新超时');
      }, 7000);
      fetch('/status?_=' + Date.now(), opt).then(function(r){return r.json();}).then(function(d) {
        if (seq !== statusSeq || timedOut) return;  // 旧响应直接丢弃，只显示最新状态
        statusFailCount = 0;
        if (typeof d.tz === 'number') devTz = d.tz;
        if (typeof d.nowEpoch === 'number' && d.nowEpoch > 100000) {
          devEpochBase = d.nowEpoch;
          devEpochBaseMs = Date.now();
          updateDeviceClockLabel();
        }
        // KPI 指标条
        setGauge('gCsq', d.csq, 0, 31, fmtCsqStatus(d), 8, 14);  // CSQ 原始值
        setGauge('gRssi', (d.csq == null || d.csq >= 99) ? null : (-113 + 2 * d.csq), -110, -50, fmtRssiStatus(d), -95, -75);  // RSSI=CSQ 换算 dBm(与诊断"信号查询"一致)
        setGauge('gRsrp', d.rsrp, -120, -70, (!d.modemReady && (d.rsrp == null || d.rsrp >= 0)) ? '注册后采样' : fmtRsrp(d.rsrp), -110, -100);
        setGauge('gRsrq', d.rsrq, -20, -3, (!d.modemReady && (d.rsrq == null || d.rsrq === 999)) ? '注册后采样' : fmtDb(d.rsrq), -15, -10);
        setGauge('gSinr', d.sinr, 0, 30, (!d.modemReady && (d.sinr == null || d.sinr === 999)) ? '注册后采样' : fmtDb(d.sinr), 0, 13);
        setGauge('gWifi', (d.rssi == null || d.rssi >= 0) ? null : d.rssi, -90, -40, (d.rssi == null || d.rssi >= 0) ? '--' : (d.rssi + ' dBm'), -75, -65);  // WiFi RSSI(质量见下方卡片)
        ovSet('ovData', d.dataEnabled ? '已启用' : '已禁用');
        ovSet('ovDataSub', d.dataEnabled ? (d.cellIp || '获取中') : '零流量');
        ovSet('ovSms', d.smsTotal); ovSet('ovLastSms', '最近 ' + fmtEpoch(d.lastSmsEpoch));
        ovSet('ovInbox', d.inboxCount + ' 条');
        var busyQueues = !!(d.slowBusy || d.fwdQueueDepth || d.queueDepth || d.outSmsQueueDepth || d.emailQueueDepth);
        if (busyQueues) statusFastUntil = Date.now() + 12000;
        var lk = [d.smsTotal, d.lastSmsEpoch, d.inboxCount, d.fwdQueueDepth, d.queueDepth, d.slowBusy ? 1 : 0].join(':');
        if (lk !== latestStatusKey) {
          latestStatusKey = lk;
          loadLatestOtp();
        }
        // 设备 / 固件信息卡片
        ovSet('dvHeap', kb(d.freeHeap) + ' · 最低 ' + kb(d.minFreeHeap));
        window.__upt = d.uptime; ovSet('dvUptime', fmtUptime(d.uptime)); ovSet('dvEspVer', d.version);
        ovSet('dvTemp', (d.chipTemp != null ? d.chipTemp + ' ℃' : '--'));
        ovSet('dvMfr', d.mfr || '--'); ovSet('dvModel', d.model || '--'); ovSet('dvFw', d.fwver || '--');
        // SIM 卡信息
        ovSet('tOp', d.operator || (d.modemReady ? '查询中' : modemPhaseText(d))); ovSet('tModem', modemPhaseText(d));
        ovSet('tCellIp', d.dataEnabled ? (d.cellIp || '获取中') : '— (未启用)');
        ovSet('tPhone', d.phone || '--'); ovSet('tImei', d.imei || '--'); ovSet('tIccid', d.iccid || '--');
        ovSet('tImsi', pendingValue(d.imsi, d.identityFresh)); ovSet('tApn', d.apnSim || d.apn || (d.identityFresh ? '--' : '采样中'));
        // WiFi 详细信息卡片(独立卡，原"网络与SIM"里的 WiFi 行已移出)
        ovSet('wfSsid', d.ssid || '--');
        ovSet('wfIp', d.ip || '--'); ovSet('wfGw', d.gw || '--'); ovSet('wfMask', d.mask || '--');
        ovSet('wfDns', d.dns || '--'); ovSet('wfMac', d.mac || '--'); ovSet('wfBssid', d.bssid || '--');
        ovSet('wfChan', (d.chan != null && d.chan > 0) ? d.chan : '--');
        // 转发与系统
        var qText = d.fwdQueueDepth + ' / ' + d.queueDepth + ' / ' + (d.outSmsQueueDepth || 0) + ' / ' + (d.emailQueueDepth || 0);
        if (d.slowBusy) qText += ' · 推送中';
        ovSet('tQueue', qText);
        ovSet('tMaxBlock', kb(d.maxAllocHeap));
        ovSet('tReset', resetReasonText(d.resetReason));
        ovSet('tTime', (d.timeSynced ? '已同步 ' : '未同步 ') + (d.nowEpoch > 100000 ? fmtEpoch(d.nowEpoch) : '--'));
        ovSet('cfgEmail', d.emailEnabled ? (d.emailConfigured ? '已配置' : '未配置') : '已关闭');
        ovSet('cfgPush', d.pushEnabled ? ((d.pushEnabledCount || 0) + ' 个已启用') : '已关闭');
        ovSet('cfgAdmin', d.adminPhone || '--');
        if (d.apMode) {
          var lv = document.getElementById('ovLive');
          if (lv) { lv.textContent = '● 配网模式（请到 WiFi 设置配置网络）'; lv.style.color = 'var(--error)'; }
          if (!apHandled) { apHandled = true; switchPanel('settings'); }
        }
      }).catch(function() {
        if (seq !== statusSeq) return;
        statusFailCount++;
        if (timedOut) { ovSet('ovRefresh', '刷新超时'); return; }
        ovSet('ovRefresh', '刷新失败');
        if (statusFailCount >= 3) {
          var e = document.getElementById('ovLive'); if (e) { e.textContent = '● 离线'; e.style.color = 'var(--error)'; }
        }
      }).then(function() {
        if (seq !== statusSeq) return;
        finished = true;
        statusLoading = false;
        clearTimeout(timeoutId);
        if (statusAbort === ctrl) statusAbort = null;
      });
    }
    function scheduleStatusPoll(delay) {
      if (!statusPolling || statusTimer) return;
      statusTimer = setTimeout(function() {
        statusTimer = null;
        if (!statusPolling) return;
        if (!document.hidden) loadStatus();
        scheduleStatusPoll(Date.now() < statusFastUntil ? 800 : 2000);
      }, delay);
    }
    function startStatusPoll() {
      if (statusPolling) return;
      statusPolling = true;
      scheduleStatusPoll(500);
      // 运行时长本地秒表：每秒自增显示(不靠轮询)，由 loadStatus 拉到的 uptime 校准
      if (!window.__uptTimer) window.__uptTimer = setInterval(function(){
        if (window.__upt != null && !document.hidden) { window.__upt++; var e = document.getElementById('dvUptime'); if (e) e.textContent = fmtUptime(window.__upt); }
        if (!document.hidden) updateDeviceClockLabel();
      }, 1000);
    }
    function stopStatusPoll() { statusPolling = false; if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; } }

    // ---- SIM / 网络 ----
    // ---- SMS (收 / 发) ----
    var smsBox = 'recv';
    function smsTab(b) {
      smsBox = b;
      document.getElementById('tabRecv').classList.toggle('active', b === 'recv');
      document.getElementById('tabSent').classList.toggle('active', b === 'sent');
      loadMessages();
    }
    // 验证码提取(镜像固件 extractOtp：首段 4-8 位独立数字串)
    function otpExtract(t) { var m = String(t).match(/(?:^|\D)(\d{4,8})(?:\D|$)/); return m ? m[1] : ''; }
    function htmlEsc(s) { return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function copyText(txt, el) {
      try { if (navigator.clipboard) navigator.clipboard.writeText(txt); } catch (e) {}
      if (el) { var o = el.textContent; el.textContent = '已复制'; setTimeout(function(){ el.textContent = o; }, 800); }
    }
    function loadMessages() {
      var box = document.getElementById('inboxList');
      var sent = (smsBox === 'sent');
      // 有同类缓存先即时渲染(避免每次进入都空白"加载中")，再后台拉取刷新
      if (window.__msgFull && window.__msgBox === (sent ? 'sent' : 'recv')) renderMessages();
      else box.textContent = '加载中...';
      fetch('/messages' + (sent ? '?box=sent' : '')).then(function(r){return r.json();}).then(function(arr) {
        if (!Array.isArray(arr)) arr = [];
        window.__msgFull = arr;                 // 全量缓存：搜索本地过滤，不再每按键请求
        window.__msgBox = sent ? 'sent' : 'recv';
        var cnt = document.getElementById(sent ? 'cntSent' : 'cntRecv');
        if (cnt) cnt.textContent = arr.length ? String(arr.length) : '';
        renderMessages();
      }).catch(function() { box.textContent = '无法获取短信'; });
    }
    // 仅用缓存过滤+渲染(搜索框输入调用，零网络请求，瞬时响应)
    function renderMessages() {
      var box = document.getElementById('inboxList');
      var sent = (window.__msgBox === 'sent');
      var qEl = document.getElementById('smsSearch');
      var q = (qEl && qEl.value || '').trim().toLowerCase();
      var arr = (window.__msgFull || []).slice();
      if (q) arr = arr.filter(function(m){ var who = sent ? (m.target||'') : (m.sender||''); return (who + ' ' + (m.text||'')).toLowerCase().indexOf(q) >= 0; });
      box.innerHTML = '';
      if (!arr.length) {
        var em = document.createElement('div'); em.className = 'msg-empty';
        em.textContent = q ? ('未匹配 “' + q + '”') : (sent ? '(暂无已发送短信)' : '(暂无短信)'); box.appendChild(em); return;
      }
      window.__msgCache = arr;
      arr.forEach(function(m) {
          var d = document.createElement('div'); d.className = 'msg'; d.style.cursor = 'pointer'; d.onclick = function(){ openMsgDrawer(m.id); };
          var h = document.createElement('div'); h.className = 'msg-head';
          var s = document.createElement('span'); s.className = 'msg-sender';
          var right = document.createElement('span'); right.style.display = 'flex'; right.style.gap = '6px'; right.style.alignItems = 'center';
          var otp = sent ? '' : otpExtract(m.text || '');
          if (otp) {
            var oc = document.createElement('span'); oc.className = 'msg-chip otp'; oc.textContent = '⎘ ' + otp; oc.title = '点击复制验证码';
            oc.onclick = function(ev){ ev.stopPropagation(); copyText(otp, oc); };
            right.appendChild(oc);
          }
          var chip = document.createElement('span'); chip.className = 'msg-chip';
          if (sent) {
            s.textContent = m.target || '(未知)';
            chip.textContent = m.ok ? '发送成功' : '发送失败'; chip.className += m.ok ? ' ok' : ' bad';
          } else {
            s.textContent = m.sender || '(未知)';
            chip.textContent = m.fwd ? '已处理' : '待处理'; chip.className += m.fwd ? ' ok' : ' wait';
          }
          right.appendChild(chip);
          h.appendChild(s); h.appendChild(right);
          var t = document.createElement('div'); t.className = 'msg-time';
          t.textContent = fmtEpoch(sent ? m.sent : m.recv);
          // 列表里长正文折叠到 4 行(点开抽屉看全文)，避免一条长短信占满整屏
          var b = document.createElement('div'); b.className = 'msg-body clamp';
          var body = htmlEsc(m.text || '');
          if (otp) body = body.replace(otp, '<mark>' + otp + '</mark>');  // otp 为纯数字，先转义再高亮，无注入风险
          b.innerHTML = body;
          d.appendChild(h); d.appendChild(t); d.appendChild(b); box.appendChild(d);
        });
    }

    // ---- System maintenance ----
    function sysReboot() {
      if (!confirm('确定重启设备？约 15 秒后恢复。')) return;
      var r = document.getElementById('sysResult');
      r.className = 'result-box result-loading'; r.textContent = '正在重启...';
      fetch('/reboot', {method:'POST'}).then(function(x){return x.json();}).then(function(d){
        r.className = 'result-box result-success'; r.textContent = d.message;
      }).catch(function(){ r.className = 'result-box result-info'; r.textContent = '设备正在重启，请稍后刷新页面'; });
    }
    function sysFactory() {
      if (!confirm('确定恢复出厂设置？将清空所有配置并重启，不可撤销！')) return;
      if (!confirm('再次确认：账号/邮件/推送/保号等全部配置都会被清除！')) return;
      var r = document.getElementById('sysResult');
      r.className = 'result-box result-loading'; r.textContent = '正在清除配置并重启...';
      fetch('/factory', {method:'POST'}).then(function(x){return x.json();}).then(function(d){
        r.className = 'result-box result-success'; r.textContent = d.message;
      }).catch(function(){ r.className = 'result-box result-info'; r.textContent = '设备正在重启，请稍后用默认账号登录'; });
    }

    // ---- WiFi settings ----
    function wifiScan() {
      var sel = document.getElementById('wifiScanSel');
      sel.innerHTML = '<option value="">扫描中（约 3 秒）...</option>';
      fetch('/wifiscan').then(function(r){return r.json();}).then(function(arr) {
        if (!Array.isArray(arr) || !arr.length) { sel.innerHTML = '<option value="">未发现 WiFi</option>'; return; }
        arr.sort(function(a, b){ return b.rssi - a.rssi; });
        sel.innerHTML = '<option value="">选择网络（共 ' + arr.length + ' 个）</option>';
        arr.forEach(function(w) {
          var o = document.createElement('option');
          o.value = w.ssid;
          o.textContent = (w.ssid || '(隐藏网络)') + '  ·  ' + w.rssi + ' dBm  ·  ' + (w.enc ? '加密' : '开放');
          sel.appendChild(o);
        });
      }).catch(function(){ sel.innerHTML = '<option value="">扫描失败</option>'; });
    }
    function wifiPick() {
      var v = document.getElementById('wifiScanSel').value;
      if (v) { document.getElementById('wifiSsidIn').value = v; document.getElementById('wifiPassIn').focus(); }
    }
    function wifiSave() {
      var s = document.getElementById('wifiSsidIn').value.trim();
      if (!s) { alert('请输入 WiFi 名称'); return; }
      if (!confirm('保存并重启接入 “' + s + '”？设备将重启约 15-20 秒。')) return;
      var r = document.getElementById('wifiCfgResult');
      r.className = 'result-box result-loading'; r.textContent = '保存中，设备即将重启...';
      var body = 'ssid=' + encodeURIComponent(s) + '&pass=' + encodeURIComponent(document.getElementById('wifiPassIn').value);
      fetch('/wificonfig', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:body}).then(function(x){return x.json();}).then(function(d) {
        r.className = 'result-box ' + (d.success ? 'result-success' : 'result-error'); r.textContent = d.message;
      }).catch(function(){ r.className = 'result-box result-info'; r.textContent = '设备正在重启，请连接目标 WiFi 后重新访问设备'; });
    }
    function wifiPrefill() {
      fetch('/status').then(function(r){return r.json();}).then(function(d) {
        if (d.ssid && !d.apMode && !document.getElementById('wifiSsidIn').value) document.getElementById('wifiSsidIn').value = d.ssid;
      }).catch(function(){});
    }

    // ---- Config backup / OTA ----
    function doExport() { location.href = '/export'; }
    function doImport() {
      var t = document.getElementById('importBox').value;
      if (!t.trim()) { return; }
      if (!confirm('确定导入配置？将覆盖当前设置。')) return;
      var r = document.getElementById('importResult');
      r.className = 'result-box result-loading'; r.textContent = '导入中...';
      fetch('/import', {method:'POST', headers:{'Content-Type':'text/plain'}, body:t}).then(function(x){return x.json();}).then(function(d){
        r.className = 'result-box ' + (d.success ? 'result-success' : 'result-error'); r.textContent = d.message;
      }).catch(function(e){ r.className = 'result-box result-error'; r.textContent = '请求失败: ' + e; });
    }
    function doOta() {
      var f = document.getElementById('otaFile').files[0];
      if (!f) { alert('请先选择 .bin 固件文件'); return; }
      if (!confirm('确定升级固件？升级过程中请勿断电。')) return;
      var r = document.getElementById('otaResult');
      r.className = 'result-box result-loading'; r.textContent = '上传中，请勿断电...';
      var fd = new FormData(); fd.append('update', f, f.name);
      fetch('/update', {method:'POST', body:fd}).then(function(x){return x.json();}).then(function(d){
        r.className = 'result-box ' + (d.success ? 'result-success' : 'result-error'); r.textContent = d.message;
      }).catch(function(){ r.className = 'result-box result-info'; r.textContent = '设备可能正在重启，请稍后刷新'; });
    }

    // ---- 转发规则 可视化搭建器 ----
    var fwdRules = [];  // {type,pattern,chans{},email,drop,enabled}
    function parseFwdRules() {
      var raw = (document.getElementById('forwardRulesRaw') || {}).value || '';
      fwdRules = [];
      raw.split('\n').forEach(function(line) {
        if (!line.trim()) return;
        var p = line.split('\t'); if (p.length < 3) return;
        var r = { type: p[0], pattern: p[1], chans: {}, email: false, drop: false, enabled: (p.length > 3 ? p[3] : '1') !== '0' };
        (p[2] || '').split(',').forEach(function(t) { t = t.trim();
          if (t === 'drop') r.drop = true; else if (t === 'email') r.email = true; else if (/^[1-5]$/.test(t)) r.chans[t] = true; });
        fwdRules.push(r);
      });
    }
    function serializeRules() {
      var lines = fwdRules.map(function(r) {
        var a = []; if (r.drop) a.push('drop'); else { if (r.email) a.push('email'); for (var c = 1; c <= 5; c++) if (r.chans[c]) a.push(String(c)); }
        return r.type + '\t' + r.pattern + '\t' + a.join(',') + '\t' + (r.enabled ? '1' : '0');
      });
      var el = document.getElementById('forwardRulesRaw'); if (el) el.value = lines.join('\n');
    }
    function addRule() { fwdRules.push({ type: 'kw', pattern: '', chans: {}, email: true, drop: false, enabled: true }); renderRules(); }
    function delRule(i) { fwdRules.splice(i, 1); renderRules(); }
    function moveRule(i, dlt) { var j = i + dlt; if (j < 0 || j >= fwdRules.length) return; var t = fwdRules[i]; fwdRules[i] = fwdRules[j]; fwdRules[j] = t; renderRules(); }
    function renderRules() {
      serializeRules();
      var box = document.getElementById('rulesList'); if (!box) return;
      if (!fwdRules.length) { box.innerHTML = '<div class="msg-empty">暂无规则。点“添加规则”新建；不加规则时短信转发到全部启用通道。</div>'; return; }
      box.innerHTML = '';
      fwdRules.forEach(function(r, i) {
        var d = document.createElement('div'); d.className = 'push-channel enabled'; d.style.marginBottom = '10px';
        var typeOpts = [['kw','关键词(子串)'],['re','正文正则'],['from','发件人正则']].map(function(o){return '<option value="'+o[0]+'"'+(r.type===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('');
        var chans = ''; for (var c = 1; c <= 5; c++) chans += '<label style="margin-right:12px;font-size:12px;white-space:nowrap;"><input type="checkbox" data-ch="'+c+'"'+(r.chans[c]?' checked':'')+(r.drop?' disabled':'')+'> '+htmlEsc(chanName(c))+'</label>';
        d.innerHTML =
          '<div class="push-channel-header"><b style="font-family:var(--mono);color:var(--amber);">'+(i+1<10?'0':'')+(i+1)+'</b>'+
          '<label style="font-size:12px;"><input type="checkbox" class="rEn"'+(r.enabled?' checked':'')+'> 启用</label>'+
          '<span style="margin-left:auto;display:flex;gap:6px;">'+
          '<button type="button" class="btn btn-secondary btn-sm" data-a="up">↑</button>'+
          '<button type="button" class="btn btn-secondary btn-sm" data-a="dn">↓</button>'+
          '<button type="button" class="btn btn-danger btn-sm" data-a="del">删除</button></span></div>'+
          '<div class="form-row"><div class="form-group" style="flex:0 0 132px;"><label class="form-label">匹配方式</label><select class="form-select rType">'+typeOpts+'</select></div>'+
          '<div class="form-group"><label class="form-label">模式（关键词 / 正则）</label><input class="form-input rPat" placeholder="如  验证码   或   ^(10086|10010)"></div></div>'+
          '<div class="form-group"><label class="form-label">命中后</label>'+
          '<label style="margin-right:14px;font-size:12px;color:var(--error);"><input type="checkbox" class="rDrop"'+(r.drop?' checked':'')+'> 丢弃(不转发)</label>'+
          '<label style="margin-right:12px;font-size:12px;"><input type="checkbox" class="rEmail"'+(r.email?' checked':'')+(r.drop?' disabled':'')+'> 邮件</label>'+chans+'</div>';
        d.querySelector('.rType').onchange = function(){ r.type = this.value; serializeRules(); };
        var pat = d.querySelector('.rPat'); pat.value = r.pattern; pat.oninput = function(){ r.pattern = this.value; serializeRules(); };
        d.querySelector('.rEn').onchange = function(){ r.enabled = this.checked; serializeRules(); };
        d.querySelector('.rDrop').onchange = function(){ r.drop = this.checked; renderRules(); };
        d.querySelector('.rEmail').onchange = function(){ r.email = this.checked; serializeRules(); };
        [].forEach.call(d.querySelectorAll('input[data-ch]'), function(cb){ cb.onchange = function(){ r.chans[this.getAttribute('data-ch')] = this.checked; serializeRules(); }; });
        d.querySelector('[data-a=up]').onclick = function(){ moveRule(i, -1); };
        d.querySelector('[data-a=dn]').onclick = function(){ moveRule(i, 1); };
        d.querySelector('[data-a=del]').onclick = function(){ delRule(i); };
        box.appendChild(d);
      });
    }
    // ---- 规则本地测试：镜像固件 eval_forward_rules + 派发门控（自上而下首条命中即止）----
    // 浏览器用 JS 正则预览，与设备端 POSIX ERE 在个别语法上可能有差异
    // 按固件派发逻辑折算实际会发出的目标：推送总开关、通道启用、邮件启用+配置齐全
    function deliverTargets(useEmail, chanMask) {
      var c = webConfig || {}, arr = c.pushChannels || [];
      var out = [], skipped = [];
      for (var n = 1; n <= 5; n++) {
        if (!chanMask[n]) continue;
        if (!c.pushEnabled) skipped.push(chanName(n) + '(推送总开关已关)');
        else if (!(arr[n - 1] || {}).enabled) skipped.push(chanName(n) + '(通道未启用)');
        else out.push(chanName(n));
      }
      if (useEmail) {
        if (!c.emailEnabled) skipped.push('邮件(邮件转发已关)');
        else if (!c.emailConfigured) skipped.push('邮件(SMTP 未配置齐全)');
        else out.push('邮件');
      }
      return { out: out, skipped: skipped };
    }
    function testRules() {
      serializeRules();
      var from = (document.getElementById('rtFrom').value || '').trim();
      var text = document.getElementById('rtText').value || '';
      var r = document.getElementById('rtResult');
      if (!text && !from) { r.className = 'result-box result-error'; r.textContent = '请先填写测试发件人或正文'; return; }
      for (var i = 0; i < fwdRules.length; i++) {
        var rule = fwdRules[i];
        if (!rule.enabled || !rule.pattern) continue;
        var hit = false;
        if (rule.type === 'kw') {
          hit = text.indexOf(rule.pattern) >= 0;
        } else {
          try { hit = new RegExp(rule.pattern, 'i').test(rule.type === 'from' ? from : text); }
          catch (e) { r.className = 'result-box result-error'; r.textContent = '规则 ' + (i + 1) + ' 的正则浏览器无法解析，请检查语法：' + e.message; return; }
        }
        if (!hit) continue;
        if (rule.drop) {
          r.className = 'result-box result-error';
          r.textContent = '命中规则 ' + (i + 1) + ' → 丢弃(不转发)';
          return;
        }
        var d = deliverTargets(rule.email, rule.chans);
        var msg = '命中规则 ' + (i + 1) + ' → ' + (d.out.length ? '实际转发到：' + d.out.join('、') : '没有可用转发目标(该短信不会被转发)');
        if (d.skipped.length) msg += '；跳过：' + d.skipped.join('、');
        r.className = 'result-box ' + (d.out.length ? 'result-success' : 'result-error');
        r.textContent = msg;
        return;
      }
      // 未命中：固件默认转发到全部启用通道 + 邮件(各自仍受开关/配置门控)
      var all = {}; for (var n = 1; n <= 5; n++) all[n] = true;
      var dd = deliverTargets(true, all);
      r.className = 'result-box ' + (dd.out.length ? 'result-info' : 'result-error');
      r.textContent = '未命中任何规则 → ' + (dd.out.length ? '按默认策略实际转发到：' + dd.out.join('、') : '没有可用转发目标(该短信不会被转发)');
    }

    // ---- 短信详情抽屉(点击展开) ----
    function openMsgDrawer(id) {
      var arr = window.__msgCache || [], box = window.__msgBox || 'recv', m = null;
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { m = arr[i]; break; }
      if (!m) return;
      var sent = (box === 'sent');
      var who = sent ? (m.target || '(未知)') : (m.sender || '(未知)');
      var otp = sent ? '' : otpExtract(m.text || '');
      var h = '<div class="dk">' + (sent ? '目标' : '发件人') + '</div>' +
              '<div class="dv">' + htmlEsc(who) + ' <span class="msg-chip" id="drawerCopyWho" style="cursor:pointer;">复制号码</span></div>';
      h += '<div class="dk">时间</div><div class="dv">' + fmtEpochFull(sent ? m.sent : m.recv) + '</div>';
      h += '<div class="dk">状态</div><div class="dv">' + (sent ? (m.ok ? '发送成功' : '发送失败') : (m.fwd ? '已处理' : '待处理')) + '</div>';
      h += '<div class="dk">正文长度</div><div class="dv">' + String((m.text || '').length) + ' 字符</div>';
      if (otp) h += '<div class="dk">验证码</div><div class="dv"><span class="otpcode" onclick="copyText(\'' + otp + '\', this)">' + otp + '</span></div>';
      var bh = htmlEsc(m.text || ''); if (otp) bh = bh.replace(otp, '<mark>' + otp + '</mark>');
      h += '<div class="dfull">' + bh + '</div><div class="btn-row">';
      if (!sent) h += '<button class="btn btn-primary btn-sm" onclick="resendMsg(' + id + ')">重发转发</button>';
      if (!sent) h += '<button class="btn btn-danger btn-sm" onclick="deleteMsg(' + id + ')">删除</button>';
      if (sent) h += '<button class="btn btn-primary btn-sm" id="drawerSendAgain">再发一次</button>';
      h += '<button class="btn btn-secondary btn-sm" id="drawerCopyFull">复制全文</button></div><div class="result-box" id="drawerRes"></div>';
      document.getElementById('drawerBody').innerHTML = h;
      var cf = document.getElementById('drawerCopyFull'); if (cf) cf.onclick = function(){ copyText(m.text || '', cf); };
      var cw = document.getElementById('drawerCopyWho'); if (cw) cw.onclick = function(){ copyText(who, cw); };
      // 已发送短信一键回填到发送弹窗，改两个字就能再发
      var sa = document.getElementById('drawerSendAgain');
      if (sa) sa.onclick = function() {
        closeMsgDrawer();
        openSmsModal();
        document.getElementById('smsPhone').value = m.target || '';
        var c = document.getElementById('smsContent');
        c.value = m.text || '';
        updateCount(c);
      };
      document.getElementById('msgDrawer').classList.add('show');
      document.getElementById('drawerBg').classList.add('show');
    }
    function closeMsgDrawer() { document.getElementById('msgDrawer').classList.remove('show'); document.getElementById('drawerBg').classList.remove('show'); }
    // Esc 关闭抽屉/发短信弹窗
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { closeMsgDrawer(); closeSmsModal(); }
    });
    function resendMsg(id) {
      var r = document.getElementById('drawerRes'); r.className = 'result-box result-loading'; r.textContent = '重发中...';
      fetch('/resend?id=' + id, { method: 'POST' }).then(function(x){return x.json();}).then(function(d) {
        r.className = 'result-box ' + (d.success ? 'result-success' : 'result-error'); r.textContent = d.message;
      }).catch(function(e){ r.className = 'result-box result-error'; r.textContent = '请求失败: ' + e; });
    }
    function deleteMsg(id) {
      if (!confirm('确定删除这条短信？')) return;
      fetch('/delete?id=' + id, { method: 'POST' }).then(function(x){return x.json();}).then(function(d) {
        if (d.success) { closeMsgDrawer(); loadMessages(); }
        else { var r = document.getElementById('drawerRes'); r.className = 'result-box result-error'; r.textContent = d.message; }
      }).catch(function(){});
    }
    // ---- 概览：最新接收 / 验证码 hero ----
    var latestOtpLoading = false;
    function loadLatestOtp() {
      if (latestOtpLoading) return;
      latestOtpLoading = true;
      fetch('/messages?limit=1').then(function(r){return r.json();}).then(function(arr) {
        var card = document.getElementById('otpHeroCard');
        if (!card) return;
        if (!Array.isArray(arr) || !arr.length) { card.style.display = 'none'; return; }
        var m = arr[0], otp = otpExtract(m.text || '');
        document.getElementById('ohFrom').textContent = m.sender || '(未知)';
        document.getElementById('ohText').textContent = m.text || '';
        document.getElementById('ohWhen').textContent = fmtEpoch(m.recv) + (m.fwd ? '　已处理' : '　待处理');
        var code = document.getElementById('ohCode');
        if (otp) { code.textContent = otp; code.onclick = function(){ copyText(otp, code); }; code.style.display = ''; } else { code.style.display = 'none'; }
        card.style.display = '';
        if (!m.fwd) setTimeout(loadLatestOtp, 1500);  // 刚入库时转发拆分可能下一帧才标记完成
      }).catch(function(){}).then(function(){ latestOtpLoading = false; });
    }

    document.addEventListener('DOMContentLoaded', function() {
      switchPanel(panelFromHash());
    });
    // ---- 设置表单 AJAX 原地保存：拦截所有 /save 表单，不再整页跳转 ----
    function showSaved(ok, msg) {
      var t = document.getElementById('saveToast');
      if (!t) { t = document.createElement('div'); t.id = 'saveToast'; document.body.appendChild(t); }
      t.textContent = msg || (ok ? '✓ 已保存' : '✗ 保存失败');
      t.className = 'save-toast ' + (ok ? 'ok' : 'err');
      void t.offsetWidth;                 // 触发重排以重启过渡动画
      t.classList.add('show');
      clearTimeout(window.__toastT);
      window.__toastT = setTimeout(function() { t.classList.remove('show'); }, 2200);
    }
    document.addEventListener('submit', function(e) {
      var f = e.target;
      if (!f || f.getAttribute('action') !== '/save') return;
      e.preventDefault();             // 阻止整页跳转；规则表单在此处再同步一次，避免事件顺序差异
      if (f.querySelector('#forwardRulesRaw')) serializeRules();
      var fd = new FormData(f);
      var body = new URLSearchParams();                  // 关键：用 urlencoded 而非 FormData(multipart)——
      fd.forEach(function(v, k){ body.append(k, v); });  // ESP32 WebServer 对 multipart 大表单会卡/超时致"网络错误"
      body.append('ajax', '1');
      var passChanged = (fd.get('webPass') || '') !== '';
      var btn = f.querySelector('button[type="submit"]'), old = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '保存中…'; }
      var attempt = function(n) {
        return fetch('/save', { method: 'POST', body: body }).then(function(r) {
          if (r.ok) ensureConfig(true);
          showSaved(r.ok, r.ok ? (passChanged ? '✓ 已保存，账号密码已更新' : '✓ 已保存') : ('✗ 保存失败 (' + r.status + ')'));
        }).catch(function() {
          if (n > 0) return new Promise(function(res){ setTimeout(res, 700); }).then(function(){ return attempt(n - 1); });  // 连接抖动自动重试
          showSaved(false, '✗ 网络错误（已重试，请稍后再点保存）');
        });
      };
      var done = function() { if (btn) { btn.disabled = false; btn.textContent = old; } };
      attempt(1).then(done, done);
    });
