package client

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"github.com/pdtLong2929/Tourist_Assistant/pkg/errs"
)

type GoongResponse struct {
	Status  string `json:"status"`
	Results []struct {
		FormattedAddress string `json:"formatted_address"`
		Geometry         struct {
			Location struct {
				Lat float64 `json:"lat"`
				Lng float64 `json:"lng"`
			} `json:"location"`
		} `json:"geometry"`
	} `json:"results"`
}

type MapClient struct {
	ApiKey string
}

func NewMapClient(apiKey string) *MapClient {
	return &MapClient{ApiKey: apiKey}
}

func (c *MapClient) GetLocation(address string) (*GoongResponse, error) {
	encodedAddress := url.QueryEscape(address)
	apiURL := fmt.Sprintf("https://rsapi.goong.io/geocode?address=%s&api_key=%s", encodedAddress, c.ApiKey)
	log.Printf("[MapClient DEBUG] Outgoing Goong API URL: https://rsapi.goong.io/geocode?address=%s&api_key=REDACTED", encodedAddress)

	res, err := http.Get(apiURL)
	if err != nil {
		return nil, errs.ErrNetwork
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		fmt.Printf("MapClient Error: Received Status Code %d\n", res.StatusCode)
		return nil, errs.ErrInvalidKey
	}

	var data GoongResponse
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return nil, errs.ErrInternalServer
	}

	if data.Status != "OK" || len(data.Results) == 0 {
		return nil, errs.ErrNotFound
	}

	return &data, nil
}

type GoongDirectionsResponse struct {
	Routes []struct {
		Legs []struct {
			Distance struct {
				Value float64 `json:"value"`
				Text  string  `json:"text"`
			} `json:"distance"`
			Duration struct {
				Value float64 `json:"value"`
				Text  string  `json:"text"`
			} `json:"duration"`
		} `json:"legs"`
	} `json:"routes"`
}

func (c *MapClient) GetDirection(originLat, originLng, destLat, destLng float64) (float64, error) {
	apiURL := fmt.Sprintf("https://rsapi.goong.io/Direction?origin=%f,%f&destination=%f,%f&vehicle=car&api_key=%s", originLat, originLng, destLat, destLng, c.ApiKey)
	log.Printf("[MapClient DEBUG] Outgoing Goong Direction API URL: https://rsapi.goong.io/Direction?origin=%f,%f&destination=%f,%f&vehicle=car&api_key=REDACTED", originLat, originLng, destLat, destLng)

	res, err := http.Get(apiURL)
	if err != nil {
		return 0, errs.ErrNetwork
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		fmt.Printf("MapClient Directions Error: Received Status Code %d\n", res.StatusCode)
		return 0, errs.ErrInvalidKey
	}

	var data GoongDirectionsResponse
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return 0, errs.ErrInternalServer
	}

	if len(data.Routes) == 0 || len(data.Routes[0].Legs) == 0 {
		return 0, errs.ErrNotFound
	}

	// Distance value is returned in meters. Convert to kilometers.
	distKm := data.Routes[0].Legs[0].Distance.Value / 1000.0
	return distKm, nil
}

