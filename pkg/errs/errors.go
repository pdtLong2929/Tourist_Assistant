package errs

import "errors"

var (
	ErrCityNotFound = errors.New("City not found")
	ErrInvalidKey   = errors.New("Invalid api key")
	ErrNotFound     = errors.New("Location not found")

	ErrNetwork        = errors.New("lỗi kết nối mạng, vui lòng thử lại sau")
	ErrInternalServer = errors.New("lỗi hệ thống nội bộ")
	ErrConfigLoad     = errors.New("không thể tải cấu hình hệ thống")
)
