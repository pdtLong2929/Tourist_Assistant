package service

import (
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	model "github.com/pdtLong2929/Tourist_Assistant/internal/models"
)

type TouristService interface {
	GetLocationDetail(name string) (*model.LocationResponse, error)
}

type touristService struct {
	mapClt     *client.MapClient
	weatherClt *client.WeatherClient
	aiClt      *client.AIClient
}

func NewTouristService(m *client.MapClient, w *client.WeatherClient, a *client.AIClient) TouristService {
	return &touristService{mapClt: m, weatherClt: w, aiClt: a}
}

func (s *touristService) GetLocationDetail(name string) (*model.LocationResponse, error) {
	mapData, err := s.mapClt.GetLocationCoords(name)
	if err != nil {
		return nil, err
	}

	lat, lon := mapData["lat"].(string), mapData["lon"].(string)

	wData, err := s.weatherClt.GetWeatherByCoords(lat, lon)
	if err != nil {
		return nil, err
	}

	temp := wData["main"].(map[string]interface{})["temp"].(float64)
	desc := wData["weather"].([]interface{})[0].(map[string]interface{})["description"].(string)

	advice := s.aiClt.GetTravelAdvice(name, temp, desc)

	return &model.LocationResponse{
		Destination:    name,
		FullAddress:    mapData["display_name"].(string),
		Coords:         model.Coordinate{Lat: lat, Lon: lon},
		Weather:        model.WeatherInfo{Temp: temp, Description: desc},
		Recommendation: advice,
	}, nil
}
