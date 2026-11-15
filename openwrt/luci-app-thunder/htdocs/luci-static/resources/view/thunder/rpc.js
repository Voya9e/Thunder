'use strict';
'require view';
'require rpc';
'require ui';

const calls = {
	status: rpc.declare({ object: 'luci.thunder', method: 'status', expect: {} }),
	logs: rpc.declare({ object: 'luci.thunder', method: 'logs', expect: {} }),
	config: rpc.declare({ object: 'luci.thunder', method: 'config', expect: {} }),
	start: rpc.declare({ object: 'luci.thunder', method: 'start', expect: {} }),
	stop: rpc.declare({ object: 'luci.thunder', method: 'stop', expect: {} }),
	restart: rpc.declare({ object: 'luci.thunder', method: 'restart', expect: {} }),
	boot: rpc.declare({ object: 'luci.thunder', method: 'boot', params: [ 'enabled' ], expect: {} }),
	install: rpc.declare({ object: 'luci.thunder', method: 'install', expect: {} }),
	save: rpc.declare({
		object: 'luci.thunder', method: 'save_config',
		params: [ 'enabled', 'config_path', 'download_path', 'mount_bind_download_path', 'bind', 'auth_password' ],
		expect: {}
	})
};

function alert(message, type) {
	return E('div', { 'class': `alert-message ${type || ''} thunder-alert` }, [ message ]);
}

function button(label, method, style, argument) {
	return E('button', {
		'class': `btn ${style || ''}`,
		'click': function() {
			this.disabled = true;
			(argument === undefined ? calls[method]() : calls[method](argument)).then(function(result) {
				ui.addNotification(null, E('p', [ result.error || result.message || (result.ok === false ? _('Operation failed') : _('Operation completed')) ]), result.error || result.ok === false ? 'error' : 'info');
				if (result.ok !== false)
					location.reload();
			}).catch(function(err) {
				ui.addNotification(null, E('p', [ err.message || _('RPC request failed') ]), 'error');
				this.disabled = false;
			}.bind(this));
		}
	}, [ label ]);
}

function card(label, value, good) {
	return E('div', { 'class': 'thunder-card' }, [
		E('div', { 'class': 'thunder-card-label' }, [ label ]),
		E('div', { 'class': `thunder-card-value ${good == null ? '' : (good ? 'thunder-ok' : 'thunder-warn')}` }, [ value ])
	]);
}

function logbox(title, text) {
	return E('section', { 'class': 'thunder-panel' }, [ E('h3', [ title ]),
		text ? E('pre', { 'class': 'thunder-pre' }, [ text ]) : E('p', { 'class': 'thunder-empty' }, [ _('暂无操作输出') ])
	]);
}

function page(title, children) {
	return E('div', { 'class': 'cbi-map thunder-page' }, [
		E('style', [
			'.thunder-page{max-width:1180px;margin:0 auto;padding-bottom:2em}',
			'.thunder-nav{display:flex;gap:.45em;flex-wrap:wrap;margin:0 0 1.5em;padding:.35em;border:1px solid var(--border-color-medium,#d8dee8);border-radius:10px;background:var(--background-color-high,#fff)}',
			'.thunder-nav a{display:inline-block;padding:.68em 1.1em;border-radius:7px;color:var(--text-color-primary,#253247);text-decoration:none;transition:background .15s,color .15s}',
			'.thunder-nav a:hover{background:var(--background-color-low,#f1f4f8)}.thunder-nav a.active{background:var(--primary-color,#356fe0);color:#fff;font-weight:650}',
			'.thunder-intro,.thunder-panel,.thunder-form-group,.thunder-core-action{padding:1.25em 1.4em;margin:1em 0;border:1px solid var(--border-color-medium,#d8dee8);border-radius:10px;background:var(--background-color-high,#fff);box-shadow:0 2px 8px rgba(24,39,75,.045)}',
			'.thunder-intro{border-left:4px solid var(--primary-color,#356fe0)}.thunder-intro h2{margin:.1em 0 .4em;font-size:1.5em}.thunder-intro p,.thunder-muted,.thunder-field-help{color:var(--text-color-secondary,#64748b)}.thunder-intro p:last-child{margin-bottom:0}',
			'.thunder-form-group h3,.thunder-panel h3,.thunder-core-action h3{margin:.1em 0 1em;font-size:1.08em}',
			'.thunder-field{display:grid;grid-template-columns:minmax(190px,250px) minmax(220px,1fr);align-items:center;gap:.5em 1.25em;padding:1em 0;border-bottom:1px solid var(--border-color-medium,#e6eaf0)}.thunder-field:last-child{border-bottom:0}',
			'.thunder-field label{font-weight:600}.thunder-field-help{grid-column:2;font-size:.9em;line-height:1.45}.thunder-field input{width:100%;max-width:44em;min-height:2.65em;box-sizing:border-box;border:1px solid var(--border-color-medium,#cbd5e1);border-radius:6px;padding:.45em .7em;background:var(--background-color-high,#fff);color:var(--text-color-primary,#1e293b)}.thunder-field input:focus{border-color:var(--primary-color,#356fe0);outline:2px solid rgba(53,111,224,.16)}',
			'.thunder-dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:1em 0}',
			'.thunder-card{position:relative;overflow:hidden;padding:1.1em 1.2em;border:1px solid var(--border-color-medium,#d8dee8);border-radius:10px;background:var(--background-color-high,#fff);box-shadow:0 2px 8px rgba(24,39,75,.045)}',
			'.thunder-card-label{color:var(--text-color-secondary,#64748b);font-size:.9em}.thunder-card-value{margin-top:.55em;font-size:1.22em;font-weight:650}',
			'.thunder-ok{color:var(--success-color,#16833d)}.thunder-warn{color:var(--warning-color,#ad6a00)}',
			'.thunder-actions{display:flex;align-items:center;flex-wrap:wrap;gap:.65em;margin:.85em 0}.thunder-actions .btn{min-height:2.55em;padding:.45em 1em;border-radius:6px;cursor:pointer}.thunder-actions .btn:disabled{opacity:.6;cursor:wait}.thunder-state-button.active{box-shadow:inset 0 0 0 2px var(--primary-color,#356fe0);font-weight:700}',
			'.thunder-pre{max-height:40em;min-height:18em;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}',
			'.thunder-log-content{padding:1.1em;border:1px solid var(--border-color-medium,#d8dee8);border-radius:7px;background:var(--background-color-low,#f5f7fa);color:var(--text-color-primary,#263445)}',
			'.thunder-empty{display:flex;min-height:16em;align-items:center;justify-content:center;border:1px dashed var(--border-color-medium,#cbd5e1);border-radius:7px;color:var(--text-color-secondary,#64748b)}',
			'.thunder-alert{margin:1em 0;border-radius:7px}',
			'.thunder-core-action{border-left:4px solid var(--warning-color,#d79a20)}',
			'@media(max-width:700px){.thunder-page{padding:0 .25em 1.5em}.thunder-field{grid-template-columns:1fr;gap:.45em}.thunder-field-help{grid-column:1}.thunder-intro,.thunder-panel,.thunder-form-group,.thunder-core-action{padding:1em}.thunder-nav a{flex:1;text-align:center;padding:.65em .5em}}'
		].join('\n')),
		...(title ? [ E('h2', [ title ]) ] : []),
		...children
	]);
}

