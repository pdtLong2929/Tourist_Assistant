package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/pdtLong2929/Tourist_Assistant/internal/client"
	"github.com/pdtLong2929/Tourist_Assistant/internal/service"
	"github.com/redis/go-redis/v9"
)

func main() {
	baseDir := `d:\Computational thinking\Tourist_Assistant\api_calling`
	envPath := filepath.Join(baseDir, ".env")
	err := godotenv.Load(envPath)
	if err != nil {
		log.Printf("Could not load .env from %s: %v", envPath, err)
	}

	locKey := os.Getenv("LOCATION_API_KEY")
	weaKey := os.Getenv("WEATHER_API_KEY")

	fmt.Printf("Keys loaded -> Location: %s, Weather: %s\n", locKey, weaKey)

	mClient := client.NewMapClient(locKey)
	wClient := client.NewWeatherClient(weaKey)
	aClient := client.NewAIClient("http://mock")

	// Mock redis just to get through init, but we will check the API results
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	
	svc := service.NewTouristService(mClient, wClient, aClient, rdb)

	fmt.Println("Testing GetLocationDetail for 'Hanoi'...")
	resp, err := svc.GetLocationDetail(context.Background(), "Hanoi")
	
	if err != nil {
		fmt.Printf("Error occurred: %v\n", err)
	} else {
		fmt.Printf("Success! Resp: %+v\n", resp)
	}
}
