include $(TOPDIR)/rules.mk

PKG_NAME:=thunder
PKG_VERSION:=1.0.3
PKG_RELEASE:=2
PKG_LICENSE:=MIT

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
THUNDER_BIN?=

include $(INCLUDE_DIR)/package.mk

define Package/thunder
  SECTION:=net
  CATEGORY:=Network
  TITLE:=迅雷远程下载服务
  URL:=https://github.com/0x676e67/thunder
  DEPENDS:=@(x86_64||aarch64) +bash
endef

define Package/thunder/description
 Synology NAS Thunder compatibility launcher for OpenWrt. The core is fetched
 and initialized on demand from the official Synology SPK. Bash is required
 by the NAS Xiaoxing and speed-test plugins.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	@test -n "$(THUNDER_BIN)" -a -x "$(THUNDER_BIN)" || { echo "Set THUNDER_BIN to the compiled Thunder binary" >&2; exit 1; }
	$(INSTALL_BIN) "$(THUNDER_BIN)" $(PKG_BUILD_DIR)/thunder
endef

define Build/Compile
	@test -x $(PKG_BUILD_DIR)/thunder
endef

define Package/thunder/install
	$(INSTALL_DIR) $(1)/usr/bin $(1)/etc/config $(1)/etc/init.d $(1)/usr/libexec
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/thunder $(1)/usr/bin/thunder
	$(INSTALL_CONF) ./files/thunder.config $(1)/etc/config/thunder
	$(INSTALL_BIN) ./files/thunder.init $(1)/etc/init.d/thunder
	$(INSTALL_BIN) ./files/thunder-run $(1)/usr/libexec/thunder-run
endef

define Package/thunder/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || /etc/init.d/thunder stop >/dev/null 2>&1
exit 0
endef

define Package/thunder/postinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ] && /etc/init.d/thunder enabled >/dev/null 2>&1; then
	/etc/init.d/thunder start >/dev/null 2>&1
fi
exit 0
endef

$(eval $(call BuildPackage,thunder))

