// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team

package cmd

import (
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/DNAProject/DNA/bootstrapserver"
	"github.com/urfave/cli"
)

var BootstrapCommand = cli.Command{
	Name:  "bootstrap",
	Usage: "HTTP peer-discovery bootstrap server",
	Description: `Run a standalone HTTP bootstrap server for P2P peer registration
and discovery. DNA nodes register on startup and periodically heartbeat;
other nodes fetch GET /peers to discover additional seeds alongside SeedList
and DHT discovery.`,
	Subcommands: []cli.Command{
		BootstrapServerCommand,
	},
}

var BootstrapServerCommand = cli.Command{
	Name:      "server",
	Usage:     "Start the HTTP bootstrap server",
	ArgsUsage: " ",
	Action:    runBootstrapServer,
	Flags: []cli.Flag{
		cli.StringFlag{
			Name:  "listen,l",
			Value: "0.0.0.0:8090",
			Usage: "Listen `<host:port>` for HTTP bootstrap API",
		},
		cli.StringFlag{
			Name:  "seeds",
			Usage: "Comma-separated static seed `<addrs>` (e.g. 127.0.0.1:20338,127.0.0.1:20438)",
		},
		cli.DurationFlag{
			Name:  "ttl",
			Value: 5 * time.Minute,
			Usage: "Remove inactive registered peers after this `<duration>`",
		},
	},
}

func runBootstrapServer(ctx *cli.Context) error {
	seeds := make([]string, 0)
	if raw := strings.TrimSpace(ctx.String("seeds")); raw != "" {
		for _, s := range strings.Split(raw, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				seeds = append(seeds, s)
			}
		}
	}

	srv := bootstrapserver.New(bootstrapserver.Config{
		Listen: ctx.String("listen"),
		TTL:    ctx.Duration("ttl"),
		Seeds:  seeds,
	})

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		fmt.Println("\n[bootstrap] shutting down...")
		_ = srv.Shutdown()
		os.Exit(0)
	}()

	if err := srv.ListenAndServe(); err != nil {
		return fmt.Errorf("bootstrap server error: %w", err)
	}
	return nil
}
