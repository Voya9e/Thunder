module("luci.controller.thunder", package.seeall)

function index()
	if not nixio.fs.access("/etc/config/thunder") then
		return
	end

	local root = entry({"admin", "services", "thunder"}, firstchild(), _("迅雷"), 90)
	root.dependent = false

	entry({"admin", "services", "thunder", "status"}, call("action_status"), _("状态"), 10).leaf = true
	entry({"admin", "services", "thunder", "config"}, cbi("thunder/main"), _("设置"), 20).leaf = true
	entry({"admin", "services", "thunder", "log"}, call("action_log"), _("日志"), 30).leaf = true
end

function action_status()
	local fs = require "nixio.fs"
	local sys = require "luci.sys"
	local pidfile = "/var/run/thunder-luci.pid"
	local running = sys.call("[ -r " .. pidfile .. " ] && kill -0 $(cat " .. pidfile .. ") 2>/dev/null") == 0
	local installed = fs.access("/usr/bin/thunder", "x")
	local core_dir = "/var/packages/pan-xunlei-com/target/"
	local arch = sys.exec("uname -m 2>/dev/null"):gsub("%s+", "")
	local launcher = arch == "aarch64" and "xunlei-pan-cli-launcher.arm64" or "xunlei-pan-cli-launcher.amd64"
	local core_ready = fs.access(core_dir .. "xunlei-pan-cli-web", "x") and
		fs.access(core_dir .. "xunlei-pan-cli", "x") and fs.access(core_dir .. launcher, "x")
	local bash_ready = fs.access("/bin/bash", "x") or fs.access("/usr/bin/bash", "x")
	local install_running = fs.access("/var/lock/thunder-install.lock")
	local version = installed and sys.exec("/usr/bin/thunder --version 2>/dev/null") or ""
	local enabled = sys.call("/etc/init.d/thunder enabled >/dev/null 2>&1") == 0
	local install_log = ""
	if fs.access("/tmp/thunder-install.log") then
		install_log = sys.exec("tail -n 30 /tmp/thunder-install.log 2>/dev/null")
	end
	local service_log = ""
	if fs.access("/tmp/thunder-service.log") then
		service_log = sys.exec("tail -n 30 /tmp/thunder-service.log 2>/dev/null")
	end

	luci.template.render("thunder/status", {
		running = running,
		installed = installed,
		core_ready = core_ready,
		bash_ready = bash_ready,
		install_running = install_running,
		version = version,
		enabled = enabled,
		install_log = install_log,
		service_log = service_log
	})
end

function action_log()
	local sys = require "luci.sys"
	luci.template.render("thunder/log", {
		log = sys.exec("logread -e thunder 2>/dev/null | tail -n 200"),
		core_log = sys.exec("for f in /var/packages/pan-xunlei-com/target/var/pan-xunlei-com.log /var/packages/pan-xunlei-com/target/var/pan-xunlei-com-launcher.log /var/packages/pan-xunlei-com/target/var/pan-xunlei-com_install.log; do if [ -r \"$f\" ]; then echo \"--- $f ---\"; tail -n 200 \"$f\"; fi; done")
	})
end

