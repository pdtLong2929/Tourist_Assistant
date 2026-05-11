package main

import (
	"context"
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	"github.com/pdtLong2929/Tourist_Assistant/internal/handler"
	"github.com/pdtLong2929/Tourist_Assistant/internal/service"
	"github.com/pdtLong2929/Tourist_Assistant/pkg/config"
	"github.com/redis/go-redis/v9" // Import thư viện Redis
)

func main() {
	cfg := config.LoadConfig()

	// 1. Khởi tạo Redis Client
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379" // Default cho local
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Kiểm tra kết nối Redis (tùy chọn nhưng nên làm)
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		fmt.Println("Can not connect to redis!", err)
	}

	// 2. Khởi tạo các Clients
	mClient := client.NewMapClient(cfg.Location_API_Key)
	wClient := client.NewWeatherClient(cfg.Weather_API_Key)
	aClient := client.NewAIClient("http://ai-model-service:5000")

	// 3. Truyền rdb vào NewTouristService (như đã sửa ở bước trước)
	tService := service.NewTouristService(mClient, wClient, aClient, rdb)

	lHandler := handler.NewLocationHandler(&tService)

	r := gin.Default()

	v1 := r.Group("/api/v1")
	{
		v1.GET("/location/:name", lHandler.HandleGetLocation)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Running on port: ", port)
	fmt.Println("Redis connecting at :", redisAddr)
	
	r.Run(":" + port)
}