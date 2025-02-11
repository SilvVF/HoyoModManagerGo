package util

// Taken from https://github.com/ThePrimeagen/vim-arcade/blob/master/pkg/cmd/cmd.go
// modified with Dir option to set working directory

import (
	"context"
	"hmm/pkg/log"
	"io"
	golog "log/slog"
	"os"
	"os/exec"
	"syscall"
)

type writerFn = func(b []byte) (int, error)

type fnAsWriter struct {
	fn writerFn
}

func (f *fnAsWriter) Write(b []byte) (int, error) {
	return f.fn(b)
}

type Cmder struct {
	Err    io.Writer
	Out    io.Writer
	In     io.Reader
	Name   string
	Args   []string
	Dir    string
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
	stderr io.ReadCloser
	ctx    context.Context
	done   chan struct{}
}

func NewCmder(name string, ctx context.Context) *Cmder {
	return &Cmder{
		Err:  nil,
		Out:  nil,
		Name: name,
		Args: []string{},
		ctx:  ctx,
		done: make(chan struct{}, 1),
	}
}

func (c *Cmder) SetDir(value string) *Cmder {
	c.Dir = value
	return c
}

func (c *Cmder) AddVArg(value string) *Cmder {
	c.Args = append(c.Args, value)
	return c
}

func (c *Cmder) AddVArgv(value []string) *Cmder {
	c.Args = append(c.Args, value...)
	return c
}

func (c *Cmder) AddKVArg(name string, value string) *Cmder {
	c.Args = append(c.Args, name, value)
	return c
}

func (c *Cmder) WithErrFn(fn writerFn) *Cmder {
	c.Err = &fnAsWriter{fn: fn}
	return c
}

func (c *Cmder) WithErr(writer io.Writer) *Cmder {
	c.Err = writer
	return c
}

func (c *Cmder) WithOutFn(fn writerFn) *Cmder {
	c.Out = &fnAsWriter{fn: fn}
	return c
}

func (c *Cmder) WithOut(writer io.Writer) *Cmder {
	c.Out = writer
	return c
}

func (c *Cmder) Close() {
	err := c.cmd.Process.Kill()
	if err != nil {
		golog.Error("cannot close cmder", "err", err)
	}

	if c.stdout != nil {
		if err := c.stdout.Close(); err != nil {
			golog.Error("cannot close cmder stdout", "err", err)
		}
	}

	if c.stderr != nil {
		if err := c.stderr.Close(); err != nil {
			golog.Error("cannot close cmder stderr", "err", err)
		}
	}
}

func (c *Cmder) Done() {
	<-c.done
}

func (c *Cmder) WriteLine(b []byte) error {
	read := 0
	for read < len(b) {
		n, err := c.stdin.Write(b[read:])
		if err != nil {
			return err
		}
		read += n
	}
	if b[len(b)-1] != '\n' {
		_, _ = c.stdin.Write([]byte{'\n'})
	}

	return nil
}

func (c *Cmder) Run(env []string) error {
	if c.Out == nil {
		log.LogError("you should never spawn a cmd without at least listening to stdout")
	}
	if c.Name == "" {
		log.LogError("you need to provide a name for the program to run")
	}

	c.cmd = exec.Command(c.Name, c.Args...)

	// hide cmd window from flashing https://wails.io/docs/next/guides/windows
	c.cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000,
	}

	if len(env) > 0 {
		c.cmd.Env = append(os.Environ(), env...)
	}
	c.cmd.Dir = c.Dir

	stdin, err := c.cmd.StdinPipe()
	if err != nil {
		return err
	}
	c.stdin = stdin

	stdout, err := c.cmd.StdoutPipe()
	if err != nil {
		return err
	}
	c.stdout = stdout

	stderr, err := c.cmd.StderrPipe()
	if err != nil {
		return err
	}
	c.stderr = stderr

	err = c.cmd.Start()
	if err != nil {
		return err
	}

	go func() {
		<-c.ctx.Done()
		c.Close()
	}()

	go io.Copy(c.Out, stdout)
	if c.Err != nil {
		go io.Copy(c.Err, stderr)
	}

	err = c.cmd.Wait()
	c.done <- struct{}{}
	return err
}
