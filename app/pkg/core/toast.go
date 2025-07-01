package core

type ToastLevel = int

const (
	TOAST_EVENT = "toast_event"

	TOAST_INFO     ToastLevel = 1
	TOAST_WARN     ToastLevel = 2
	TOAST_COMPLETE ToastLevel = 3
	TOAST_ERROR    ToastLevel = 4
)

type Notifier interface {
	Error(err error)
	Warn(err error)
	Info(msg string)
	Complete(msg string)
}

type ToastEmitter struct {
	emitter EventEmmiter
	Notifier
}

type ToastEvent struct {
	Level ToastLevel `json:"level"`
	Desc  string     `json:"desc"`
	Msg   string     `json:"msg"`
}

var _ Notifier = (*ToastEmitter)(nil)

func NewToastEmitter(emitter EventEmmiter) *ToastEmitter {
	return &ToastEmitter{
		emitter: emitter,
	}
}

func (t *ToastEmitter) Error(err error) {
	t.emitter.Emit(TOAST_EVENT, ToastEvent{
		Level: TOAST_ERROR,
		Msg:   err.Error(),
	})
}

func (t *ToastEmitter) Warning(err error) {
	t.emitter.Emit(TOAST_EVENT, ToastEvent{
		Level: TOAST_WARN,
		Msg:   err.Error(),
	})
}

func (t *ToastEmitter) Info(msg string) {
	t.emitter.Emit(TOAST_EVENT, ToastEvent{
		Level: TOAST_INFO,
		Msg:   msg,
	})
}

func (t *ToastEmitter) Complete(msg string) {
	t.emitter.Emit(TOAST_EVENT, ToastEvent{
		Level: TOAST_COMPLETE,
		Msg:   msg,
	})
}
