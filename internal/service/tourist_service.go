package service

import (
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	model "github.com/pdtLong2929/Tourist_Assistant/internal/models"
	"context"
	"encoding/json"
	"time"
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
    // 1. Tạo cache key (slugify hoặc md5 chuỗi detail để làm key sạch hơn)
    cacheKey := "location:" + detail

    // 2. Thử lấy từ Redis
    cachedData, err := s.rdb.Get(ctx, cacheKey).Result()
    if err == nil {
        var resp model.LocationResponse
        if err := json.Unmarshal([]byte(cachedData), &resp); err == nil {
            return &resp, nil // Trả về luôn nếu có cache (Cache Hit)
        }
    }

    // 3. Cache Miss: Thực hiện gọi các API như cũ
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

    finalResp := &model.LocationResponse{
        Destination:    detail,
        FullAddress:    displayName,
        Coords:         model.Coordinate{Lat: lat, Lon: lon},
        Weather:        model.WeatherInfo{Temp: temp, Description: desc},
        Recommendation: advice,
    }

    // 4. Lưu vào Redis trước khi trả về (Ví dụ: TTL là 15 phút)
    jsonData, _ := json.Marshal(finalResp)
    s.rdb.Set(ctx, cacheKey, jsonData, 15*time.Minute)

    return finalResp, nil
}
