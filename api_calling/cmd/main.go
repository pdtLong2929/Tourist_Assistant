package main

import (
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	"github.com/pdtLong2929/Tourist_Assistant/internal/handler"
	"github.com/pdtLong2929/Tourist_Assistant/internal/service"
	"github.com/pdtLong2929/Tourist_Assistant/pkg/config"
)

func main() {
	cfg := config.LoadConfig()

	mClient := client.NewMapClient(cfg.Location_API_Key)
	wClient := client.NewWeatherClient(cfg.Weather_API_Key)
	aClient := client.NewAIClient("http://ai-model-service:5000") //Mocking AI

	tService := service.NewTouristService(mClient, wClient, aClient)

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

	fmt.Println("Using port:", port)
	fmt.Println("Using weather api key:", cfg.Weather_API_Key)
	fmt.Println("Using location api key:", cfg.Location_API_Key)
	r.Run(":" + port)
}
