package main

import (
	"github.com/gin-gonic/gin"
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	"github.com/pdtLong2929/Tourist_Assistant/internal/handler"
	"github.com/pdtLong2929/Tourist_Assistant/internal/service"
	"github.com/pdtLong2929/Tourist_Assistant/pkg/config"
)

func main() {
	cfg := config.LoadConfig()

	mClient := client.NewMapClient()
	wClient := client.NewWeatherClient(cfg.Weather_API_Key)
	aClient := client.NewAIClient("http://ai-model-service:5000") //Mocking AI

	tService := service.NewTouristService(mClient, wClient, aClient)

	lHandler := handler.NewLocationHandler(tService)

	r := gin.Default()

	v1 := r.Group("/api/v1")
	{
		v1.GET("/location/:name", lHandler.HandleGetLocation)
	}

	r.Run(":" + cfg.Server_Port)
}
