package service

import (
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	model "github.com/pdtLong2929/Tourist_Assistant/internal/models"
	"context"
	"encoding/json"
	"time"
	"log"
	"github.com/redis/go-redis/v9"
)

type TouristService interface {
	GetLocationDetail(ctx context.Context, detail string) (*model.LocationResponse, error)
}

type touristService struct {
	mapClt     *client.MapClient
	weatherClt *client.WeatherClient
	aiClt      *client.AIClient
	rdb 	   *redis.Client
}

func NewTouristService(m *client.MapClient, w *client.WeatherClient, a *client.AIClient, r *redis.Client) touristService {
	return touristService{mapClt: m, weatherClt: w, aiClt: a, rdb: r}
}

func (s *touristService) GetLocationDetail(ctx context.Context, detail string) (*model.LocationResponse, error) {
    cacheKey := "location:" + detail

    cachedData, err := s.rdb.Get(ctx, cacheKey).Result()
    if err == nil {
        var resp model.LocationResponse
        if err := json.Unmarshal([]byte(cachedData), &resp); err == nil {
            return &resp, nil
        }
    }

    var lat, lon float64
    displayName := detail
    
    allSuccessful := true

    mapData, err := s.mapClt.GetLocation(detail)
    if err != nil {
        allSuccessful = false
        log.Printf("Warning: Map lookup failed for '%s': %v. Proceeding without caching.", detail, err)
    } else if len(mapData.Results) > 0 {
        lat = mapData.Results[0].Geometry.Location.Lat
        lon = mapData.Results[0].Geometry.Location.Lng
        displayName = mapData.Results[0].FormattedAddress
    } else {
        allSuccessful = false // No results found in map client is also a failure
    }

    var temp float64 = 0.0  
    desc := "DATA UNAVAILABLE: Failed to retrieve from external Weather API."

    wData, err := s.weatherClt.GetWeatherByCoords(lat, lon)
    if err != nil {
        allSuccessful = false
        log.Printf("Warning: Weather lookup failed for location '%s': %v. Proceeding without caching.", displayName, err)
    } else if wData != nil {
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
        if !extracted {
            allSuccessful = false // Failed to extract critical weather info
        }
    } else {
        allSuccessful = false // Null data
    }

    advice := s.aiClt.GetTravelAdvice(detail, temp, desc)

    finalResp := &model.LocationResponse{
        Destination:    detail,
        FullAddress:    displayName,
        Coords:         model.Coordinate{Lat: lat, Lon: lon},
        Weather:        model.WeatherInfo{Temp: temp, Description: desc},
        Recommendation: advice,
    }

    // ONLY write cache into Redis if we successfully retrieved all external enrichment data
    if allSuccessful {
        jsonData, _ := json.Marshal(finalResp)
        s.rdb.Set(ctx, cacheKey, jsonData, 15*time.Minute)
    }

    return finalResp, nil
}