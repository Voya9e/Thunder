include $(TOPDIR)/rules.mk

PKG_NAME:=thunder
PKG_VERSION:=1.0.3
PKG_RELEASE:=1
PKG_LICENSE:=MIT

PKG_SOURCE_URL:=https://github.com/0x676e67/thunder/releases/download/v$(PKG_VERSION)
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)

ifeq ($(ARCH),x86_64)
  THUNDER_TARGET:=x86_64-unknown-linux-musl
  PKG_SOURCE:=thunder-$(PKG_VERSION)-$(THUNDER_TARGET).tar.gz
  PKG_HASH:=2c10dd081bdb5707498575bc8273d80028467b0359d1bba93430d8ffeaa06f77
else ifneq ($(findstring aarch64,$(ARCH)),)
  THUNDER_TARGET:=aarch64-unknown-linux-musl
  PKG_SOURCE:=thunder-$(PKG_VERSION)-$(THUNDER_TARGET).tar.gz
  PKG_HASH:=401bbfad610f587d8b70dd647985dcc4397052a857246de128ee114a72c10fd4
else
  PKG_SOURCE:=unsupported-architecture.tar.gz
  PKG_HASH:=skip
endif

include $(INCLUDE_DIR)/package.mk

define Package/thunder
  SECTION:=net
  CATEGORY:=Network
  TITLE:=迅雷远程下载服务
  URL:=https://github.com/0x676e67/thunder
  DEPENDS:=@(x86_64||aarch64)
endef

define Package/thunder/description
 Synology NAS Thunder compatibility launcher for OpenWrt. The first start
 follows an explicit install action that fetches the upstream Synology package.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	tar -xzf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)
endef

define Build/Compile
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

