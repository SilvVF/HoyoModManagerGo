//go:build !windows
// +build !windows

package util

import "os/exec"

func setSysProcAttr(_ *exec.Cmd) {
	return
}
