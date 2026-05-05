package client

import (
	"encoding/json"
	"fmt"
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

	res, err := http.Get(apiURL)
	if err != nil {
		return nil, errs.ErrNetwork
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
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
