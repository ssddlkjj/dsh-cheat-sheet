window.__ModuleLoader__.load({
  id: 'dsh-cheat-sheet',
  factory(require) {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;

    const ROUTE = '/api/cheat-sheet/state';
    const KEY = 'cheat.sheet.';

    const DEFAULT_HINT =
      '说话像人：短句，一句一行；不摆清单、不归纳成金句、不写承诺句。' +
      '奥卡姆剃刀：能删的多余先删，再动手。' +
      '干活时：数字、路径、结论一个字不改；报结果三句。' +
      '改或复述规则时，先照抄原文，再动，不凭记忆重写。';

    function read(sid) {
      try {
        const raw = window.localStorage.getItem(KEY + sid);
        if (!raw) return { enabled: false, hint: DEFAULT_HINT };
        const v = JSON.parse(raw);
        return {
          enabled: !!v.enabled,
          hint: typeof v.hint === 'string' && v.hint.trim() !== '' ? v.hint : DEFAULT_HINT,
        };
      } catch (e) { return { enabled: false, hint: DEFAULT_HINT }; }
    }
    function write(sid, v) {
      try { window.localStorage.setItem(KEY + sid, JSON.stringify(v)); } catch (e) {}
    }
    function sessionIdOf(props) {
      if (!props) return null;
      if (typeof props.sessionId === 'string' && props.sessionId) return props.sessionId;
      if (props.session && typeof props.session.id === 'string' && props.session.id) return props.session.id;
      return null;
    }
    async function post(body) {
      try {
        const res = await fetch(ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'same-origin',
        });
        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }
        return { status: res.status, data };
      } catch (e) { return { status: 0, data: null }; }
    }

    function Editor(props) {
      const [text, setText] = React.useState(props.text);
      return ReactDOM.createPortal(h('div', {
        onMouseDown: function (e) { if (e.target === e.currentTarget) props.onCancel(); },
        style: {
          position: 'fixed', inset: '0', zIndex: 99999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      }, h('div', {
        style: {
          width: '560px', maxWidth: 'calc(100vw - 48px)',
          padding: '16px', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(28,26,22,0.99)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          color: 'rgba(255,255,255,0.86)', fontFamily: 'inherit',
        },
      },
        h('div', { style: { fontSize: '13px', opacity: 0.6, marginBottom: '10px' } }, '小抄（只改这条对话）'),
        h('textarea', {
          value: text,
          autoFocus: true,
          onChange: function (e) { setText(e.currentTarget.value); },
          onKeyDown: function (e) {
            if (e.key === 'Escape') props.onCancel();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) props.onSave(text);
          },
          style: {
            width: '100%', boxSizing: 'border-box',
            height: '180px', resize: 'vertical',
            padding: '10px 12px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(0,0,0,0.35)', color: 'inherit',
            fontSize: '13px', lineHeight: '1.7', outline: 'none',
          },
        }),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' } },
          h('button', {
            type: 'button',
            onClick: function () { setText(DEFAULT_HINT); },
            style: { padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
          }, '恢复默认'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', {
              type: 'button',
              onClick: props.onCancel,
              style: { padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
            }, '取消'),
            h('button', {
              type: 'button',
              onClick: function () { props.onSave(text); },
              style: { padding: '6px 14px', borderRadius: '6px', border: 'none', background: 'rgba(232,196,106,0.9)', color: '#1e1b16', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
            }, '保存')
          )
        ),
        h('div', { style: { marginTop: '8px', fontSize: '11px', opacity: 0.4 } }, 'Ctrl+Enter 保存，Esc 取消')
      )), document.body);
    }

    function CheatToggle(props) {
      const sid = props.sessionId;
      const [cfg, setCfg] = React.useState(function () { return sid ? read(sid) : { enabled: false, hint: DEFAULT_HINT }; });
      const [busy, setBusy] = React.useState(false);
      const [note, setNote] = React.useState('');
      const [editing, setEditing] = React.useState(false);

      React.useEffect(function () {
        if (!sid) return;
        post({ sessionId: sid, enabled: cfg.enabled, hint: cfg.hint });
      }, [sid, cfg.enabled, cfg.hint]);

      if (!sid) return null;

      const flash = function (msg) {
        setNote(msg);
        setTimeout(function () { setNote(''); }, 2500);
      };

      const toggle = async function () {
        setBusy(true); setNote('');
        const next = { enabled: !cfg.enabled, hint: cfg.hint };
        setCfg(next); write(sid, next);
        const r = await post({ sessionId: sid, enabled: next.enabled, hint: next.hint });
        if (r.status !== 200) { flash('HTTP ' + r.status); setBusy(false); return; }
        const d = r.data || {};
        const bits = [];
        bits.push(next.enabled ? '已开' : '已关');
        bits.push(d.installed ? '装上了' : '没装上');
        if (d.error) bits.push('err:' + String(d.error).slice(0, 40));
        flash(bits.join(' · '));
        setBusy(false);
      };

      const save = function (text) {
        const value = text.trim() === '' ? DEFAULT_HINT : text.slice(0, 600);
        const next = { enabled: cfg.enabled, hint: value };
        setCfg(next); write(sid, next);
        post({ sessionId: sid, enabled: next.enabled, hint: value });
        setEditing(false);
        flash('已存');
      };

      return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
        h('button', {
          type: 'button',
          disabled: busy,
          onClick: toggle,
          onContextMenu: function (e) { e.preventDefault(); setEditing(true); },
          title: '左键开关，右键改小抄原文（只影响这条对话）',
          style: {
            padding: '0', border: 'none', margin: '0',
            background: 'transparent',
            color: cfg.enabled ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.45)',
            fontSize: '13px', fontWeight: 400, lineHeight: '1',
            fontFamily: 'inherit', letterSpacing: 'normal', cursor: 'pointer',
          },
        }, cfg.enabled ? '小抄·开' : '小抄·停'),
        note ? h('span', { style: { fontSize: '11px', opacity: 0.5 } }, note) : null,
        editing ? h(Editor, {
          text: cfg.hint,
          onSave: save,
          onCancel: function () { setEditing(false); },
        }) : null);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          ctx.slots.inject('conversation.composer.dock', function () {
            return ctx.slots.register({
              name: 'conversation.composer.dock',
              id: 'cheat-sheet',
              order: 61,
            }, function (props) {
              return h(CheatToggle, { sessionId: sessionIdOf(props) });
            });
          });
        } catch (e) {
          try { console.warn('[cheat-sheet]', e); } catch (_) {}
        }
      },
    };
  },
});
