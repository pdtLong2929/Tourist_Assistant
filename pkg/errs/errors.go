package errs

import "errors"

var (
	ErrCityNotFound = errors.New("City not found")
	ErrInvalidKey   = errors.New("Invalid api key")

	ErrNetwork        = errors.New("lỗi kết nối mạng, vui lòng thử lại sau")
	ErrInternalServer = errors.New("lỗi hệ thống nội bộ")
	ErrConfigLoad     = errors.New("không thể tải cấu hình hệ thống")
)