return view.extend({
	load: function() {
		const path = location.pathname;
		if (path.endsWith('/config'))
			return Promise.all([ L.resolveDefault(calls.config(), {}) ]);
		if (path.endsWith('/log'))
			return Promise.all([ L.resolveDefault(calls.logs(), {}) ]);
		return Promise.all([ L.resolveDefault(calls.status(), {}) ]);
	},
	render: function(data) {
		const result = data[0] || {};
		const path = location.pathname;
		if (path.endsWith('/config'))
			return this.renderConfig(result);
		if (path.endsWith('/log'))
			return this.renderLogs(result);
		return this.renderStatus(result);
	},
	renderStatus: function(s) {
		return page(null, [
			this.nav(),
			E('section', { 'class': 'thunder-intro' }, [
				E('h2', [ _('迅雷') ]),
				E('p', [ _('Thunder 从迅雷群晖套件中提取，用于发行版 Linux（支持 OpenWrt / Alpine / Docker）的迅雷远程下载服务。') ]),
				E('p', [ _('仅供测试，测试完成后请自觉删除。') ])
			]),
			E('div', { 'class': 'thunder-dashboard' }, [
				card(_('服务状态'), s.running ? _('运行中') : _('已停止'), s.running),
				card(_('迅雷核心'), s.install_running ? _('初始化中') : (s.core_ready ? _('已初始化') : _('未初始化')), s.core_ready),
				card(_('Bash 依赖'), s.bash_ready ? _('已安装') : _('未安装'), s.bash_ready)
			]),
			E('section', { 'class': 'thunder-panel' }, [
				E('h3', [ _('开机启动') ]),
				E('div', { 'class': 'thunder-actions' }, [
					button(_('已启用'), 'boot', `thunder-state-button ${s.enabled ? 'active cbi-button-positive' : ''}`, true),
					button(_('已关闭'), 'boot', `thunder-state-button ${!s.enabled ? 'active cbi-button-negative' : ''}`, false)
				])
			]),
			logbox(_('最近的操作输出'), [ s.install_log, s.service_log ].filter(Boolean).join('\n\n')),
			E('section', { 'class': 'thunder-panel' }, [
				E('h3', [ _('服务') ]),
				E('div', { 'class': 'thunder-actions' }, [
					button(_('启动'), 'start', 'cbi-button-action'),
					button(_('停止'), 'stop', 'cbi-button-reset'),
					button(_('重启'), 'restart', 'cbi-button-apply')
				])
			]),
			!s.core_ready ? alert(_('核心尚未初始化。请在“插件设置”中下载并初始化；此操作需要路由器可以访问互联网。'), 'warning') : '',
			!s.bash_ready ? alert(_('NAS 小星和测速插件依赖 Bash，请先安装 bash 软件包。'), 'warning') : ''
		]);
	},
	renderLogs: function(logs) {
		const tabs = E('div', { 'class': 'thunder-actions' });
		const content = E('pre', { 'class': 'thunder-pre thunder-log-content' }, [ logs.core || _('暂无日志内容') ]);
		const options = [ [ 'core', _('核心日志') ], [ 'service', _('服务日志') ] ];
		const buttons = [];
		options.forEach(function(option, index) {
			const button = E('button', {
				'class': `btn cbi-button-edit ${index == 0 ? 'cbi-button-action' : ''}`,
				'click': function() {
					content.textContent = logs[option[0]] || _('暂无日志内容');
					buttons.forEach((tab, tabIndex) => tab.classList.toggle('cbi-button-action', tabIndex == index));
				}
			}, [ option[1] ]);
			buttons.push(button);
			tabs.appendChild(button);
		});
		return page(_('运行日志'), [
			this.nav(),
			E('section', { 'class': 'thunder-intro' }, [
				E('h2', [ _('运行日志') ]),
				E('p', [ _('包括核心日志以及服务日志。选择日志类型查看对应内容。') ])
			]),
			E('section', { 'class': 'thunder-panel' }, [ tabs, content ])
		]);
	},
	renderConfig: function(c) {
		const fields = [
			[ 'config_path', _('配置目录'), '/opt/thunder', _('绝对路径，建议放在有持久存储空间的位置。'), 'text' ],
			[ 'download_path', _('下载目录'), '/opt/thunder/downloads', _('迅雷实际写入下载文件的目录。'), 'text' ],
			[ 'mount_bind_download_path', _('迅雷内下载路径'), '/thunder', _('通过 bind mount 映射给迅雷核心使用的目录。'), 'text' ],
			[ 'bind', _('监听地址'), '0.0.0.0:5055', _('格式为 IP:端口。默认 Web 面板端口为 5055。'), 'text' ],
			[ 'auth_password', _('面板密码'), '', c.auth_password_set ? _('当前已设置密码；输入新密码以替换，留空则关闭认证。') : _('留空会关闭面板认证；监听非本机地址时必须设置密码。'), 'password' ]
		];
		const renderField = function(field) {
			return E('div', { 'class': 'thunder-field' }, [
				E('label', { 'for': `thunder-${field[0]}` }, [ field[1] ]),
				E('input', {
					'class': 'cbi-input-text', 'id': `thunder-${field[0]}`, 'type': field[4],
					'value': field[0] == 'auth_password' ? '' : (c[field[0]] || field[2]),
					'min': field[4] == 'number' ? '0' : null,
					'autocomplete': field[4] == 'password' ? 'new-password' : 'off'
				}),
				E('div', { 'class': 'thunder-field-help' }, [ field[3] ])
			]);
		};
		const form = E('div', {}, [
			E('section', { 'class': 'thunder-form-group' }, [
				E('h3', [ _('迅雷运行参数') ]),
				...fields.slice(0, 3).map(renderField)
			]),
			E('section', { 'class': 'thunder-form-group' }, [
				E('h3', [ _('Web 面板') ]),
				...fields.slice(3).map(renderField)
			]),
			E('div', { 'class': 'thunder-actions' }, [
				E('button', { 'class': 'btn cbi-button-save', 'click': function() {
					const values = {};
					fields.forEach(field => values[field[0]] = document.getElementById(`thunder-${field[0]}`).value);
					calls.save(c.enabled, values.config_path, values.download_path,
						values.mount_bind_download_path, values.bind, values.auth_password)
						.then(function(result) {
							ui.addNotification(null, E('p', [ result.error || result.message ]), result.error ? 'error' : 'info');
						}).catch(function(err) {
							ui.addNotification(null, E('p', [ err.message ]), 'error');
						});
				} }, [ _('保存设置') ])
			]),
			E('section', { 'class': 'thunder-core-action' }, [
				E('h3', [ _('迅雷核心') ]),
				E('p', { 'class': 'thunder-muted' }, [ _('仅在点击时从迅雷服务器下载并解包 Synology SPK；需要路由器可以访问互联网。初始化前请先保存配置。') ]),
				button(_('下载并初始化核心'), 'install', 'cbi-button-action')
			])
		]);
		return page(_('插件设置'), [
			this.nav(),
			E('section', { 'class': 'thunder-intro' }, [
				E('h2', [ _('插件设置') ]),
				E('p', [ _('配置迅雷内核、保存目录和监听地址后，请重启服务使设置生效。') ])
			]),
			form
		]);
	},
	nav: function() {
		const path = location.pathname;
		return E('nav', { 'class': 'thunder-nav' }, [
			E('a', { 'class': path.endsWith('/status') ? 'active' : '', 'href': L.url('admin/services/thunder/status') }, [ _('运行状态') ]),
			E('a', { 'class': path.endsWith('/config') ? 'active' : '', 'href': L.url('admin/services/thunder/config') }, [ _('插件设置') ]),
			E('a', { 'class': path.endsWith('/log') ? 'active' : '', 'href': L.url('admin/services/thunder/log') }, [ _('运行日志') ])
		]);
	},
	handleSave: null, handleSaveApply: null, handleReset: null
});
