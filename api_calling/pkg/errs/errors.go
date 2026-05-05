package errs

import "errors"

var (
	ErrCityNotFound = errors.New("City not found")
	ErrInvalidKey   = errors.New("Invalid api key")
	ErrNotFound     = errors.New("Location not found")

	ErrNetwork        = errors.New("Network connection error, please try again later")
	ErrInternalServer = errors.New("Internal system error")
	ErrConfigLoad     = errors.New("Failed to load system configuration")
)
