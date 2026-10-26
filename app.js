// Мистер Рацио — тестовая версия приложения учеников МП.
// Всё хранится в этом браузере (localStorage). Сервера, почты и ИИ здесь нет: код входа любой,
// собеседник в спарринге отвечает по заготовкам из data.js, разбор считается по ключевым словам.

const KEY = 'ratio_test_v1';
const DAY_LIMIT = 20, MAX_REPLIES = 7;
let S = load();
let tmp = { login: { step: 1, email: '' } };   // состояние экрана, не сохраняется

function fresh() { return { user: null, diag: null, diags: [], history: [], cards: [], spar: null, review: null, day: {}, lessons: {} }; }
function load() { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return fresh(); } }
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function plural(n, f) { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; }
function fmt(d) { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); }
function fmtShort(d) { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' }); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function daysLeft() { return Math.max(0, Math.ceil((DEMO_END - new Date()) / 86400000)); }
function toast(t) { const el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2600); }
function route() { const p = (location.hash || '').replace(/^#\/?/, '').split('/'); return { name: p[0] || 'home', arg: p[1] }; }
function go(r) { if (location.hash === '#/' + r) render(); else location.hash = '#/' + r; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function modal(title, text, btn) {
  const bg = document.createElement('div');
  bg.className = 'modalbg';
  bg.innerHTML = `<div class="modal"><div class="hand">Мистер Рацио</div><h3>${esc(title)}</h3><div class="muted">${esc(text)}</div><button class="btn sm">${esc(btn || 'Понятно')}</button></div>`;
  bg.addEventListener('click', e => { if (e.target === bg || e.target.tagName === 'BUTTON') bg.remove(); });
  document.body.appendChild(bg);
}

// ---------------- подсчёты ----------------
function measures() { return S.history.filter(h => h.measure); }
function pointA() { const m = measures(); return m.length ? m[0] : null; }
function lastScore() { return S.history.length ? S.history[S.history.length - 1].total : null; }
function sparsToday() { return S.day[todayKey()] || 0; }

// ---------------- меню ----------------
function sideHTML(r) {
  const sect = { home: 'home', diag: 'diag', result: 'diag', spar: 'spar', chat: 'spar', review: 'spar', second: 'second', card: 'second', progress: 'progress', install: 'install', lessons: 'lessons', lesson: 'lessons' }[r.name];
  const it = (go, ic, t) => `<button data-go="${go}" class="${sect === go ? 'on' : ''}"><i>${ic}</i>${t}</button>`;
  const lk = (k, t) => `<button data-act="locked" data-k="${k}"><i>🔒</i>${t}</button>`;
  return `
    <div class="me"><img class="face sm" src="img/ratio-face.jpg" alt=""><div><b>${esc(S.user.name)}</b><span>Демо-неделя · до 15 ноября</span></div></div>
    <div class="mlist">
      ${it('home', '⌂', 'Главная')}
      ${it('lessons', '▶', 'Уроки курса')}
      ${it('diag', '🔍', 'Диагностическая карта навыков')}
      ${it('spar', '⚔', 'Спарринг')}
      ${it('second', '✒', 'Секундант: подготовка к встрече')}
      ${it('progress', '📈', 'Мой прогресс')}
    </div>
    <div class="hand" style="font-size:19px;margin:6px 0 2px 6px">Откроется в курсе</div>
    <div class="mlist locked">${lk('who', 'Кто передо мной: тип собеседника')}${lk('dirty', 'Детектор грязных приёмов')}${lk('belts', 'Пояса переговорщика')}</div>
    <div class="mlist small">
      <button data-act="gk"><i>📚</i>Уроки курса на ГетКурсе</button>
      ${it('install', '📱', 'Поставить иконку на телефон')}
      <button data-act="curator"><i>✉</i>Написать куратору</button>
      <button data-act="reset"><i>↺</i>Сбросить тестовые данные</button>
      <button data-act="logout"><i>↩</i>Выйти</button>
    </div>`;
}

function shell(v, r) {
  const tab = (go, ic, t, on) => `<button data-go="${go}" class="${on ? 'on' : ''}"><span class="ic">${ic}</span>${t}</button>`;
  const sect = r.name;
  return `<div class="shell" id="shell">
    <aside class="side">${sideHTML(r)}</aside>
    <div class="shade" data-act="closeMenu"></div>
    <div class="main">
      <div class="topbar">
        <button class="burger" data-act="menu" aria-label="Меню">☰</button>
        ${v.back ? `<button class="back" data-go="${v.back}">← Назад</button>` : ''}
        <div class="ttl">${v.title}</div>
        <span class="testflag">тестовая версия</span>
      </div>
      ${v.full ? v.html : `<div class="view">${v.html}</div>`}
    </div>
    <nav class="tabs">
      ${tab('home', '⌂', 'Главная', sect === 'home')}
      ${tab('spar', '⚔', 'Спарринг', ['spar', 'chat', 'review'].includes(sect))}
      ${tab('progress', '📈', 'Прогресс', sect === 'progress')}
    </nav>
  </div>`;
}

// ---------------- вход ----------------
function loginView() {
  const L = tmp.login;
  let box;
  if (L.step === 1) box = `
    <div class="hand">Тренируйтесь до разговора</div>
    <label class="lbl">Почта, на которую оплачен курс или демо-неделя</label>
    <input class="field" id="email" type="email" placeholder="anna@mail.ru" value="${esc(L.email)}" autocomplete="email">
    <button class="btn" data-act="getCode">Получить код</button>
    <div class="note" style="text-align:center">Пароль не нужен: пришлём код из 6 цифр.</div>`;
  else if (L.step === 2) box = `
    <div class="muted" style="text-align:center">Код отправлен на <b>${esc(L.email)}</b></div>
    <input class="field codeinp" id="code" inputmode="numeric" maxlength="6" placeholder="······" autocomplete="one-time-code">
    <button class="btn" data-act="checkCode">Войти</button>
    <div class="testnote">Тестовая версия: письмо не отправляется. Подойдёт любой код из 6 цифр, например 123456.</div>
    <div class="note" style="text-align:center">Не пришёл? <a href="#" data-act="curator">Написать куратору</a> · <a href="#" data-act="changeEmail">Изменить почту</a></div>`;
  else box = `
    <div class="hand">Последний штрих</div>
    <label class="lbl">Как к вам обращаться?</label>
    <input class="field" id="uname" placeholder="Анна" maxlength="30">
    <button class="btn" data-act="setName">Готово</button>`;
  return `<div class="loginwrap"><div class="login">
    <div>
      <div class="intro">
        <img class="ratio" src="img/ratio-kniga.jpg" alt="Мистер Рацио">
        <div>
          <div class="hand">Знакомьтесь</div>
          <h1>Мистер <u>Рацио</u></h1>
          <div class="bubble">Я ваш тренер по переговорам. Сыграю трудного собеседника — начальника, клиента, партнёра, — а потом по методике Игоря Рызова разберу, где вы были сильны и что стоило сказать иначе.</div>
        </div>
      </div>
      <div class="can">
        <div><span>⚔</span><p><b>Спарринг</b> с трудным собеседником: Танк, Подросток, Робкий, Лидер</p></div>
        <div><span>🔍</span><p><b>Разбор</b> после каждого раунда: баллы и фраза, которую стоило сказать</p></div>
        <div><span>✒</span><p><b>Подготовка</b> к вашей настоящей встрече за 10 минут</p></div>
      </div>
    </div>
    <div class="card loginbox">${box}</div>
  </div></div>`;
}

// ---------------- главная ----------------
function homeView() {
  const n = esc(S.user.name), dl = daysLeft(), A = pointA(), last = lastScore();
  let say;
  if (!S.diag) say = `${n}, начнём с диагностики: 15 вопросов, около 5 минут. Узнаете, в какую модель вы проваливаетесь под давлением и какие навыки подтянуть.`;
  else if (!S.history.length) say = `${n}, под давлением вы — ${MODELS[S.diag.model].name}. Теперь первый спарринг. Начните с замера: это ваша точка А.`;
  else {
    const h = S.history[S.history.length - 1];
    say = `${n}, последний раз — ${TYPES[h.type].name}, ${h.total} из 100. ${h.type === 'tank' ? 'Сегодня попробуем Подростка?' : 'Попробуем Танка?'}`;
  }
  const delta = A && last != null && S.history.length > 1 ? last - A.total : null;
  return {
    title: 'Мистер Рацио', html: `
    <div class="banner"><span>Демо-доступ до 15 ноября, 23:59</span><span class="pill wine">${dl} ${plural(dl, ['день', 'дня', 'дней'])}</span></div>
    <div class="hello"><img class="face" src="img/ratio-face.jpg" alt=""><div class="bubble">${say}</div></div>
    <div class="card level">
      <div><div class="hand">Ваш уровень</div><div class="big">${last == null ? '—' : last}<small> / 100</small></div></div>
      <div class="muted">${A ? `Точка А ${fmt(A.d)}: <b>${A.total}</b>` : 'Точку А покажет первый замер'}${delta != null ? `<br><span style="color:${delta >= 0 ? 'var(--ok)' : 'var(--wine)'};font-weight:700">${delta >= 0 ? '+' : ''}${delta} от точки А</span>` : ''}</div>
    </div>
    ${S.diag ? `<button class="btn" data-go="spar">Начать спарринг</button>` : `<button class="btn" data-go="diag">Пройти диагностику</button>`}
    <div class="tiles">
      <button class="tile" data-go="${S.diag ? 'result' : 'diag'}"><span class="ic">🔍</span><span class="nm">Диагностическая карта ваших навыков</span>${S.diag ? '<span class="pill ok">пройдено</span>' : '<span class="note">≈ 5 минут</span>'}</button>
      <button class="tile" data-go="lessons"><span class="ic">▶️</span><span class="nm">Уроки курса</span><span class="note">${Object.keys(S.lessons || {}).length} из ${LESSONS.length} пройдено</span></button>
      <button class="tile" data-go="progress"><span class="ic">📈</span><span class="nm">Мой прогресс</span><span class="note">${S.history.length} ${plural(S.history.length, ['спарринг', 'спарринга', 'спаррингов'])}</span></button>
      <button class="tile" data-go="second"><span class="ic">✒️</span><span class="nm">Секундант: подготовка к встрече</span><span class="note">${S.cards.length ? S.cards.length + ' ' + plural(S.cards.length, ['план', 'плана', 'планов']) : '10 минут'}</span></button>
      <button class="tile locked" data-act="locked" data-k="who"><span class="nm">Кто передо мной</span><span class="hand">откроется в курсе</span></button>
      <button class="tile locked" data-act="locked" data-k="dirty"><span class="nm">Детектор грязных приёмов</span><span class="hand">откроется в курсе</span></button>
      <button class="tile locked" data-act="locked" data-k="belts"><span class="nm">Пояса переговорщика</span><span class="hand">откроется в курсе</span></button>
    </div>`
  };
}

// ---------------- диагностика ----------------
function diagView() {
  const D = tmp.dq;
  const total = QUESTIONS.length + 1;
  if (!D) return {
    title: 'Карта ваших навыков', back: 'home', html: `
    <div style="display:flex;gap:18px;align-items:center">
      <img class="deco" src="img/ratio-lupa.jpg" style="width:120px;flex:none" alt="">
      <div><div class="hand">Диагностическая карта</div><h2>Какой вы переговорщик <u>под давлением</u></h2></div>
    </div>
    <div class="muted">${QUESTIONS.length} коротких ситуаций и один открытый вопрос. Выбирайте не «как правильно», а как вы обычно поступаете на самом деле. В конце — ваша модель поведения, профиль по 5 навыкам и что тренировать на этой неделе.</div>
    <div class="card"><h3 style="margin-bottom:8px">5 навыков</h3><div class="muted">${Object.values(SKILLS).map(s => '• ' + s.name).join('<br>')}</div></div>
    ${S.diag ? `<div class="note">Вы уже проходили диагностику ${fmt(S.diag.date)}. Новый результат сохранится рядом со старым — так видно рост.</div>` : ''}
    <button class="btn" data-act="diagStart">${S.diag ? 'Пройти заново' : 'Начать'}</button>`
  };
  if (D.i < QUESTIONS.length) {
    const q = QUESTIONS[D.i], ord = D.order[D.i], sel = D.answers[D.i];
    return {
      title: 'Карта ваших навыков', back: 'home', html: `
      <div class="qhead"><span class="hand">Вопрос ${D.i + 1} из ${total}</span><span class="note">≈ ${Math.max(1, Math.round((total - D.i) * 0.3))} мин</span></div>
      <div class="bar w"><i style="width:${Math.round(D.i / total * 100)}%"></i></div>
      <div class="sit">${esc(q.q)}</div>
      <div class="opts">${ord.map(j => `<button class="opt ${sel === j ? 'sel' : ''}" data-act="diagPick" data-j="${j}">${esc(q.a[j][0])}</button>`).join('')}</div>
      <div class="row" style="margin-top:6px">
        ${D.i > 0 ? '<button class="btn ghost sm" data-act="diagPrev">Назад</button>' : ''}
        <button class="btn sm" data-act="diagNext" ${sel == null ? 'disabled' : ''}>Дальше</button>
      </div>`
    };
  }
  return {
    title: 'Карта ваших навыков', back: 'home', html: `
    <div class="qhead"><span class="hand">Вопрос ${total} из ${total} · необязательный</span></div>
    <div class="bar w"><i style="width:96%"></i></div>
    <div class="sit">${esc(MONSTER_Q)}</div>
    <textarea class="field" id="monster" maxlength="1000" rows="6" placeholder="Например: руководитель отдела продаж требует, чтобы я давал скидку любому клиенту, который попросит. Я хочу держать цену и не терять маржу.">${esc(D.monster || '')}</textarea>
    <div class="note">⚠ Не пишите имён и названий компаний. Эту ситуацию можно будет сразу разыграть в спарринге.</div>
    <div class="row">
      <button class="btn ghost sm" data-act="diagPrev">Назад</button>
      <button class="btn sm" data-act="diagFinish">Показать результат</button>
    </div>`
  };
}

function diagCompute() {
  const D = tmp.dq, counts = { P: 0, R: 0, T: 0, L: 0 }, sum = {}, n = {};
  QUESTIONS.forEach((q, i) => {
    const m = q.a[D.answers[i]][1];
    counts[m]++;
    sum[q.s] = (sum[q.s] || 0) + SKILL_PTS[q.s][m];
    n[q.s] = (n[q.s] || 0) + 1;
  });
  const max = Math.max(...Object.values(counts));
  const model = TIE_ORDER.find(k => counts[k] === max);
  const skills = {};
  Object.keys(SKILLS).forEach(k => skills[k] = Math.round(sum[k] / (3 * n[k]) * 10));
  return { done: true, date: new Date().toISOString(), model, counts, skills, monster: (D.monster || '').trim() };
}

function weakest(skills) { return Object.keys(skills).filter(k => skills[k] < 8).sort((a, b) => skills[a] - skills[b]).slice(0, 2); }

function resultView() {
  if (!S.diag) { return diagView(); }
  const R = S.diag, M = MODELS[R.model], weak = weakest(R.skills);
  const prev = S.diags.length > 1 ? S.diags[S.diags.length - 2] : null;
  return {
    title: 'Карта ваших навыков', back: 'home', html: `
    <div style="display:flex;justify-content:space-between;gap:14px">
      <div><div class="hand">Разгадка</div><h2>Под давлением вы — <u style="color:var(--wine)">${M.name}</u></h2></div>
      <img class="deco" src="img/lavanda.jpg" style="width:90px;flex:none" alt="">
    </div>
    <div class="muted">${esc(M.text)}</div>
    <div class="card"><span class="hand w" style="font-size:20px">Подсказка Игоря</span><div class="muted" style="margin-top:4px">${esc(M.tip)}</div></div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <h3>5 навыков</h3>
      ${Object.keys(SKILLS).map(k => `<div class="skill"><span>${SKILLS[k].name}</span><span class="v">${R.skills[k]}/10${prev ? ` <span style="color:${R.skills[k] >= prev.skills[k] ? 'var(--ok)' : 'var(--wine)'}">${R.skills[k] - prev.skills[k] >= 0 ? '+' : ''}${R.skills[k] - prev.skills[k]}</span>` : ''}</span><div class="bar ${weak.includes(k) ? 'w' : ''}"><i style="width:${R.skills[k] * 10}%"></i></div></div>`).join('')}
    </div>
    <h3 style="margin-top:4px">Что тренировать на этой неделе</h3>
    ${weak.length ? '' : '<div class="card rec"><h3>Явных слабых мест нет</h3><div class="muted" style="margin-top:4px">Проверьте себя в деле: спарринг с Танком покажет, как вы держитесь, когда давят по-настоящему.</div></div>'}
    <div class="grid2">
      ${weak.map(k => {
        const s = SKILLS[k];
        return `<div class="card rec" style="display:flex;flex-direction:column;gap:8px"><h3>${s.name}</h3><div class="muted">${s.week}</div><span class="pill lav" style="align-self:flex-start">Есть в курсе: ${s.course}</span>
        <button class="btn ghost sm" style="margin-top:auto" data-act="recGo" data-k="${k}">${s.go === 'second' ? 'Открыть секунданта' : 'Потренировать'}</button></div>`;
      }).join('')}
    </div>
    ${R.monster ? `<div class="card"><span class="hand">Ваш «монстр»</span><div class="muted" style="margin:6px 0 10px">${esc(R.monster)}</div><button class="btn ghost sm" data-act="sparMonster">Разыграть эту ситуацию</button></div>` : ''}
    <div class="row"><button class="btn" data-go="spar">Начать первый спарринг</button></div>
    <div class="note" style="text-align:center">Повторная диагностика — 14 ноября. <a href="#" data-act="diagRedo">Пройти заново сейчас</a></div>`
  };
}

// ---------------- выбор спарринга ----------------
function sparView() {
  const C = tmp.choice || (tmp.choice = { type: 'tank', sit: 'boss', own: '' });
  const A = pointA(), left = DAY_LIMIT - sparsToday();
  return {
    title: 'Спарринг', back: 'home', html: `
    <div class="card measure">
      <img class="deco" src="img/sledy.jpg" style="width:70px;flex:none;opacity:.8" alt="">
      <div style="flex:1">
        <div class="hand">Замер «было → стало»</div>
        <div class="muted">${A ? `Точка А — <b>${A.total}</b> из 100 (${fmt(A.d)}). Повторный замер откроется 14 ноября, в тестовой версии доступен сразу.` : 'Один кейс для всех: начальник-Танк отказывает в повышении. Пройдите его первым — это ваша точка А. Через неделю повторите и увидите рост.'}</div>
      </div>
      <button class="btn auto" data-act="sparMeasure">${A ? 'Повторный замер' : 'Пройти замер'}</button>
    </div>
    <div><div class="hand">Новое дело</div><h2>С кем <u>тренируемся?</u></h2></div>
    <div class="types">${Object.entries(TYPES).map(([k, t]) => t.open
      ? `<button class="type ${C.type === k ? 'sel' : ''}" data-act="pickType" data-k="${k}"><div class="nm">${t.name}</div><div class="d">${t.d}</div></button>`
      : `<button class="type locked" data-act="locked" data-k="${k}"><div class="nm">🔒 ${t.name}</div><div class="hand" style="font-size:17px">в курсе</div></button>`).join('')}</div>
    <h3>Ситуация</h3>
    <div class="sitl">${Object.entries(SITS).map(([k, s]) => `<button class="${C.sit === k ? 'sel' : ''}" data-act="pickSit" data-k="${k}">${k === 'own' ? '✍️ ' : ''}${s.name}</button>`).join('')}</div>
    ${C.sit === 'own' ? `<textarea class="field" id="own" maxlength="1000" placeholder="Кто оппонент, чего он хочет, чего хотите вы. Без имён и названий компаний.">${esc(C.own)}</textarea>` : ''}
    <div class="note" style="text-align:center">Сегодня осталось ${left} ${plural(left, ['спарринг', 'спарринга', 'спаррингов'])} из ${DAY_LIMIT}</div>
    <button class="btn" data-act="sparStart" ${left <= 0 ? 'disabled' : ''}>Начать</button>`
  };
}

function linesFor(type, sit) {
  if (type === 'podr') return Object.assign({}, LINES.podr._common, LINES.podr[sit]);
  return LINES.tank[sit];
}

function startSpar(type, sit, own, measure) {
  if (sparsToday() >= DAY_LIMIT) { toast('На сегодня спарринги закончились. Завтра будет снова 20.'); return; }
  const L = linesFor(type, sit);
  const msgs = [{ w: 'sys', t: measure ? 'Замер. Держитесь спокойно ✒' : 'Начинаем. Держитесь спокойно ✒' }];
  if (sit === 'own' && own) msgs.push({ w: 'note', t: 'Ваша ситуация: ' + own });
  msgs.push({ w: 'them', t: L.open });
  S.spar = { type, sit, own, measure: !!measure, msgs, p: 0, streak: 0, used: {}, st: { weak: 0, rude: 0, q: 0, tech: [], replies: [] }, done: false };
  S.day[todayKey()] = sparsToday() + 1;
  save();
  go('chat');
}

// ---------------- чат ----------------
function chatView() {
  const P = S.spar;
  if (!P) return sparView();
  const T = TYPES[P.type], Si = SITS[P.sit], n = P.st.replies.length;
  return {
    title: 'Спарринг', back: 'spar', full: true, html: `
    <div class="chat">
      <div class="chathead">
        <div class="ava">${T.letter}</div>
        <div class="who"><b>${Si.who} · ${T.name}</b><span>${P.measure ? 'Замер · ' : ''}${Si.sub}</span></div>
        <div class="cnt">реплика ${Math.min(n + (P.done ? 0 : 1), MAX_REPLIES)} из ${MAX_REPLIES}</div>
      </div>
      <div class="msgs" id="msgs">
        <div class="testnote" style="align-self:center;max-width:520px;text-align:center">Тестовая версия: собеседник отвечает по заготовкам, а не ИИ. Живой ИИ подключим после ключа OpenAI.</div>
        ${P.msgs.map(m => m.w === 'sys' ? `<div class="sys">${esc(m.t)}</div>` : m.w === 'note' ? `<div class="note" style="align-self:center;max-width:520px;text-align:center">${esc(m.t)}</div>` : `<div class="m ${m.w}">${esc(m.t)}</div>`).join('')}
        ${P.typing ? '<div class="m them typing">печатает…</div>' : ''}
      </div>
      <div class="composer">
        ${P.done ? '<button class="btn" data-act="toReview">Смотреть разбор</button>' : `
        <div class="inp"><textarea class="field" id="say" rows="1" placeholder="Ваш ответ…" ${P.typing ? 'disabled' : ''}></textarea><button class="send" data-act="send" ${P.typing ? 'disabled' : ''} aria-label="Отправить">➤</button></div>
        <button class="stop" data-act="stopSpar">Стоп и разбор</button>`}
      </div>
    </div>`
  };
}

function classify(text) {
  const low = text.toLowerCase().replace(/ё/g, 'е');
  const has = k => low.includes(k.replace(/ё/g, 'е'));
  const tech = Object.keys(TECH).filter(name => TECH[name].some(has));
  const weak = WEAK.some(has);
  const letters = text.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
  const caps = letters.length > 6 && letters.replace(/[^A-ZА-ЯЁ]/g, '').length / letters.length > 0.6;
  const rude = RUDE.some(has) || caps || /!{2,}/.test(text);
  const q = text.includes('?');
  let cls = 'neutral';
  if (rude) cls = 'rude'; else if (tech.length) cls = 'strong'; else if (weak) cls = 'weak'; else if (q) cls = 'strong';
  return { cls, tech, weak, rude, q };
}

function sendReply() {
  const P = S.spar, ta = document.getElementById('say');
  if (!P || P.done || P.typing || !ta) return;
  const text = ta.value.trim();
  if (!text) return;
  const c = classify(text);
  P.msgs.push({ w: 'me', t: text });
  P.st.replies.push({ t: text, cls: c.cls, tech: c.tech, q: c.q });
  if (c.weak) P.st.weak++;
  if (c.rude) P.st.rude++;
  if (c.q) P.st.q++;
  c.tech.forEach(t => { if (!P.st.tech.includes(t)) P.st.tech.push(t); });

  let pool;
  if (c.cls === 'rude') { P.streak = 0; P.p = 0; pool = 'rude'; }
  else if (c.cls === 'weak') { P.streak = 0; P.p = Math.max(0, P.p - 1); pool = 'weak'; }
  else if (c.cls === 'strong') { P.streak++; if (P.streak >= 2) P.p = Math.min(3, P.p + 1); pool = P.p ? 'p' + P.p : 'p0'; }
  else { P.streak = 0; pool = P.p ? 'p' + P.p : 'p0'; }

  const L = linesFor(P.type, P.sit);
  const last = P.st.replies.length >= MAX_REPLIES;
  let answer;
  if (last) answer = P.p >= 3 ? pick(L, 'p3', P) : L.final;
  else answer = pick(L, pool, P);

  P.typing = true; save(); render();
  setTimeout(() => {
    P.typing = false;
    P.msgs.push({ w: 'them', t: answer });
    if (last) { P.msgs.push({ w: 'sys', t: 'Сцена окончена. Мистер Рацио готовит разбор' }); P.done = true; finishSpar(); }
    save(); render();
  }, 650 + Math.random() * 600);
}

function pick(L, pool, P) {
  const arr = L[pool] || L.p0, i = P.used[pool] || 0;
  P.used[pool] = i + 1;
  return arr[i % arr.length];
}

function finishSpar() {
  const P = S.spar, st = P.st, n = st.replies.length;
  P.done = true;
  if (n < 2) { S.review = { few: true, type: P.type, sit: P.sit, own: P.own, measure: P.measure }; save(); return; }
  const k = [
    Math.max(0, 4 - st.weak),
    Math.max(0, 4 - st.rude * 2),
    Math.min(4, Math.round(st.q / n * 6)),
    Math.min(4, Math.round(st.tech.length * 1.5)),
    [0, 1, 3, 4][P.p]
  ];
  const total = k.reduce((a, b) => a + b, 0) * 5;
  const strong = st.replies.filter(r => r.cls === 'strong').sort((a, b) => b.tech.length - a.tech.length || (b.q - a.q));
  const lost = st.replies.find(r => r.cls === 'weak' || r.cls === 'rude');
  const minI = k.indexOf(Math.min(...k));
  const prevSame = S.history.filter(h => h.type === P.type).slice(-1)[0];
  const lvl = LEVELS[P.type].filter(l => total >= l[0]).pop()[1];
  S.review = {
    type: P.type, sit: P.sit, own: P.own, measure: P.measure, total, k, lvl, tech: st.tech[0] || '',
    best: strong[0] ? { t: strong[0].t, why: strong[0].tech.length ? `Вы применили приём «${strong[0].tech[0]}»${strong[0].tech[1] ? ' и «' + strong[0].tech[1] + '»' : ''}. Собеседник потерял опору для давления.` : 'Вы ответили вопросом и не стали оправдываться: разговор повели вы.' } : null,
    lost: lost ? { t: lost.t, why: lost.cls === 'rude' ? 'Здесь вы ответили резко, и разговор ушёл в борьбу: собеседник усилил давление.' : `Здесь вы оправдались или уступили. ${TYPES[P.type].name} почувствовал слабость и надавил сильнее.` } : null,
    train: TRAIN_NEXT[minI],
    prev: prevSame ? prevSame.total : null,
    measureLabel: P.measure ? (pointA() ? 'Повторный замер · точка Б' : 'Замер · точка А') : ''
  };
  S.history.push({ d: new Date().toISOString(), type: P.type, sit: P.sit, total, measure: P.measure });
  save();
}

// ---------------- разбор ----------------
function reviewView() {
  const R = S.review;
  if (!R) return sparView();
  if (R.few) return {
    title: 'Разбор', back: 'spar', html: `
    <div class="verdict"><img src="img/ratio-lupa.jpg" alt=""><div class="card score"><div class="hand">Разгадка</div><h3 style="margin-top:6px">Для оценки мало реплик</h3><div class="muted">Сделайте хотя бы 3–4 ответа, тогда разбор покажет, где вы были сильны.</div></div></div>
    <div class="row"><button class="btn sm" data-act="again">Ещё раз</button><button class="btn ghost sm" data-go="spar">Другой тип</button></div>`
  };
  const good = R.total >= 70;
  return {
    title: 'Разбор', back: 'spar', html: `
    <div class="verdict">
      <img src="img/ratio-lupa.jpg" alt="">
      <div class="card score">
        <div class="hand">Разгадка</div>
        <div class="big">${R.total}<small> / 100</small></div>
        <div style="font-weight:800;color:${good ? 'var(--ok)' : 'var(--wine)'};font-size:15px">${R.lvl}</div>
        <div class="note">${R.measureLabel ? `<span class="pill wine" style="margin:4px 6px 0 0">${R.measureLabel}</span>` : ''}${R.prev != null ? `Прошлый раз с ${R.type === 'tank' ? 'Танком' : 'Подростком'}: ${R.prev}` : 'Первый спарринг с этим типом'}</div>
      </div>
    </div>
    <div class="card crit">
      ${CRITERIA.map((c, i) => `<span>${i === 3 && R.tech ? c + ': «' + esc(R.tech) + '»' : c}</span><span class="v">${R.k[i] * 5}</span><div class="bar ${R.k[i] < 2 ? 'w' : ''}"><i style="width:${R.k[i] * 25}%"></i></div>`).join('')}
    </div>
    ${R.best ? `<div class="quote good"><span class="hand" style="color:var(--ok)">Сильный ход</span>«${esc(R.best.t)}» — ${esc(R.best.why)}</div>` : ''}
    ${R.lost ? `<div class="quote bad"><span class="hand w">Где потеряли контроль</span>«${esc(R.lost.t)}» — ${esc(R.lost.why)}</div>` : ''}
    <div class="card"><span class="hand">Как сказать сильнее</span>
      <div class="variants" style="margin-top:8px">
        <div><b>Мягко</b><span>«${esc(STRONGER[R.sit][0])}»</span></div>
        <div><b>Нейтрально</b><span>«${esc(STRONGER[R.sit][1])}»</span></div>
        <div><b>Жёстко</b><span>«${esc(STRONGER[R.sit][2])}»</span></div>
      </div>
    </div>
    <div class="card rec"><h3>Что потренировать в следующий раз</h3><div class="muted" style="margin-top:4px">${esc(R.train)}</div></div>
    <div class="testnote">Тестовая версия: оценка считается по ключевым словам в ваших ответах. В рабочей версии разбор пишет ИИ по методике Игоря и пяти критериям.</div>
    <div class="row"><button class="btn sm" data-act="again">Ещё раз</button><button class="btn ghost sm" data-go="spar">Другой тип</button><button class="btn ghost sm" data-go="progress">Мой прогресс</button></div>`
  };
}

// ---------------- прогресс ----------------
function progressView() {
  const H = S.history, A = pointA(), ms = measures(), B = ms.length > 1 ? ms[ms.length - 1] : null;
  const now = B || (H.length ? H[H.length - 1] : null);
  const pts = H.slice(-12);
  let chart = '<div class="note">Пока нет спаррингов. Начните с замера — это точка А.</div>';
  if (pts.length) {
    const W = 600, x0 = 34, x1 = W - 14, y = v => 110 - v;
    const xs = pts.map((_, i) => pts.length === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (pts.length - 1));
    chart = `<svg viewBox="0 0 ${W} 132" width="100%" height="150" aria-label="График баллов">
      <line x1="${x0}" y1="10" x2="${x0}" y2="110" stroke="#e3d9c7"/><line x1="${x0}" y1="110" x2="${x1}" y2="110" stroke="#e3d9c7"/>
      <line x1="${x0}" y1="60" x2="${x1}" y2="60" stroke="#e3d9c7" stroke-dasharray="3 3"/>
      <text x="4" y="14" font-size="10" fill="#7a7480">100</text><text x="12" y="64" font-size="10" fill="#7a7480">50</text><text x="20" y="113" font-size="10" fill="#7a7480">0</text>
      ${pts.length > 1 ? `<polyline fill="none" stroke="#8f80b9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${pts.map((p, i) => xs[i] + ',' + y(p.total)).join(' ')}"/>` : ''}
      ${pts.map((p, i) => `<circle cx="${xs[i]}" cy="${y(p.total)}" r="${p.measure ? 5 : 3.8}" fill="${p.measure ? '#7d1f37' : '#1d1b22'}"><title>${p.total}</title></circle>`).join('')}
      <text x="${x0}" y="127" font-size="10" fill="#7a7480">${fmtShort(pts[0].d)}</text>
      <text x="${x1 - 30}" y="127" font-size="10" fill="#7a7480">${fmtShort(pts[pts.length - 1].d)}</text>
    </svg>`;
  }
  return {
    title: 'Мой прогресс', back: 'home', html: `
    <div class="hand">Ваш путь</div>
    <div class="card ba">
      <div><div class="n" style="color:var(--muted)">${A ? A.total : '—'}</div><div class="l">было<br>${A ? fmt(A.d) : 'точка А'}</div></div>
      <div class="arr">⟶</div>
      <div><div class="n" style="color:var(--wine)">${now && (B || H.length > 1) ? now.total : '—'}</div><div class="l">${B ? 'стало, замер' : 'сейчас'}<br>${now && (B || H.length > 1) ? fmt(now.d) : 'после спаррингов'}</div></div>
    </div>
    <div class="card"><h3 style="margin-bottom:6px">Баллы по спаррингам</h3>${chart}<div class="note">Бордовые точки — замеры.</div></div>
    ${H.length ? `<div class="card hist"><h3 style="margin-bottom:4px">История</h3>${H.slice().reverse().map(h => `<div><span style="font-weight:500">${h.measure ? '<b>Замер</b> · ' : ''}${TYPES[h.type].name} · ${SITS[h.sit].name.toLowerCase()}</span><span><em>${fmtShort(h.d)}</em>${h.total}</span></div>`).join('')}</div>` : ''}
    <div class="card">
      <h3>Диагностическая карта навыков</h3>
      ${S.diag ? `<div class="muted" style="margin:4px 0 10px">${fmt(S.diag.date)}: под давлением — <b>${MODELS[S.diag.model].name}</b>. ${weakest(S.diag.skills).length ? 'Слабые навыки: ' + weakest(S.diag.skills).map(k => SKILLS[k].name.toLowerCase()).join(', ') + '.' : 'Явных слабых навыков нет.'}</div><button class="btn ghost sm" data-go="result">Открыть карту</button>` : `<div class="muted" style="margin:4px 0 10px">Ещё не пройдена.</div><button class="btn ghost sm" data-go="diag">Пройти</button>`}
    </div>
    ${S.cards.length ? `<div class="card hist"><h3 style="margin-bottom:4px">Планы встреч</h3>${S.cards.map((c, i) => `<div><a href="#/card/${i}">${esc(c.who || 'Встреча')}</a><span><em>${fmtShort(c.d)}</em></span></div>`).join('')}</div>` : ''}`
  };
}

// ---------------- секундант: алгоритм подготовки Игоря ----------------
function secList() {
  return S.cards.length ? `<div class="card hist"><h3 style="margin-bottom:4px">Мои планы</h3>${S.cards.map((c, i) => `<div><a href="#/card/${i}">${esc(c.who || 'Встреча')}</a><span><em>${fmtShort(c.d)}</em></span></div>`).join('')}</div>` : '';
}
function secField(k, label, ph, v, rows) {
  return `<div>${label ? `<label class="lbl">${label}</label>` : ''}<textarea class="field" data-f="${k}" rows="${rows || 2}" placeholder="${esc(ph)}">${esc(v[k] || '')}</textarea></div>`;
}

function secondView() {
  const Q = tmp.sec;
  if (!Q) return {
    title: 'Секундант', back: 'home', html: `
    <div style="display:flex;gap:16px;align-items:center;justify-content:space-between">
      <div><div class="hand">Секундант</div><h2>Подготовка к <u>настоящей встрече</u></h2></div>
      <img class="deco" src="img/kompas.jpg" style="width:96px;flex:none" alt="">
    </div>
    <div class="muted">Алгоритм подготовки к переговорам Игоря Рызова. Шесть шагов: чья позиция сильнее на самом деле, что на самом деле хотите вы и чего хочет оппонент, план Б и дедлайн — ваши и его. На выходе — страница блокнота, с которой можно идти на встречу, и фразы на случай давления под тип собеседника.</div>
    <div class="card"><h3 style="margin-bottom:8px">Шаги алгоритма</h3><div class="muted">${SECOND_STEPS.map((s, i) => (i + 1) + '. ' + s.t).join('<br>')}</div></div>
    <button class="btn" data-act="secStart">Подготовиться к встрече</button>
    ${secList()}`
  };
  const st = SECOND_STEPS[Q.i], v = Q.v;
  let body = '';
  if (st.note) body += `<div class="testnote" style="color:var(--soft);border-color:var(--lav)">${esc(st.note)}</div>`;
  if (st.fields) body += st.fields.map(([k, l, ph]) => secField(k, l, ph, v, st.fields.length === 1 ? 3 : 2)).join('');
  if (st.pair) body += `<div class="grid2">${st.pair.map(([head, fs], j) => `<div class="card" style="display:flex;flex-direction:column;gap:10px;border-top:3px solid ${j ? 'var(--wine)' : 'var(--ink)'}"><h3 style="color:${j ? 'var(--wine)' : 'var(--ink)'}">${head}</h3>${fs.map(([k, l, ph]) => secField(k, l, ph, v, 2)).join('')}</div>`).join('')}</div>`;
  if (st.extra === 'type') body += `<label class="lbl" style="margin-top:6px">Какого он типа под давлением?</label><div class="row">${Object.keys(PHRASES).map(t => `<button class="btn sm ${v.type === t ? '' : 'ghost'}" style="flex:none;width:auto;padding:9px 14px" data-act="secType" data-t="${t}">${t}</button>`).join('')}</div>`;
  return {
    title: 'Секундант', back: 'second', html: `
    <div class="steps">${SECOND_STEPS.map((_, i) => `<i class="${i <= Q.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="hand">Шаг ${Q.i + 1} из ${SECOND_STEPS.length}</div>
    <h2>${st.t}</h2>
    ${body}
    <div class="row" style="margin-top:6px">${Q.i ? '<button class="btn ghost sm" data-act="secPrev">Назад</button>' : ''}<button class="btn sm" data-act="secNext">${Q.i === SECOND_STEPS.length - 1 ? 'Собрать план' : 'Дальше'}</button></div>`
  };
}

function cardView(i) {
  const c = S.cards[i];
  if (!c) return secondView();
  const ph = PHRASES[c.type || 'Не знаю'];
  const row = (l, t) => `<b>${l}</b><span>${t ? esc(t) : '<span style="color:var(--muted)">—</span>'}</span>`;
  const none = t => !t || !String(t).trim() || NONE_RE.test(t);
  const early = none(c.cons_us) || none(c.cons_them);
  const col = (head, red, rows) => `<div><div class="hand ${red ? 'w' : ''}" style="font-size:20px;margin-bottom:6px">${head}</div><div class="pos">${rows}</div></div>`;
  return {
    title: 'Секундант', back: 'second', html: `
    <div style="display:flex;gap:16px;align-items:center;justify-content:space-between">
      <div><div class="hand">План на встречу</div><h2>${esc(c.who || 'Встреча')}</h2></div>
      <img class="deco" src="img/kompas.jpg" style="width:90px;flex:none" alt="">
    </div>
    ${early ? `<div class="quote bad"><span class="hand w">Идти рано</span>В блоке «Чья позиция сильнее» есть ответ «никаких» или пустое место. По алгоритму Игоря стоит ещё подумать над этим вопросом или заняться усилением позиций.</div>` : ''}
    <div class="notebook" style="display:flex;flex-direction:column;gap:14px">
      <div><h3 style="margin-bottom:6px">1. Чья позиция сильнее</h3><div class="pos">${row('Если не договоримся — для нас', c.cons_us)}${row('Для оппонента', c.cons_them)}</div></div>
      <div class="grid2">
        ${col('Что хотим мы', false, row('Позиция', c.us_pos) + row('Интерес', c.us_int))}
        ${col('Что хотят они', true, row('Позиция', c.them_pos) + row('Интерес', c.them_int))}
      </div>
      <div><h3 style="margin-bottom:6px">План Б</h3><div class="grid2">
        ${col('Наш', false, row('Альтернативы', c.b_alt) + row('Если сорвётся', c.b_fail) + row('Худший сценарий', c.b_worst) + row('Как улучшить', c.b_up))}
        ${col('Оппонента', true, row('Альтернативы', c.ob_alt) + row('Если сорвётся', c.ob_fail) + row('Худший сценарий', c.ob_worst))}
      </div></div>
      <div><h3 style="margin-bottom:6px">Дедлайн</h3><div class="grid2">
        ${col('Наш', false, row('Ограничения', c.d_lim) + row('Можно отодвинуть?', c.d_move))}
        ${col('Оппонента', true, row('Ограничения', c.od_lim) + row('Можно отодвинуть?', c.od_move))}
      </div></div>
    </div>
    <div class="card">
      <div class="muted">Собеседник — <b style="color:var(--ink)">${esc(c.type || 'тип не определён')}</b>. Фразы на случай давления:</div>
      <ol class="phr">${ph.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    </div>
    <div class="row"><button class="btn sm" data-act="secTrain" data-i="${i}">Потренировать эту встречу</button><button class="btn ghost sm" data-act="print">Распечатать</button><button class="btn ghost sm" data-act="secStart">Новый план</button></div>`
  };
}

// ---------------- уроки ----------------
function lessonsView() {
  const done = S.lessons || {};
  return {
    title: 'Уроки', back: 'home', html: `
    <div><div class="hand">Демо-неделя</div><h2>Уроки <u>курса</u></h2></div>
    <div class="muted">Три урока «Мастера переговоров». После каждого — задание и тренировка в спарринге.</div>
    ${LESSONS.map((l, i) => `<button class="tile" style="min-height:0;flex-direction:row;align-items:center;gap:14px" data-go="lesson/${i}">
      <span class="ic" style="font-size:30px">${done[i] ? '✅' : '▶️'}</span>
      <span style="flex:1;display:flex;flex-direction:column;gap:3px"><span class="note">${l.block} · ${l.n}</span><span class="nm" style="font-size:16px">${l.name}</span><span class="muted small">${l.about}</span></span>
    </button>`).join('')}
    <div class="note" style="text-align:center">Остальные уроки откроются в курсе. <a href="#" data-act="gk">Программа курса</a></div>`
  };
}

function lessonView(i) {
  const l = LESSONS[i];
  if (!l) return lessonsView();
  const done = (S.lessons || {})[i];
  return {
    title: 'Уроки', back: 'lessons', html: `
    <div><div class="note">${l.block} · ${l.n}</div><h2>${l.name}</h2></div>
    <div style="aspect-ratio:16/9;border:2px dashed #cfc3ad;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(255,253,248,.6)">
      <div style="font-size:44px;color:var(--wine)">▶</div>
      <div class="hand">Здесь будет видео урока</div>
    </div>
    <div class="muted">${l.about}</div>
    <div class="card"><span class="hand">Конспект</span><div class="muted" style="margin-top:4px">Конспект появится, когда загрузим текст урока.</div></div>
    <div class="card rec"><h3>Задание</h3><div class="muted" style="margin:4px 0 10px">${l.task}</div>
      <button class="btn ghost sm" data-act="lessonAct" data-i="${i}">${l.actName}</button></div>
    <div class="row">
      ${done ? '<span class="pill ok" style="flex:none;align-self:center">урок пройден</span>' : `<button class="btn sm" data-act="lessonDone" data-i="${i}">Отметить урок пройденным</button>`}
      ${LESSONS[i + 1] ? `<button class="btn ghost sm" data-go="lesson/${i + 1}">Следующий урок</button>` : ''}
    </div>`
  };
}

// ---------------- телефон ----------------
function installView() {
  return {
    title: 'Иконка на телефоне', back: 'home', html: `
    <div class="hand">Всегда под рукой</div>
    <h2>Поставьте Рацио <u>на телефон</u></h2>
    <div class="muted">Приложение открывается кнопкой «Открыть тренажёр» в Telegram-боте Академии. А можно поставить иконку на экран телефона — тогда оно открывается как обычное приложение, без магазина приложений.</div>
    <div class="grid2">
      <div class="card"><h3 style="margin-bottom:8px">iPhone</h3><ol class="phr"><li>Откройте ссылку на тренажёр в Safari.</li><li>Нажмите «Поделиться» — квадрат со стрелкой.</li><li>Выберите «На экран „Домой“».</li><li>Нажмите «Добавить».</li></ol></div>
      <div class="card"><h3 style="margin-bottom:8px">Android</h3><ol class="phr"><li>Откройте ссылку на тренажёр в Chrome.</li><li>Нажмите ⋮ в правом верхнем углу.</li><li>Выберите «Добавить на главный экран».</li><li>Нажмите «Добавить».</li></ol></div>
    </div>
    <div class="testnote">В тестовой версии иконка пока не ставится: это заработает, когда приложение будет на своём адресе в интернете.</div>`
  };
}

// ---------------- отрисовка ----------------
function render() {
  const app = document.getElementById('app');
  if (!S.user) { app.innerHTML = loginView(); const f = app.querySelector('input'); if (f) f.focus(); return; }
  const r = route();
  const views = { home: homeView, diag: diagView, result: resultView, spar: sparView, chat: chatView, review: reviewView, progress: progressView, second: secondView, card: () => cardView(+r.arg), install: installView, lessons: lessonsView, lesson: () => lessonView(+r.arg) };
  const v = (views[r.name] || homeView)();
  app.innerHTML = shell(v, r);
  document.title = (v.title === 'Мистер Рацио' ? '' : v.title + ' — ') + 'Мистер Рацио (тест)';
  const msgs = document.getElementById('msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
  const say = document.getElementById('say');
  if (say && !say.disabled) say.focus();
}

const ACT = {
  menu() { document.getElementById('shell').classList.add('menu'); },
  closeMenu() { document.getElementById('shell').classList.remove('menu'); },
  getCode() {
    const e = document.getElementById('email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) { toast('Проверьте почту: похоже, в ней опечатка'); return; }
    tmp.login = { step: 2, email: e }; render();
  },
  checkCode() {
    const c = document.getElementById('code').value.replace(/\D/g, '');
    if (c.length !== 6) { toast('В коде 6 цифр'); return; }
    tmp.login.step = 3; render();
  },
  changeEmail(el, e) { e.preventDefault(); tmp.login.step = 1; render(); },
  setName() {
    const n = document.getElementById('uname').value.trim() || tmp.login.email.split('@')[0];
    S.user = { email: tmp.login.email, name: n.charAt(0).toUpperCase() + n.slice(1) };
    save(); location.hash = '#/home'; render();
  },
  logout() { S.user = null; save(); tmp.login = { step: 1, email: '' }; location.hash = ''; render(); },
  reset() {
    if (!confirm('Стереть все тестовые данные в этом браузере: диагностику, спарринги, планы?')) return;
    const u = S.user; S = fresh(); S.user = u; tmp = { login: { step: 1, email: '' } }; save(); go('home'); toast('Тестовые данные стёрты');
  },
  locked(el) { const L = LOCKED[el.dataset.k]; modal(L.name, L.text); },
  gk() { modal('Уроки курса', 'Здесь будет ссылка на уроки «Мастера переговоров» на ГетКурсе. В тестовой версии её нет.'); },
  curator(el, e) { if (e) e.preventDefault(); modal('Написать куратору', 'Здесь откроется Telegram куратора Академии. В тестовой версии ссылки нет.'); },

  diagStart() { tmp.dq = { i: 0, answers: [], order: QUESTIONS.map(q => shuffle(q.a.map((_, j) => j))), monster: '' }; render(); },
  diagRedo(el, e) { e.preventDefault(); tmp.dq = null; go('diag'); },
  diagPick(el) { tmp.dq.answers[tmp.dq.i] = +el.dataset.j; render(); },
  diagNext() { if (tmp.dq.answers[tmp.dq.i] == null) return; tmp.dq.i++; render(); window.scrollTo(0, 0); },
  diagPrev() { if (tmp.dq.i > 0) tmp.dq.i--; render(); },
  diagFinish() {
    const m = document.getElementById('monster'); if (m) tmp.dq.monster = m.value;
    S.diag = diagCompute(); S.diags.push(S.diag); tmp.dq = null; save(); go('result');
  },
  recGo(el) {
    const s = SKILLS[el.dataset.k];
    if (s.go === 'second') { tmp.sec = null; go('second'); return; }
    tmp.choice = { type: s.spar, sit: s.sit || 'boss', own: '' }; go('spar');
  },
  sparMonster() { tmp.choice = { type: 'tank', sit: 'own', own: S.diag.monster }; go('spar'); },

  pickType(el) { tmp.choice.type = el.dataset.k; render(); },
  pickSit(el) {
    tmp.choice.sit = el.dataset.k;
    if (el.dataset.k === 'own' && !tmp.choice.own && S.diag && S.diag.monster) tmp.choice.own = S.diag.monster;
    render();
  },
  sparStart() {
    const C = tmp.choice, own = document.getElementById('own');
    if (own) C.own = own.value.trim();
    if (C.sit === 'own' && !C.own) { toast('Опишите свою ситуацию в двух-трёх фразах'); return; }
    startSpar(C.type, C.sit, C.own, false);
  },
  sparMeasure() { startSpar('tank', 'boss', '', true); },
  send() { sendReply(); },
  stopSpar() {
    const P = S.spar;
    P.msgs.push({ w: 'sys', t: 'Стоп. Мистер Рацио готовит разбор' });
    finishSpar(); save(); go('review');
  },
  toReview() { go('review'); },
  again() { const R = S.review; startSpar(R.type, R.sit, R.own, R.measure); },

  secStart() { tmp.sec = { i: 0, v: {} }; go('second'); },
  secType(el) { tmp.sec.v.type = el.dataset.t; render(); },
  secPrev() { tmp.sec.i--; render(); },
  secNext() {
    const Q = tmp.sec;
    if (Q.i === 0 && !(Q.v.who || '').trim()) { toast('Напишите хотя бы, с кем встреча'); return; }
    window.scrollTo(0, 0);
    if (Q.i < SECOND_STEPS.length - 1) { Q.i++; render(); return; }
    S.cards.push(Object.assign({ d: new Date().toISOString() }, Q.v));
    tmp.sec = null; save(); go('card/' + (S.cards.length - 1));
  },
  secTrain(el) {
    const c = S.cards[+el.dataset.i];
    const map = { 'Танк': 'tank', 'Подросток': 'podr' };
    tmp.choice = { type: map[c.type] || 'tank', sit: 'own', own: [c.who, c.them_pos && 'Оппонент требует: ' + c.them_pos, c.us_pos && 'Я хочу: ' + c.us_pos].filter(Boolean).join('. ') };
    go('spar');
  },
  print() { window.print(); },
  lessonDone(el) { S.lessons = S.lessons || {}; S.lessons[+el.dataset.i] = new Date().toISOString(); save(); render(); toast('Урок отмечен'); },
  lessonAct(el) {
    const l = LESSONS[+el.dataset.i];
    if (l.act === 'diag') { tmp.dq = null; go(S.diag ? 'result' : 'diag'); return; }
    tmp.choice = { type: l.spar, sit: 'boss', own: '' }; go('spar');
  }
};

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); const sh = document.getElementById('shell'); if (sh) sh.classList.remove('menu'); if (g.dataset.go === 'second') tmp.sec = null; go(g.dataset.go); window.scrollTo(0, 0); return; }
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) { ACT[a.dataset.act](a, e); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f && tmp.sec) tmp.sec.v[t.dataset.f] = t.value;
  if (t.id === 'own' && tmp.choice) tmp.choice.own = t.value;
  if (t.id === 'monster' && tmp.dq) tmp.dq.monster = t.value;
  if (t.id === 'email') tmp.login.email = t.value;
  if (t.id === 'say') { t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight) + 'px'; }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const id = e.target.id;
  if (id === 'say') { e.preventDefault(); sendReply(); }
  else if (id === 'email') ACT.getCode();
  else if (id === 'code') ACT.checkCode();
  else if (id === 'uname') ACT.setName();
});
window.addEventListener('hashchange', render);
render();
