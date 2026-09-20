/* ============================================================
 * 智慧工地可视化看板
 * 模块：甘特图 / 人员定位 / 塔吊监控 / 环境监测与喷淋联动 / 报警记录
 * ============================================================ */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pad = (n) => String(n).padStart(2, '0');
  const nowStr = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

  const C = { green: '#2ed573', yellow: '#ffc048', red: '#ff5c5c', blue: '#3fa9f5', cyan: '#00e4ff' };

  if (!window.echarts) {
    document.body.innerHTML = '<p style="color:#fff;padding:40px">ECharts 加载失败，请确认 assets/echarts.min.js 存在。</p>';
    return;
  }

  /* ---------------- 屏幕自适应（1920×1080 设计稿） ---------------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $('#app').style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------------- 时钟 ---------------- */
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  function tickClock() {
    const d = new Date();
    $('#clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    $('#dateText').textContent = `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`;
    $('#weekText').textContent = '星期' + WEEK[d.getDay()];
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ============================================================
   * 1. 项目进度甘特图
   * ============================================================ */
  const TODAY = +new Date(2026, 8, 19); // 演示基准日 2026-09-19
  const PROC = [
    { name: '土方开挖',   plan: ['2026-07-01', '2026-08-05'], start: '2026-07-02', prog: 1.00 },
    { name: '桩基工程',   plan: ['2026-07-10', '2026-08-20'], start: '2026-07-12', prog: 1.00 },
    { name: '地下室结构', plan: ['2026-08-01', '2026-10-15'], start: '2026-08-06', prog: 0.52 },
    { name: '主体结构',   plan: ['2026-08-15', '2026-11-30'], start: '2026-08-20', prog: 0.24 },
    { name: '二次结构',   plan: ['2026-10-01', '2026-12-15'], start: null,         prog: 0 },
    { name: '机电安装',   plan: ['2026-10-20', '2027-02-28'], start: null,         prog: 0 },
    { name: '装饰装修',   plan: ['2026-12-01', '2027-04-30'], start: null,         prog: 0 },
    { name: '室外配套',   plan: ['2027-03-01', '2027-05-31'], start: null,         prog: 0 },
  ];

  function ganttStatus(p) {
    const ps = +new Date(p.plan[0]), pe = +new Date(p.plan[1]);
    const planProg = Math.min(1, Math.max(0, (TODAY - ps) / (pe - ps)));
    if (p.prog >= 1) return { key: 'done', label: '已完工', color: C.green };
    const lag = planProg - p.prog; // 滞后率 = 计划进度 - 实际进度
    if (lag >= 0.10) return { key: 'danger', label: `滞后 ${(lag * 100).toFixed(0)}%`, color: C.red };
    if (lag > 0.02)  return { key: 'warn',   label: `滞后 ${(lag * 100).toFixed(0)}%`, color: C.yellow };
    return { key: 'ok', label: p.prog > 0 ? '正常' : '未开始', color: C.green };
  }

  const ganttChart = echarts.init($('#ganttChart'));
  ganttChart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8,24,50,.95)',
      borderColor: 'rgba(0,190,255,.4)',
      textStyle: { color: '#d7e8ff', fontSize: 12 },
      formatter: (p) => {
        const m = p.data.meta;
        return `<b>${m.name}</b><br/>计划工期：${m.plan[0]} ~ ${m.plan[1]}<br/>` +
               `实际开始：${m.start || '—'}<br/>完成进度：<b>${Math.round(m.prog * 100)}%</b><br/>` +
               `状态：<span style="color:${m.color};font-weight:700">${m.label}</span>`;
      },
    },
    grid: { left: 86, right: 50, top: 24, bottom: 30 },
    xAxis: {
      type: 'time',
      min: +new Date('2026-06-25'),
      max: +new Date('2027-06-10'),
      axisLabel: {
        color: '#7f9cc4', fontSize: 11,
        formatter: (v) => { const d = new Date(v); return d.getMonth() === 0 ? d.getFullYear() + '年1月' : (d.getMonth() + 1) + '月'; },
      },
      axisLine: { lineStyle: { color: 'rgba(0,190,255,.3)' } },
      splitLine: { show: true, lineStyle: { color: 'rgba(0,190,255,.07)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: PROC.map((p) => p.name),
      axisLabel: { color: '#cfeaff', fontSize: 13 },
      axisLine: { lineStyle: { color: 'rgba(0,190,255,.3)' } },
      axisTick: { show: false },
    },
    series: [{
      type: 'custom',
      data: PROC.map((p, i) => ({ value: [i], meta: Object.assign({ name: p.name, plan: p.plan, start: p.start, prog: p.prog }, ganttStatus(p)) })),
      renderItem: (params, api) => {
        const i = api.value(0);
        const p = PROC[i];
        const st = ganttStatus(p);
        const y = api.coord([+new Date(p.plan[0]), i])[1];
        const bandH = api.size([0, 1])[1];
        const barH = Math.min(16, bandH * 0.34);
        const ps = +new Date(p.plan[0]), pe = +new Date(p.plan[1]);
        const x1 = api.coord([ps, i])[0], x2 = api.coord([pe, i])[0];
        const children = [];
        // 计划时间线（空心条）
        children.push({
          type: 'rect',
          shape: { x: x1, y: y - barH / 2, width: x2 - x1, height: barH, r: 3 },
          style: { fill: 'rgba(63,169,245,0.16)', stroke: 'rgba(63,169,245,0.75)', lineWidth: 1, lineDash: [4, 3] },
        });
        if (p.start) {
          // 实际完成线（按进度比例着色）
          const as = +new Date(p.start);
          const ae = Math.min(as + (pe - ps) * p.prog, TODAY);
          const ax1 = api.coord([as, i])[0];
          const ax2 = Math.max(api.coord([ae, i])[0], ax1 + 4);
          children.push({
            type: 'rect',
            shape: { x: ax1, y: y - barH / 2, width: ax2 - ax1, height: barH, r: 3 },
            style: { fill: st.color, shadowColor: st.color, shadowBlur: 8 },
          });
          children.push({
            type: 'text',
            style: { x: ax2 + 6, y: y, text: Math.round(p.prog * 100) + '%', fill: '#cfeaff', fontSize: 12, align: 'left', verticalAlign: 'middle' },
          });
        } else {
          children.push({
            type: 'text',
            style: { x: (x1 + x2) / 2, y: y, text: '未开始', fill: '#5f7ba6', fontSize: 11, align: 'center', verticalAlign: 'middle' },
          });
        }
        return { type: 'group', children };
      },
      markLine: {
        silent: true, symbol: 'none',
        data: [{ xAxis: TODAY }],
        lineStyle: { color: C.red, type: 'dashed', width: 1.5 },
        label: { formatter: '今日 09-19', color: C.red, fontSize: 11, position: 'insideEndTop', rotate: 0 },
      },
    }],
  });

  /* ============================================================
   * 2. 施工人员定位 + 班组出勤
   * ============================================================ */
  const CREWS = [
    { key: 'rebar', name: '钢筋班', color: '#ff9f43' },
    { key: 'carp',  name: '木工班', color: '#f9ca24' },
    { key: 'mason', name: '瓦工班', color: '#54a0ff' },
    { key: 'scaf',  name: '架子班', color: '#1dd1a1' },
  ];
  // 各标段当日出勤人数
  const PLAN = {
    A: { rebar: 16, carp: 20, mason: 14, scaf: 10 },
    B: { rebar: 12, carp: 10, mason: 18, scaf: 8 },
    C: { rebar: 14, carp: 8,  mason: 12, scaf: 6 },
    D: { rebar: 10, carp: 6,  mason: 4,  scaf: 2 },
  };
  const ZONE_NAMES = { A: '标段A', B: '标段B', C: '标段C', D: '加工区' };
  const ZONE_BOX = {
    A: { x: 56, y: 80, w: 348, h: 166 },
    B: { x: 496, y: 80, w: 348, h: 166 },
    C: { x: 56, y: 340, w: 348, h: 166 },
    D: { x: 496, y: 340, w: 208, h: 166 },
  };
  const DUE = 186; // 应到人数
  const zoneTotal = (z) => Object.values(PLAN[z]).reduce((a, b) => a + b, 0);
  const crewTotal = (k) => Object.values(PLAN).reduce((a, z) => a + z[k], 0);
  const totalOn = Object.keys(PLAN).reduce((a, z) => a + zoneTotal(z), 0);

  // 图例 & 汇总
  $('#crewLegend').innerHTML = CREWS.map((c) =>
    `<span class="cl"><i style="background:${c.color}"></i>${c.name} <b>${crewTotal(c.key)}</b></span>`).join('');
  $('#attendSummary').textContent = `应到 ${DUE} 人 · 实到 ${totalOn} 人 · 出勤率 ${(totalOn / DUE * 100).toFixed(1)}%`;
  Object.keys(PLAN).forEach((z) => { $('#cnt' + z).textContent = zoneTotal(z) + '人'; });
  $('#kpiWorkers').textContent = totalOn;

  // 生成定位点
  const svgNS = 'http://www.w3.org/2000/svg';
  const workerLayer = $('#workerLayer');
  const workers = [];
  Object.keys(PLAN).forEach((z) => {
    CREWS.forEach((c) => {
      for (let i = 0; i < PLAN[z][c.key]; i++) {
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('class', 'worker-dot');
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('r', 3.2);
        dot.setAttribute('fill', c.color);
        g.appendChild(dot);
        workerLayer.appendChild(g);
        const w = { el: g, zone: z };
        moveWorker(w, true);
        workers.push(w);
      }
    });
  });
  function moveWorker(w, instant) {
    const b = ZONE_BOX[w.zone];
    const x = b.x + Math.random() * b.w;
    const y = b.y + Math.random() * b.h;
    if (instant) {
      w.el.style.transition = 'none';
      w.el.style.transform = `translate(${x}px,${y}px)`;
      requestAnimationFrame(() => { w.el.style.transition = ''; });
    } else {
      w.el.style.transform = `translate(${x}px,${y}px)`;
    }
  }
  // 每 4 秒随机移动约 1/3 的定位点，模拟人员流动
  setInterval(() => {
    workers.forEach((w) => { if (Math.random() < 0.33) moveWorker(w); });
  }, 4000);

  // 班组出勤堆叠条形图
  const attendChart = echarts.init($('#attendChart'));
  const zoneKeys = ['A', 'B', 'C', 'D'];
  attendChart.setOption({
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(8,24,50,.95)', borderColor: 'rgba(0,190,255,.4)',
      textStyle: { color: '#d7e8ff', fontSize: 12 },
      formatter: (params) => {
        const rows = params.filter((p) => p.seriesName !== '合计');
        let total = 0;
        const lines = rows.map((p) => { total += p.value; return `${p.marker}${p.seriesName}：${p.value}人`; });
        return `<b>${params[0].name}</b><br/>${lines.join('<br/>')}<br/>合计：<b style="color:#00e4ff">${total}人</b>`;
      },
    },
    grid: { left: 64, right: 44, top: 8, bottom: 26 },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#7f9cc4', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(0,190,255,.08)' } },
    },
    yAxis: {
      type: 'category', inverse: true,
      data: zoneKeys.map((z) => ZONE_NAMES[z]),
      axisLabel: { color: '#cfeaff', fontSize: 13 },
      axisLine: { lineStyle: { color: 'rgba(0,190,255,.3)' } },
      axisTick: { show: false },
    },
    series: CREWS.map((c) => ({
      name: c.name, type: 'bar', stack: 'total', barWidth: 20,
      itemStyle: { color: c.color, borderRadius: 2 },
      label: { show: true, color: '#061224', fontSize: 11, fontWeight: 700, formatter: (v) => (v.value >= 4 ? v.value : '') },
      data: zoneKeys.map((z) => PLAN[z][c.key]),
    })).concat([{
      name: '合计', type: 'bar', stack: 'total', barWidth: 20, tooltip: { show: false },
      itemStyle: { color: 'transparent' }, label: { show: true, position: 'right', color: '#00e4ff', fontWeight: 700, fontSize: 12, formatter: (v) => zoneTotal(zoneKeys[v.dataIndex]) + '人' },
      data: zoneKeys.map(() => 0), silent: true,
    }]),
  });

  /* ============================================================
   * 3. 重大危险源监控 —— 塔吊
   * ============================================================ */
  const LIMIT = { load: 8.0, wind: 12.0 };
  const cranes = [
    { name: '1#塔吊', load: 3.4, wind: 5.6, angle: 128, dir: 1, loadTarget: 3.4, spikeT: 0, alarm: { load: false, wind: false }, driver: '张建国' },
    { name: '2#塔吊', load: 4.2, wind: 5.2, angle: 265, dir: -1, loadTarget: 4.2, spikeT: 0, alarm: { load: false, wind: false }, driver: '李卫东' },
  ];
  let activeCrane = 0;

  $$('.crane-tabs .tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.crane-tabs .tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCrane = +btn.dataset.crane;
      renderCrane();
    });
  });

  function gaugeOpt(max, zones, unit, decimals, split) {
    return {
      series: [{
        type: 'gauge', startAngle: 205, endAngle: -25,
        min: 0, max, splitNumber: split,
        radius: '94%', center: ['50%', '60%'],
        axisLine: { lineStyle: { width: 11, color: zones } },
        pointer: { length: '56%', width: 4, itemStyle: { color: '#e8f4ff' } },
        anchor: { show: true, size: 9, itemStyle: { color: '#e8f4ff' } },
        axisTick: { distance: -11, length: 5, lineStyle: { color: '#0a1c3a', width: 1 } },
        splitLine: { distance: -11, length: 11, lineStyle: { color: '#0a1c3a', width: 2 } },
        axisLabel: { distance: -34, color: '#7f9cc4', fontSize: 9 },
        detail: {
          valueAnimation: true, offsetCenter: [0, '62%'],
          fontSize: 19, fontWeight: 700, color: '#ffffff',
          formatter: (v) => v.toFixed(decimals) + (unit ? ' ' + unit : ''),
        },
        data: [{ value: 0 }],
      }],
    };
  }
  const gLoad = echarts.init($('#gLoad'));
  const gWind = echarts.init($('#gWind'));
  const gAngle = echarts.init($('#gAngle'));
  gLoad.setOption(gaugeOpt(10, [[LIMIT.load / 10, C.green], [1, C.red]], 't', 1, 5));
  gWind.setOption(gaugeOpt(20, [[LIMIT.wind / 20, C.green], [1, C.red]], 'm/s', 1, 4));
  gAngle.setOption(gaugeOpt(360, [[1, C.blue]], '°', 0, 6));
  renderCrane();

  function renderCrane() {
    const c = cranes[activeCrane];
    gLoad.setOption({ series: [{ data: [{ value: +c.load.toFixed(1) }] }] });
    gWind.setOption({ series: [{ data: [{ value: +c.wind.toFixed(1) }] }] });
    gAngle.setOption({ series: [{ data: [{ value: Math.round(c.angle) }] }] });
    $('#mMoment').textContent = Math.min(118, Math.round(c.load * 12.6 + rand(-2, 2)));
    $('#mRadius').textContent = (18 + 22 * Math.abs(Math.sin(c.angle / 55))).toFixed(1);
    $('#mHeight').textContent = (46 + 2 * Math.sin(c.angle / 90)).toFixed(1);
    $('#mDriver').textContent = c.driver;

    const over = [];
    if (c.load > LIMIT.load) over.push(`吊重 ${c.load.toFixed(1)}t 超限（限值 ${LIMIT.load}t）`);
    if (c.wind > LIMIT.wind) over.push(`风速 ${c.wind.toFixed(1)}m/s 超限（限值 ${LIMIT.wind}m/s）`);
    const st = $('#craneStatus');
    if (over.length) {
      st.classList.add('alarm');
      st.innerHTML = `<i class="dot"></i><span>⚠ 报警：${over.join('；')} —— 已自动拍照取证</span>`;
    } else {
      st.classList.remove('alarm');
      st.innerHTML = '<i class="dot ok"></i><span>运行正常 · 超限自动报警并拍照</span>';
    }
  }

  // 塔吊模拟数据 + 超限报警（2 秒周期）
  let craneTick = 0;
  setInterval(() => {
    craneTick++;
    cranes.forEach((c, idx) => {
      // 吊重：正常 2~6.5t 波动；偶发超限尖峰（演示报警）
      if (craneTick % 6 === 0 && c.spikeT <= 0) c.loadTarget = rand(2, 6.5);
      if (c.spikeT > 0) { c.spikeT--; c.loadTarget = rand(8.2, 8.9); }
      c.load += (c.loadTarget - c.load) * 0.45 + rand(-0.12, 0.12);
      c.load = Math.max(0.5, c.load);
      // 风速：阵风
      c.wind = 5.2 + 2.4 * Math.sin(craneTick / 9 + idx * 2.2) + rand(-0.5, 0.5) + (c.windSpike > 0 ? rand(7.2, 8.4) : 0);
      if (c.windSpike > 0) c.windSpike--;
      c.wind = Math.max(0.8, c.wind);
      // 回转角度：往复回转
      c.angle += c.dir * rand(6, 11);
      if (c.angle >= 352) c.dir = -1;
      if (c.angle <= 8) c.dir = 1;

      // 超限检测（上升沿触发报警 + 拍照）
      checkLimit(c, idx, 'load', c.load, LIMIT.load, '吊重', 't');
      checkLimit(c, idx, 'wind', c.wind, LIMIT.wind, '风速', 'm/s');
      // 地图塔吊图标状态
      document.getElementById('tower' + (idx + 1)).classList.toggle('alarm', c.alarm.load || c.alarm.wind);
    });
    renderCrane();
  }, 2000);

  // 定时注入演示事件：吊重超限 / 大风
  setInterval(() => {
    const c = cranes[Math.floor(Math.random() * 2)];
    if (Math.random() < 0.55) c.spikeT = 5; else c.windSpike = 5;
  }, 45000);
  setTimeout(() => { cranes[0].spikeT = 5; }, 18000); // 首次演示

  function checkLimit(c, idx, key, val, limit, label, unit) {
    if (val > limit && !c.alarm[key]) {
      c.alarm[key] = true;
      const msg = `${c.name} <em>${label} ${val.toFixed(1)}${unit}</em> 超限（限值 ${limit}${unit}），已自动拍照取证`;
      addAlarm({ level: 'red', tag: 'crane', msg, photo: capturePhoto(`${c.name} ${label}超限 ${val.toFixed(1)}${unit}`, idx) });
      flashCranePanel();
    } else if (val <= limit * 0.95 && c.alarm[key]) {
      c.alarm[key] = false;
      addAlarm({ level: 'yellow', tag: 'crane', msg: `${c.name} ${label} 回落至 ${val.toFixed(1)}${unit}，恢复正常` });
    }
  }
  function flashCranePanel() {
    const p = $('#panelCrane');
    p.classList.add('alarming');
    setTimeout(() => p.classList.remove('alarming'), 3600);
  }

  /* -------- 报警抓拍（Canvas 模拟监控画面） -------- */
  function capturePhoto(title, craneIdx) {
    const cv = document.createElement('canvas');
    cv.width = 480; cv.height = 270;
    const x = cv.getContext('2d');
    // 天空
    const sky = x.createLinearGradient(0, 0, 0, 270);
    sky.addColorStop(0, '#24466e'); sky.addColorStop(0.65, '#6f93b8'); sky.addColorStop(1, '#8a97a5');
    x.fillStyle = sky; x.fillRect(0, 0, 480, 270);
    // 远景楼体
    x.fillStyle = '#22364f';
    [[18, 120, 66, 112], [104, 92, 58, 140], [336, 108, 76, 124], [160, 140, 50, 92]].forEach((b) => x.fillRect(...b));
    x.fillStyle = 'rgba(255,240,180,.4)';
    for (let i = 0; i < 26; i++) x.fillRect(24 + (i % 6) * 10 + (i > 12 ? 300 : 0), 130 + (i % 4) * 22, 4, 6);
    // 塔吊
    const mastX = 240 + (craneIdx ? 60 : -30);
    x.strokeStyle = '#f5a623'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(mastX, 232); x.lineTo(mastX, 62); x.stroke();
    x.beginPath(); x.moveTo(mastX - 74, 62); x.lineTo(mastX + 96, 62); x.stroke();
    x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(mastX, 40); x.lineTo(mastX + 96, 62); x.moveTo(mastX, 40); x.lineTo(mastX - 74, 62); x.stroke();
    // 吊钩与吊物
    const hookX = mastX + rand(30, 80);
    x.strokeStyle = '#dfe7ee'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(hookX, 62); x.lineTo(hookX, 152); x.stroke();
    x.fillStyle = '#7c8794'; x.fillRect(hookX - 10, 152, 20, 13);
    // 地面与人员
    x.fillStyle = '#2c2f36'; x.fillRect(0, 232, 480, 38);
    const cols = ['#ff9f43', '#f9ca24', '#54a0ff', '#1dd1a1'];
    for (let i = 0; i < 14; i++) { x.fillStyle = cols[i % 4]; x.fillRect(rand(10, 470), 226 + rand(0, 8), 3, 7); }
    // CCTV 顶部信息条
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 0, 480, 26);
    x.fillStyle = '#ff5252'; x.font = 'bold 13px monospace'; x.textAlign = 'left';
    x.fillText('● REC', 8, 17);
    x.fillStyle = '#fff'; x.font = '12px monospace';
    x.fillText(`CAM-0${craneIdx + 1}`, 72, 17);
    x.textAlign = 'right';
    x.fillText(new Date().toLocaleString('zh-CN', { hour12: false }), 472, 17);
    // 底部报警横幅
    x.fillStyle = 'rgba(198,30,30,.88)'; x.fillRect(0, 242, 480, 28);
    x.fillStyle = '#fff'; x.font = 'bold 14px "Microsoft YaHei",sans-serif'; x.textAlign = 'center';
    x.fillText('⚠ ' + title, 240, 261);
    return cv.toDataURL('image/jpeg', 0.85);
  }

  /* ============================================================
   * 4. 环境监测 + 喷淋联动
   * ============================================================ */
  const ENV_LIMIT = { pm25: 75, noise: 70, pm10: 150 };
  const env = {
    pm25: 56, noise: 63, pm10: 92,
    spray: false, sprayCool: 0,
    dustT: 0, noiseT: 0,
    noiseAlarm: false,
  };
  const hist = { t: [], pm25: [], noise: [], pm10: [] };
  const HIST_N = 40;

  const envChart = echarts.init($('#envChart'));
  envChart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8,24,50,.95)', borderColor: 'rgba(0,190,255,.4)',
      textStyle: { color: '#d7e8ff', fontSize: 12 },
    },
    legend: { top: 0, textStyle: { color: '#7f9cc4', fontSize: 11 }, icon: 'roundRect', itemWidth: 14, itemHeight: 4 },
    grid: { left: 42, right: 40, top: 28, bottom: 22 },
    xAxis: {
      type: 'category', boundaryGap: false, data: hist.t,
      axisLabel: { color: '#7f9cc4', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(0,190,255,.3)' } },
    },
    yAxis: [
      {
        type: 'value', name: 'μg/m³', max: 200,
        nameTextStyle: { color: '#7f9cc4', fontSize: 10 },
        axisLabel: { color: '#7f9cc4', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0,190,255,.08)' } },
      },
      {
        type: 'value', name: 'dB', min: 40, max: 90,
        nameTextStyle: { color: '#7f9cc4', fontSize: 10 },
        axisLabel: { color: '#7f9cc4', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'PM2.5', type: 'line', smooth: true, symbol: 'none', data: hist.pm25,
        lineStyle: { color: '#58c7ff', width: 2 }, areaStyle: { color: 'rgba(88,199,255,.10)' },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: ENV_LIMIT.pm25 }], lineStyle: { color: '#58c7ff', type: 'dashed', opacity: 0.55 }, label: { color: '#58c7ff', fontSize: 10, formatter: '限值75', position: 'insideEndTop' } },
      },
      {
        name: '扬尘PM10', type: 'line', smooth: true, symbol: 'none', data: hist.pm10,
        lineStyle: { color: '#ff9f43', width: 2 }, areaStyle: { color: 'rgba(255,159,67,.10)' },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: ENV_LIMIT.pm10 }], lineStyle: { color: '#ff9f43', type: 'dashed', opacity: 0.55 }, label: { color: '#ff9f43', fontSize: 10, formatter: '限值150', position: 'insideEndTop' } },
      },
      {
        name: '噪声', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: hist.noise,
        lineStyle: { color: '#ffc048', width: 2 },
        markLine: { silent: true, symbol: 'none', yAxisIndex: 1, data: [{ yAxis: ENV_LIMIT.noise }], lineStyle: { color: '#ffc048', type: 'dashed', opacity: 0.55 }, label: { color: '#ffc048', fontSize: 10, formatter: '限值70dB', position: 'insideEndTop' } },
      },
    ],
  });

  function setSpray(on, reason) {
    env.spray = on;
    $$('#sprays .spray').forEach((s) => s.classList.toggle('on', on));
    const el = $('#sprayState');
    el.classList.toggle('on', on);
    el.querySelector('.txt').textContent = on ? `喷淋系统：已开启（${reason}）` : '喷淋系统：关闭';
    $('#kpiSpray').textContent = on ? '开启' : '关闭';
    $('#kpiSpray').classList.toggle('alarm-on', false);
    $('#kpiSprayDot').classList.toggle('on', on);
  }

  function envCard(cardId, valId, val, limit, decimals) {
    const bad = val > limit;
    const card = $(cardId);
    card.classList.toggle('alarm', bad);
    $(valId).textContent = val.toFixed(decimals);
    const st = card.querySelector('.e-status');
    st.className = 'e-status ' + (bad ? 'bad' : 'ok');
    st.textContent = bad ? '超标' : '正常';
  }

  let envTick = 0;
  function envStep(label) {
    envTick++;
    // 偶发扬尘事件（演示超标与联动）
    if (env.dustT > 0) env.dustT--;
    if (env.noiseT > 0) env.noiseT--;

    // 目标值：喷淋开启时扬尘/PM2.5 被压制下降
    let pm25T = env.dustT > 0 ? 92 : 54;
    let pm10T = env.dustT > 0 ? 172 : 90;
    if (env.spray) { pm25T = 40; pm10T = 62; }
    env.pm25 += (pm25T - env.pm25) * 0.22 + rand(-2, 2);
    env.pm10 += (pm10T - env.pm10) * 0.22 + rand(-4, 4);
    env.noise = 62 + 5.5 * Math.sin(envTick / 8) + rand(-1.8, 1.8) + (env.noiseT > 0 ? rand(9, 13) : 0);
    env.pm25 = Math.max(12, env.pm25);
    env.pm10 = Math.max(25, env.pm10);

    // 历史曲线
    hist.t.push(label);
    hist.pm25.push(+env.pm25.toFixed(1));
    hist.noise.push(+env.noise.toFixed(1));
    hist.pm10.push(+env.pm10.toFixed(1));
    if (hist.t.length > HIST_N) { hist.t.shift(); hist.pm25.shift(); hist.noise.shift(); hist.pm10.shift(); }
    envChart.setOption({ xAxis: { data: hist.t }, series: [{ data: hist.pm25 }, { data: hist.pm10 }, { data: hist.noise }] });

    // 卡片
    envCard('#cardPm25', '#vPm25', env.pm25, ENV_LIMIT.pm25, 1);
    envCard('#cardNoise', '#vNoise', env.noise, ENV_LIMIT.noise, 1);
    envCard('#cardPm10', '#vPm10', env.pm10, ENV_LIMIT.pm10, 1);

    // 扬尘/PM2.5 超标 → 自动开启喷淋
    const dustOver = env.pm10 > ENV_LIMIT.pm10 || env.pm25 > ENV_LIMIT.pm25;
    if (dustOver && !env.spray) {
      setSpray(true, '自动联动');
      addAlarm({
        level: 'red', tag: 'env',
        msg: `扬尘超标：PM10 <em>${env.pm10.toFixed(0)}μg/m³</em>、PM2.5 <em>${env.pm25.toFixed(0)}μg/m³</em>，已联动开启喷淋系统`,
      });
    }
    // 回落至限值 90% 以下并稳定 3 个周期 → 自动关闭
    if (env.spray) {
      if (env.pm10 < ENV_LIMIT.pm10 * 0.9 && env.pm25 < ENV_LIMIT.pm25 * 0.9) {
        if (++env.sprayCool >= 3) {
          env.sprayCool = 0;
          setSpray(false);
          addAlarm({ level: 'yellow', tag: 'spray', msg: `扬尘已降至限值以下（PM10 ${env.pm10.toFixed(0)}μg/m³），喷淋系统自动关闭` });
        }
      } else env.sprayCool = 0;
    }
    // 噪声超标 → 仅预警
    if (env.noise > ENV_LIMIT.noise && !env.noiseAlarm) {
      env.noiseAlarm = true;
      addAlarm({ level: 'yellow', tag: 'env', msg: `噪声 <em>${env.noise.toFixed(1)}dB</em> 超过昼间限值 ${ENV_LIMIT.noise}dB，请降低作业噪音` });
    } else if (env.noise < ENV_LIMIT.noise - 3) env.noiseAlarm = false;
  }
  // 预填历史数据，让曲线初始即有形态
  for (let i = HIST_N; i > 0; i--) {
    const d = new Date(Date.now() - i * 2000);
    envStep(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
  }
  setInterval(() => envStep(nowStr()), 2000);

  // 定时注入扬尘 / 噪声事件
  setInterval(() => { if (Math.random() < 0.7) env.dustT = 9; else env.noiseT = 5; }, 40000);
  setTimeout(() => { env.dustT = 9; }, 12000); // 首次演示

  /* ============================================================
   * 5. 报警记录
   * ============================================================ */
  let alarmTotal = 0;
  function addAlarm({ level, tag, msg, photo }) {
    const list = $('#alarmList');
    const empty = list.querySelector('.alarm-empty');
    if (empty) empty.remove();
    const tagCls = { crane: 'tag-crane', env: 'tag-env', spray: 'tag-spray' }[tag];
    const tagName = { crane: '塔吊', env: '环境', spray: '联动' }[tag];
    const item = document.createElement('div');
    item.className = `alarm-item lv-${level}`;
    item.innerHTML = `<span class="t">${nowStr()}</span><span class="tag ${tagCls}">${tagName}</span><div class="msg">${msg}</div>`;
    if (photo) {
      const img = document.createElement('img');
      img.className = 'shot';
      img.src = photo;
      img.alt = '报警抓拍';
      img.addEventListener('click', () => showPhoto(photo));
      item.appendChild(img);
    }
    list.prepend(item);
    while (list.children.length > 40) list.lastChild.remove();
    alarmTotal++;
    $('#alarmCount').textContent = alarmTotal;
    $('#kpiAlarm').textContent = alarmTotal;
  }

  function showPhoto(src) {
    $('#modalImg').src = src;
    $('#photoModal').classList.remove('hidden');
  }
  $('#modalClose').addEventListener('click', () => $('#photoModal').classList.add('hidden'));
  $('.modal-mask').addEventListener('click', () => $('#photoModal').classList.add('hidden'));

  /* ---------------- 在场人数微波动 ---------------- */
  setInterval(() => {
    $('#kpiWorkers').textContent = totalOn + Math.round(rand(-3, 3));
  }, 10000);

  /* ---------------- 窗口缩放时重绘图表 ---------------- */
  window.addEventListener('resize', () => {
    [ganttChart, attendChart, gLoad, gWind, gAngle, envChart].forEach((c) => c.resize());
  });
})();
