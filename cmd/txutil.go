// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright 2019 DNA Dev team

package cmd

import (
	"regexp"
	"strings"
)

var hexLineRe = regexp.MustCompile(`[0-9a-fA-F]{32,}`)

// normalizeRawTx extracts a contiguous hex transaction string from CLI input.
// sigtx prints informational lines before the hex; redirecting stdout captures both.
func normalizeRawTx(input string) string {
	input = strings.TrimSpace(input)
	if isHexString(input) {
		return strings.ToLower(input)
	}
	best := ""
	for _, line := range strings.Split(input, "\n") {
		line = strings.TrimSpace(line)
		if isHexString(line) && len(line) > len(best) {
			best = strings.ToLower(line)
		}
	}
	if best != "" {
		return best
	}
	if m := hexLineRe.FindString(input); m != "" {
		return strings.ToLower(m)
	}
	return strings.ToLower(strings.TrimSpace(input))
}

func isHexString(s string) bool {
	if len(s) < 32 || len(s)%2 != 0 {
		return false
	}
	for _, c := range s {
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') && (c < 'A' || c > 'F') {
			return false
		}
	}
	return true
}
