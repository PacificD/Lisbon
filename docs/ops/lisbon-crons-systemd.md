# Lisbon Crons systemd Setup

This setup runs the daily market overview task through Ubuntu systemd.

## Required Environment

Create an environment file readable by the service user, for example `/home/dev/Lisbon/.env.crons`:

```env
RESEND_API_KEY=your_resend_key
MAIL_FROM=Lisbon <news@example.com>
CODEX_BIN=/absolute/path/to/codex
CRONS_ARTIFACTS_DIR=apps/crons/artifacts
```

Recipients are configured in `apps/crons/config.json`, not in the environment file.

## Service

Create `/etc/systemd/system/lisbon-daily-us-market.service`:

```ini
[Unit]
Description=Lisbon daily US market overview email

[Service]
Type=oneshot
WorkingDirectory=/home/dev/Lisbon
EnvironmentFile=/home/dev/Lisbon/.env.crons
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/pnpm --filter @lisbon/crons task daily-us-market-overview
```

Adjust `ExecStart`, `PATH`, and `CODEX_BIN` to match the host.

## Timer

If the host timezone is Asia/Shanghai, create `/etc/systemd/system/lisbon-daily-us-market.timer`:

```ini
[Unit]
Description=Run Lisbon daily US market overview at 08:00 Asia/Shanghai

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true
Unit=lisbon-daily-us-market.service

[Install]
WantedBy=timers.target
```

If the host timezone is UTC, use:

```ini
OnCalendar=*-*-* 00:00:00 UTC
```

## Commands

Reload units:

```bash
sudo systemctl daemon-reload
```

Run once manually:

```bash
sudo systemctl start lisbon-daily-us-market.service
```

Enable timer:

```bash
sudo systemctl enable --now lisbon-daily-us-market.timer
```

Inspect status:

```bash
systemctl status lisbon-daily-us-market.service
systemctl list-timers lisbon-daily-us-market.timer
journalctl -u lisbon-daily-us-market.service -n 100 --no-pager
```
