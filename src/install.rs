use std::ops::Not;
use std::path::Path;
use std::path::PathBuf;

use crate::asset::thunder::Asset;
use crate::constant;
use crate::util;
use crate::InstallConfig;
use crate::Running;
use anyhow::Context;
use anyhow::Result;
use rand::Rng;

fn symlink_points_to(link: &Path, target: &Path) -> bool {
    if std::fs::read_link(link).ok().as_deref() == Some(target) {
        return true;
    }

    let expected_target = if target.is_absolute() {
        target.to_path_buf()
    } else {
        link.parent().unwrap_or_else(|| Path::new(".")).join(target)
    };
    matches!(
        (
            std::fs::canonicalize(link),
            std::fs::canonicalize(expected_target)
        ),
        (Ok(link_target), Ok(expected_target)) if link_target == expected_target
    )
}

fn ensure_package_symlink(target: &Path, link: &Path) -> Result<()> {
    match std::fs::symlink_metadata(link) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            let current_target = std::fs::read_link(link)?;
            if symlink_points_to(link, target) {
                return Ok(());
            }

            if current_target.starts_with(Path::new(constant::SYNOPKG_PKGBASE)) {
                std::fs::remove_file(link)?;
            } else {
                println!(
                    "Keep existing symlink {} -> {}; it is not owned by Thunder",
                    link.display(),
                    current_target.display()
                );
                return Ok(());
            }
        }
        Ok(_) => {
            println!(
                "Keep existing path {}; it is not owned by Thunder",
                link.display()
            );
            return Ok(());
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.into()),
    }

    nix::unistd::symlinkat(target, None, link)?;
    Ok(())
}

fn ensure_cli_compatibility_link(target_dir: &Path) -> Result<()> {
    let version = std::fs::read_to_string(target_dir.join("version")).ok();
    let mut candidates = Vec::new();
    for entry in std::fs::read_dir(target_dir)? {
        let entry = entry?;
        if entry.file_type()?.is_file()
            && entry
                .file_name()
                .to_str()
                .map(|name| name.starts_with("xunlei-pan-cli."))
                .unwrap_or(false)
        {
            candidates.push(entry.file_name());
        }
    }

    let matching = version
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|version| {
            let prefix = format!("xunlei-pan-cli.{version}.");
            candidates
                .iter()
                .filter(|name| {
                    name.to_str()
                        .map(|name| name.starts_with(&prefix))
                        .unwrap_or(false)
                })
                .cloned()
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let source_name = if matching.len() == 1 {
        matching[0].clone()
    } else if candidates.len() == 1 {
        candidates[0].clone()
    } else {
        anyhow::bail!(
            "Expected one versioned xunlei-pan-cli binary in {}, found {}",
            target_dir.display(),
            candidates.len()
        );
    };

    let source = target_dir.join(&source_name);
    let compatibility_link = target_dir.join("xunlei-pan-cli");
    let relative_target = Path::new(&source_name);

    match std::fs::symlink_metadata(&compatibility_link) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            let current_target = std::fs::read_link(&compatibility_link)?;
            if symlink_points_to(&compatibility_link, relative_target) {
                return Ok(());
            }

            let resolved_target = if current_target.is_absolute() {
                current_target
            } else {
                target_dir.join(current_target)
            };
            if !resolved_target.starts_with(target_dir) {
                anyhow::bail!(
                    "Refusing to replace compatibility symlink {} -> {} outside {}",
                    compatibility_link.display(),
                    resolved_target.display(),
                    target_dir.display()
                );
            }
            std::fs::remove_file(&compatibility_link)?;
        }
        Ok(metadata) if metadata.file_type().is_file() => {
            std::fs::remove_file(&compatibility_link)?;
        }
        Ok(_) => anyhow::bail!(
            "Cannot create compatibility link: {} already exists and is not a file or symlink",
            compatibility_link.display()
        ),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.into()),
    }

    nix::unistd::symlinkat(relative_target, None, &compatibility_link)?;
    println!(
        "Create compatibility link: {} -> {}",
        compatibility_link.display(),
        source_name.to_string_lossy()
    );
    Ok(())
}

/// Install xunlei
pub struct XunleiInstall(pub InstallConfig);

