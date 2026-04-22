package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/pdtLong2929/Tourist_Assistant/pkg/errs"
)

type MapClient struct{}

func NewMapClient() *MapClient {
	return &MapClient{}
}

func (c *MapClient) GetLocationCoords(cityName string) (map[string]interface{}, error) {

	replacer := strings.NewReplacer(",", " ", "_", " ", "-", " ")
	clean := replacer.Replace(cityName)
	clean = strings.Join(strings.Fields(clean), " ")

	escapedCity := url.QueryEscape(clean)

	apiURL := fmt.Sprintf("https://nominatim.openstreetmap.org/search?q=%s&format=json&limit=1&accept-language=en", escapedCity)

	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, errs.ErrNetwork
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Map API Error: Status %d\n", resp.StatusCode)
		return nil, errs.ErrInternalServer
	}

	var results []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return nil, errs.ErrInternalServer
	}

	if len(results) == 0 {
		return nil, errs.ErrCityNotFound
	}

	return results[0], nil
}
