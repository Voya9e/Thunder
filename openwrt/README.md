# OpenWrt / LuCI packages

This directory is an OpenWrt package feed. It contains a `thunder` package for
the upstream musl release binary and `luci-app-thunder` for service management.

## Build

From an OpenWrt build tree, add this directory as a feed, then select the
packages in menuconfig:

```sh
echo 'src-link thunder /path/to/thunder/openwrt' >> feeds.conf
./scripts/feeds update thunder
./scripts/feeds install thunder luci-app-thunder
make menuconfig
```

For CMCC RAX3000M eMMC running the official OpenWrt 25.12 line, this repository
also provides a manual GitHub Actions build at
`.github/workflows/build-rax3000m-emmc.yml`. It uses the `mediatek/filogic`
SDK and publishes installable `thunder` and `luci-app-thunder` packages, plus
SHA-256 checksums, in a uniquely tagged GitHub Release. It does not build a
firmware image. Other firmware routes in the RAX3000M firmware project need
their own matching SDK.

The package uses the upstream v1.0.3 x86_64 and aarch64 musl release binaries
for the Linux launcher and downloads the matching DSM 7 Synology SPK only when
you explicitly initialize the core. The `bash` package is installed as a
dependency for NAS Xiaoxing and speed-test plugins. Other architectures are
unsupported by this initial package recipe.

After installing the packages, open **Services → 迅雷** in LuCI. Use
**Download and initialize core** to fetch and extract the official Synology
SPK, then start the service. The download is initiated only by that explicit
button or `/etc/init.d/thunder install`; it requires router internet access.
The upstream CLI currently downloads the SPK over HTTP. Review the upstream
project's experimental-support notice before using it on a router.

The `thunder` CLI's uninstall command recursively removes its configured data
directory. For that reason the LuCI page does not provide a one-click core
uninstall action; remove the OpenWrt packages through the system package
manager, and back up data before manually removing core files.


