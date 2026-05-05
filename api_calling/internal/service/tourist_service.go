package service

import (
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	model "github.com/pdtLong2929/Tourist_Assistant/internal/models"
)

type TouristService interface {
	GetLocationDetail(detail string) (*model.LocationResponse, error)
}

type touristService struct {
	mapClt     *client.MapClient
	weatherClt *client.WeatherClient
	aiClt      *client.AIClient
}

func NewTouristService(m *client.MapClient, w *client.WeatherClient, a *client.AIClient) touristService {
	return touristService{mapClt: m, weatherClt: w, aiClt: a}
}

func (s *touristService) GetLocationDetail(detail string) (*model.LocationResponse, error) {
	mapData, err := s.mapClt.GetLocation(detail)
	if err != nil {
		return nil, err
	}

	lat := mapData.Results[0].Geometry.Location.Lat
	lon := mapData.Results[0].Geometry.Location.Lng
	displayName := mapData.Results[0].FormattedAddress

	wData, err := s.weatherClt.GetWeatherByCoords(lat, lon)
	if err != nil {
		return nil, err
	}

	temp := wData["main"].(map[string]interface{})["temp"].(float64)
	desc := wData["weather"].([]interface{})[0].(map[string]interface{})["description"].(string)

	advice := s.aiClt.GetTravelAdvice(detail, temp, desc)

	return &model.LocationResponse{
		Destination:    detail,
		FullAddress:    displayName,
		Coords:         model.Coordinate{Lat: lat, Lon: lon},
		Weather:        model.WeatherInfo{Temp: temp, Description: desc},
		Recommendation: advice,
	}, nil
}
