package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	model "github.com/pdtLong2929/Tourist_Assistant/internal/models"
	"github.com/redis/go-redis/v9"
)

type TouristService interface {
	GetLocationDetail(ctx context.Context, detail string) (*model.LocationResponse, error)
}

type touristService struct {
	mapClt     *client.MapClient
	weatherClt *client.WeatherClient
	aiClt      *client.AIClient
	rdb        *redis.Client
}

func NewTouristService(m *client.MapClient, w *client.WeatherClient, a *client.AIClient, r *redis.Client) touristService {
	return touristService{mapClt: m, weatherClt: w, aiClt: a, rdb: r}
}

func (s *touristService) GetLocationDetail(ctx context.Context, detail string) (*model.LocationResponse, error) {
	var lat, lon float64
	displayName := detail
	mapDataFound := false

	// --- 1. GET MAP COORDINATES (CHECK CACHE FIRST) ---
	mapKey := "map:" + detail
	if cachedMap, err := s.rdb.Get(ctx, mapKey).Result(); err == nil {
		var cachedGoong client.GoongResponse
		if err := json.Unmarshal([]byte(cachedMap), &cachedGoong); err == nil && len(cachedGoong.Results) > 0 {
			lat = cachedGoong.Results[0].Geometry.Location.Lat
			lon = cachedGoong.Results[0].Geometry.Location.Lng
			displayName = cachedGoong.Results[0].FormattedAddress
			mapDataFound = true
		}
	}

	// Fetch from Map API if cache miss
	if !mapDataFound {
		mapData, err := s.mapClt.GetLocation(detail)
		if err != nil {
			log.Printf("Warning: Map lookup failed for '%s': %v. Proceeding with fallback.", detail, err)
		} else if mapData != nil && len(mapData.Results) > 0 {
			lat = mapData.Results[0].Geometry.Location.Lat
			lon = mapData.Results[0].Geometry.Location.Lng
			displayName = mapData.Results[0].FormattedAddress
			mapDataFound = true

			// Cache valid map result
			if mapJson, err := json.Marshal(mapData); err == nil {
				s.rdb.Set(ctx, mapKey, mapJson, 24*time.Hour) // Coordinates don't change often
			}
		}
	}

	// --- 2. GET WEATHER DATA (CHECK CACHE FIRST) ---
	var temp float64 = 0.0
	desc := "DATA UNAVAILABLE: Failed to retrieve from external Weather API."
	weatherDataFound := false

	// Only perform weather lookup if we secured location coords
	if mapDataFound {
		weatherKey := fmt.Sprintf("weather:%.3f:%.3f", lat, lon)
		if cachedWeather, err := s.rdb.Get(ctx, weatherKey).Result(); err == nil {
			var wData map[string]interface{}
			if err := json.Unmarshal([]byte(cachedWeather), &wData); err == nil {
				if t, ok := wData["main"].(map[string]interface{})["temp"].(float64); ok {
					if d, ok := wData["weather"].([]interface{})[0].(map[string]interface{})["description"].(string); ok {
						temp = t
						desc = d
						weatherDataFound = true
					}
				}
			}
		}

		// Fetch from Weather API if cache miss
		if !weatherDataFound {
			wData, err := s.weatherClt.GetWeatherByCoords(lat, lon)
			if err != nil {
				log.Printf("Warning: Weather lookup failed for %s: %v.", displayName, err)
			} else if wData != nil {
				// Safely pull output
				extracted := false
				if main, ok := wData["main"].(map[string]interface{}); ok {
					if t, ok := main["temp"].(float64); ok {
						temp = t
						extracted = true
					}
				}
				if weather, ok := wData["weather"].([]interface{}); ok && len(weather) > 0 {
					if wInfo, ok := weather[0].(map[string]interface{}); ok {
						if d, ok := wInfo["description"].(string); ok {
							desc = d
						}
					}
				}

				// Only cache if extraction fully succeeded
				if extracted {
					if wJson, err := json.Marshal(wData); err == nil {
						s.rdb.Set(ctx, weatherKey, wJson, 15*time.Minute) // Cache shorter expiration for climate
					}
				}
			}
		}
	}

	// --- 3. GENERATE LLM ADVICE ---
	advice := s.aiClt.GetTravelAdvice(detail, temp, desc)

	// --- 4. COMPILE FINAL RESPONSE ---
	return &model.LocationResponse{
		Destination:    detail,
		FullAddress:    displayName,
		Coords:         model.Coordinate{Lat: lat, Lon: lon},
		Weather:        model.WeatherInfo{Temp: temp, Description: desc},
		Recommendation: advice,
	}, nil
}
