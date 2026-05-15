package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
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

type FrontendQueryPayload struct {
	Journey     string         `json:"journey"`
	Start       LocationDetail `json:"start"`
	Destination LocationDetail `json:"destination"`
}

type LocationDetail struct {
	Name    string `json:"name"`
	Address string `json:"address,omitempty"`
	Coords  struct {
		Lat float64 `json:"lat"`
		Lon float64 `json:"lon"`
	} `json:"coords,omitempty"`
}

func (s *touristService) GetLocationDetail(ctx context.Context, detail string) (*model.LocationResponse, error) {
	var lat, lon float64
	displayName := detail
	mapDataFound := false

	// Check if detail is a JSON structured query from the frontend
	var payload FrontendQueryPayload
	if err := json.Unmarshal([]byte(detail), &payload); err == nil && payload.Destination.Name != "" {
		// 1. If coordinates were already resolved by the frontend via Goong API, use them directly
		if payload.Destination.Coords.Lat != 0 && payload.Destination.Coords.Lon != 0 {
			lat = payload.Destination.Coords.Lat
			lon = payload.Destination.Coords.Lon
			displayName = payload.Destination.Address
			if displayName == "" {
				displayName = payload.Destination.Name
			}
			mapDataFound = true
		} else {
			// 2. If not pre-resolved, target just the Destination's textual name for backend Geocoding
			detail = payload.Destination.Name
			displayName = detail
		}
	}

	// --- 0. CHECK CACHED COMPLETED LOCATION RESPONSE FIRST ---
	responseCacheKey := "succeeded_loc:" + detail
	if cachedResponse, err := s.rdb.Get(ctx, responseCacheKey).Result(); err == nil {
		var finalResp model.LocationResponse
		if err := json.Unmarshal([]byte(cachedResponse), &finalResp); err == nil {
			log.Printf("Debug: Successfully retrieved fully compiled LocationResponse from Redis for '%s'", detail)
			return &finalResp, nil
		}
	}

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

			// [Resiliency Strategy] Cache valid map results independently. Even if downstream weather or AI API calls fail later, we preserve this success.
			if mapJson, err := json.Marshal(mapData); err == nil {
				// Atomically check existence before writing to prevent concurrent overrides
				if rdbErr := s.rdb.SetNX(ctx, mapKey, mapJson, 24*time.Hour).Err(); rdbErr != nil {
					log.Printf("Warning: Failed to write map cache to Redis for '%s': %v", detail, rdbErr)
				} else {
					log.Printf("Debug: Successfully cached map coordinates for '%s' in Redis", detail)
				}
			}
		}
	}

	// --- 2. GET WEATHER DATA (CHECK CACHE FIRST) ---
	var temp float64 = 0.0
	desc := "DATA UNAVAILABLE: Failed to retrieve from external Weather API."
	weatherDataFound := false

	// [Decoupling logic] We only perform weather lookup if we successfully secured location coordinates (either via direct input, map cache, or API).
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
				// [Soft-Failure Strategy] Log the failure, but DO NOT panic or error out the request. The system persists and returns the successful Goong data.
				log.Printf("Warning: Weather lookup failed for %s: %v. Continuing with fallback weather values.", displayName, err)
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

				// [Resiliency Strategy] Cache weather results independently. 
				if extracted {
					if wJson, err := json.Marshal(wData); err == nil {
						// Atomically check existence before writing to prevent concurrent overrides
						if rdbErr := s.rdb.SetNX(ctx, weatherKey, wJson, 15*time.Minute).Err(); rdbErr != nil {
							log.Printf("Warning: Failed to write weather cache to Redis for '%s': %v", displayName, rdbErr)
						} else {
							log.Printf("Debug: Successfully cached weather data for '%s' in Redis", displayName)
						}
					}
				}
			}
		}
	}

	// --- 3. GENERATE LLM ADVICE ---
	advice := s.aiClt.GetTravelAdvice(detail, temp, desc)

	// --- 4. COMPILE FINAL RESPONSE ---
	// [Production Debugging Safety] Mask sensitive tokens securely before allowing strings to surface to client APIs.
	goongDebugURL := fmt.Sprintf("https://rsapi.goong.io/geocode?address=%s&api_key=REDACTED", url.QueryEscape(detail))
	weatherDebugURL := "N/A (Location not secured)"
	if mapDataFound {
		weatherDebugURL = fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?lat=%v&lon=%v&appid=REDACTED&units=metric", lat, lon)
	}

	finalResponse := &model.LocationResponse{
		Destination:    detail,
		FullAddress:    displayName,
		Coords:         model.Coordinate{Lat: lat, Lon: lon},
		Weather:        model.WeatherInfo{Temp: temp, Description: desc},
		Recommendation: advice,
		Debug: &model.DebugInfo{
			GoongURL:   goongDebugURL,
			WeatherURL: weatherDebugURL,
		},
	}

	if mapDataFound {
		if respJson, err := json.Marshal(finalResponse); err == nil {
			// Atomically check existence before writing to prevent concurrent overrides
			// Cache the fully compiled LocationResponse (including LLM advice) for 15 minutes to match weather TTL
			if rdbErr := s.rdb.SetNX(ctx, responseCacheKey, respJson, 15*time.Minute).Err(); rdbErr != nil {
				log.Printf("Warning: Failed to cache successful LocationResponse to Redis for '%s': %v", detail, rdbErr)
			} else {
				log.Printf("Debug: Successfully cached completed LocationResponse for '%s' in Redis (key: %s)", detail, responseCacheKey)
			}
		}
	}

	return finalResponse, nil
}