impl Running for XunleiInstall {
    fn run(self) -> Result<()> {
        // If the package is already installed, skip the installation
        if Path::new(constant::SYNOPKG_VAR).exists() {
            println!("Thunder already installed");
            return Ok(());
        }

        println!("Installing in progress");

        // config path
        if self.0.config_path.is_dir().not() {
            std::fs::create_dir_all(&self.0.config_path)?;
            util::recursive_chown(&self.0.config_path, self.0.uid, self.0.gid);
        } else if self.0.config_path.is_file() {
            anyhow::bail!(
                "Config path: {} must be a directory",
                self.0.config_path.display()
            )
        }

        // real store download path
        if self.0.download_path.is_dir().not() {
            util::create_dir_all(&self.0.download_path, 0o755)?;
            util::recursive_chown(&self.0.download_path, self.0.uid, self.0.gid);
        } else if self.0.download_path.is_file() {
            anyhow::bail!(
                "Download path: {} must be a directory",
                self.0.download_path.display()
            )
        }

        // mount bind downloads directory
        if self.0.mount_bind_download_path.is_dir().not() {
            util::create_dir_all(&self.0.mount_bind_download_path, 0o755)?;
            util::recursive_chown(&&self.0.mount_bind_download_path, self.0.uid, self.0.gid);
        } else if self.0.mount_bind_download_path.is_file() {
            anyhow::bail!(
                "Mount bind download path: {} must be a directory",
                self.0.mount_bind_download_path.display()
            )
        }

        println!("Config directory: {}", self.0.config_path.display());
        println!("Download directory: {}", self.0.download_path.display());

        //  /var/packages/pan-xunlei-com
        let base_dir = Path::new(constant::SYNOPKG_PKGBASE);
        // /var/packages/pan-xunlei-com/target
        let target_dir = PathBuf::from(constant::SYNOPKG_PKGDEST);
        // /var/packages/pan-xunlei-com/target/host
        let host_dir = PathBuf::from(constant::SYNOPKG_HOST);
        // If Synology NAS is not installed, the backend service will not be started
        let var_path = Path::new(constant::SYNOPKG_VAR);

        // uid and gid
        let uid = self.0.uid;
        let gid = self.0.gid;

        util::create_dir_all(&target_dir, 0o755)?;

        // path: /var/packages/pan-xunlei-com/target/var
        if !var_path.exists() {
            util::create_dir_all(var_path, 0o777)?;
            util::chown(var_path, uid, gid)?;
        }

        // download xunlei binary
        let xunlei = Asset::new(self.0.package)?;
        xunlei.init()?;
        for file in xunlei.iter()? {
            let filename = file.as_str();
            let target_filepath = target_dir.join(filename);
            let data = xunlei.get(filename).context("Read data failure")?;
            util::write_file(&target_filepath, data, 0o755)?;
            println!("Install to: {}", target_filepath.display());
            util::chown(&target_filepath, uid, gid).context(format!(
                "Failed to set permission: {}, UID:{uid}, UID:{gid}",
                base_dir.display(),
            ))?;
        }

        // The Synology SPK names the versioned CLI binary, while the launcher
        // and OpenWrt service expect this stable, unversioned path.
        ensure_cli_compatibility_link(&target_dir)?;

        // path: /var/packages/pan-xunlei-com/target/host/etc/synoinfo.conf
        let synoinfo_path = PathBuf::from(format!(
            "{}{}",
            host_dir.display(),
            constant::SYNO_INFO_PATH
        ));
        util::create_dir_all(
            synoinfo_path.parent().context(format!(
                "the path: {} parent not exists",
                synoinfo_path.display()
            ))?,
            0o755,
        )?;

        // Generate a random synology id
        let mut byte_arr = vec![0u8; 32];
        rand::thread_rng().fill(&mut byte_arr[..]);
        let hex_string = byte_arr
            .iter()
            .map(|u| format!("{:02x}", *u as u32))
            .collect::<String>()
            .chars()
            .take(7)
            .collect::<String>();
        util::write_file(
            &synoinfo_path,
            std::borrow::Cow::Borrowed(
                format!("unique=\"synology_{}_720+\"", hex_string).as_bytes(),
            ),
            0o644,
        )?;

        // path: /var/packages/pan-xunlei-com/target/host/usr/syno/synoman/webman/modules/authenticate.cgi
        let syno_authenticate_path = PathBuf::from(format!(
            "{}{}",
            host_dir.display(),
            constant::SYNO_AUTHENTICATE_PATH
        ));
        util::create_dir_all(
            syno_authenticate_path.parent().context(format!(
                "directory path: {} not exists",
                syno_authenticate_path.display()
            ))?,
            0o755,
        )?;
        util::write_file(
            &syno_authenticate_path,
            std::borrow::Cow::Borrowed(String::from("#!/usr/bin/env sh\necho OK").as_bytes()),
            0o755,
        )?;

        // path: /etc/synoinfo.conf
        let target_synoinfo_path = Path::new(constant::SYNO_INFO_PATH);
        ensure_package_symlink(&synoinfo_path, target_synoinfo_path)?;

        // path: /usr/syno/synoman/webman/modules/authenticate.cgi
        let target_syno_authenticate_path = Path::new(constant::SYNO_AUTHENTICATE_PATH);
        let patent_ = target_syno_authenticate_path.parent().context(format!(
            "directory path: {} not exists",
            target_syno_authenticate_path.display()
        ))?;
        util::create_dir_all(patent_, 0o755)?;
        ensure_package_symlink(&syno_authenticate_path, target_syno_authenticate_path)?;

        // recursive base dir chown
        util::recursive_chown(&base_dir, uid, gid);

        println!("Install to: {}, UID:{uid}, GID:{gid}", target_dir.display(),);
        println!("Installation completed");

        Ok(())
    }
}

/// Uninstall xunlei
pub struct XunleiUninstall(pub Option<InstallConfig>);

impl Running for XunleiUninstall {
    fn run(self) -> Result<()> {
        // path: /var/packages/pan-xunlei-com
        let path = Path::new(constant::SYNOPKG_PKGBASE);
        if path.exists() {
            std::fs::remove_dir_all(path)?;
            println!("Uninstall thunder package");
        }

        fn remove_package_symlink(path: &Path) -> Result<(), std::io::Error> {
            if let Ok(metadata) = std::fs::symlink_metadata(path) {
                if metadata.file_type().is_symlink() {
                    let target = std::fs::read_link(path)?;
                    if target.is_absolute()
                        && target.starts_with(Path::new(constant::SYNOPKG_PKGBASE))
                    {
                        std::fs::remove_file(path)?;
                        println!("Uninstall thunder {}", path.display());
                    }
                }
            }
            Ok(())
        }

        // Remove symlink
        remove_package_symlink(Path::new(constant::SYNO_INFO_PATH))?;
        remove_package_symlink(Path::new(constant::SYNO_AUTHENTICATE_PATH))?;

        // Clear xunlei default config directory
        if let Some(install_config) = self.0 {
            let path = install_config.config_path.as_path();
            if path.exists() {
                std::fs::remove_dir_all(path)?
            }
            install_config.remove_file()?;
        }

        Ok(())
    }
}
