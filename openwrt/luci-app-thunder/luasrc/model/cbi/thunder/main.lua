local sys = require "luci.sys"
local Map, Section, Flag, Value, Button = luci.cbi.Map, luci.cbi.NamedSection, luci.cbi.Flag, luci.cbi.Value, luci.cbi.Button

local m = Map("thunder", translate("迅雷设置"), translate("配置迅雷内核。保存目录、UID/GID 或监听地址后，请重启服务使设置生效。"))

local s = m:section(Section, "main", "main")

local enabled = s:option(Flag, "enabled", translate("开机启动"))
enabled.default = "0"
enabled.rmempty = false
function enabled.write(self, section, value)
	Flag.write(self, section, value)
	if value == "1" then
		sys.call("/etc/init.d/thunder enable >/dev/null 2>&1")
	else
		sys.call("/etc/init.d/thunder disable >/dev/null 2>&1")
	end
end

local config_path = s:option(Value, "config_path", translate("配置目录"))
config_path.default = "/opt/thunder"
config_path.datatype = "string"
config_path.description = translate("绝对路径；建议放在有持久存储空间的位置。")

local download_path = s:option(Value, "download_path", translate("下载目录"))
download_path.default = "/opt/thunder/downloads"
download_path.datatype = "string"
download_path.description = translate("迅雷实际写入的下载目录。")

local mount_path = s:option(Value, "mount_bind_download_path", translate("迅雷内下载路径"))
mount_path.default = "/thunder"
mount_path.datatype = "string"
mount_path.description = translate("通过 bind mount 映射给迅雷的目录。")

local uid = s:option(Value, "uid", translate("运行 UID"))
uid.default = "0"
uid.datatype = "uinteger"

local gid = s:option(Value, "gid", translate("运行 GID"))
gid.default = "0"
gid.datatype = "uinteger"

local bind = s:option(Value, "bind", translate("监听地址"))
bind.default = "0.0.0.0:5055"
bind.description = translate("格式：IP:端口。默认 Web 面板端口为 5055。")

local password = s:option(Value, "auth_password", translate("面板密码"))
password.password = true
password.rmempty = true
password.description = translate("留空会关闭面板认证；非本机监听时必须设置密码才能启动。")

local install = s:option(Button, "_install", translate("迅雷核心"))
install.inputtitle = translate("下载并初始化核心")
install.inputstyle = "apply"
install.description = translate("仅在点击时从迅雷服务器下载并解包 Synology SPK；需要路由器可访问互联网。")
function install.write()
	sys.call("/etc/init.d/thunder install >/tmp/thunder-install.log 2>&1")
end

local start = s:option(Button, "_start", translate("服务"))
start.inputtitle = translate("启动")
start.inputstyle = "apply"
function start.write()
	sys.call("/etc/init.d/thunder start >/tmp/thunder-service.log 2>&1")
end

local restart = s:option(Button, "_restart", " ")
restart.inputtitle = translate("重启")
restart.inputstyle = "reload"
function restart.write()
	sys.call("/etc/init.d/thunder restart >/tmp/thunder-service.log 2>&1")
end

local stop = s:option(Button, "_stop", " ")
stop.inputtitle = translate("停止")
stop.inputstyle = "reset"
function stop.write()
	sys.call("/etc/init.d/thunder stop >/tmp/thunder-service.log 2>&1")
end

return m

