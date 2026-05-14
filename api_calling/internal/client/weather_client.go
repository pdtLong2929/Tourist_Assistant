package client

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/pdtLong2929/Tourist_Assistant/pkg/errs"
)

type WeatherClient struct {
	ApiKey string
}

func NewWeatherClient(apiKey string) *WeatherClient {
	return &WeatherClient{ApiKey: apiKey}
}

func (c *WeatherClient) GetWeatherByCoords(lat, lon interface{}) (map[string]interface{}, error) {
	apiURL := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?lat=%v&lon=%v&appid=%s&units=metric", lat, lon, c.ApiKey)
	log.Printf("[WeatherClient DEBUG] Outgoing Weather API URL: https://api.openweathermap.org/data/2.5/weather?lat=%v&lon=%v&appid=REDACTED&units=metric", lat, lon)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, errs.ErrNetwork
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("WeatherClient Error: Received Status Code %d\n", resp.StatusCode)
		return nil, errs.ErrInvalidKey
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, errs.ErrInternalServer
	}

	return data, nil
}
