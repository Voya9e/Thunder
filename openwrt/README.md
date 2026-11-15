# OpenWrt / LuCI packages

This directory is the Thunder OpenWrt package feed. It contains a `thunder` package for
the Rust binary compiled from this repository and `luci-app-thunder` for
service management. The LuCI app uses JavaScript views and a small rpcd ucode
plugin (`luci.thunder`) for status, logs, configuration, and service actions.
The ucode plugin only adapts authenticated LuCI RPC calls to UCI and the
existing `/etc/init.d/thunder` / Rust CLI; download and core initialization
remain in Rust.

## Build

From an OpenWrt build tree, add this directory as a feed, then select the
packages in menuconfig:

```sh
echo 'src-link thunder /path/to/thunder/openwrt' >> feeds.conf
./scripts/feeds update thunder
./scripts/feeds install thunder luci-app-thunder
make menuconfig
```

Compile the Rust executable for the router first. Install Zig, Rust's
`aarch64-unknown-linux-musl` target, and `cargo-zigbuild`, then build and pass
the resulting binary into the OpenWrt SDK:

```sh
export CC_aarch64_unknown_linux_musl="zig cc -target aarch64-linux-musl"
export CXX_aarch64_unknown_linux_musl="zig c++ -target aarch64-linux-musl"
export AR_aarch64_unknown_linux_musl="zig ar"
cargo zigbuild --release --target aarch64-unknown-linux-musl
export THUNDER_BIN="$PWD/target/aarch64-unknown-linux-musl/release/thunder"
make package/feeds/thunder/thunder/compile
```

For CMCC RAX3000M eMMC running the official OpenWrt 25.12 line, this repository
also provides a manual GitHub Actions build at
`.github/workflows/build-rax3000m-emmc.yml`. It uses the `mediatek/filogic`
SDK and publishes installable `thunder` and `luci-app-thunder` packages, plus
SHA-256 checksums, in a uniquely tagged GitHub Release. It does not build a
firmware image. Other firmware routes in the RAX3000M firmware project need
their own matching SDK.

The RAX3000M workflow compiles this repository's source for
`aarch64-unknown-linux-musl` with Cortex-A53 CPU tuning, then packages that
binary through the official OpenWrt SDK. It downloads the matching DSM 7
Synology SPK only when you explicitly initialize the core. The `bash` package
is installed as a dependency for NAS Xiaoxing and speed-test plugins. Other
architectures are unsupported by this initial package recipe.

### Install packages over SSH on OpenWrt 25.12

The workflow publishes standalone APK files, which are not signed with a key
trusted by your router. After copying both APKs to the router, install them
with OpenWrt's APK package manager and explicitly allow the unsigned local
packages:

```sh
apk add --allow-untrusted /tmp/thunder-*.apk /tmp/luci-app-thunder-*.apk
```

Use this only for packages obtained from a source you trust. Verify the
release's `SHA256SUMS` before copying them to the router. This option applies
to these local APK files; it does not configure the router to trust an
unsigned package feed. For a private feed, sign its packages with your own
APK key and install the corresponding public key on the router instead.

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


