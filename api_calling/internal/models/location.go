package model

type WeatherInfo struct {
	Temp        float64 `json:"temp"`
	Description string  `json:"description"`
}

type LocationResponse struct {
	Destination    string      `json:"destination"`
	FullAddress    string      `json:"full_address"`
	Coords         Coordinate  `json:"coordinates"`
	Weather        WeatherInfo `json:"weather"`
	Recommendation string      `json:"recommendation"`
	Debug          *DebugInfo  `json:"debug,omitempty"`
}

type DebugInfo struct {
	GoongURL   string `json:"goong_url,omitempty"`
	WeatherURL string `json:"weather_url,omitempty"`
}

type Coordinate struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

type Transportation struct {
	Vehicle []string `json:"vehicle"`
}